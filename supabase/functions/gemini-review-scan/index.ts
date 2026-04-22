import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG — tune these without touching pipeline logic
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  /** Only call Claude on the first scan of the day; reuse cached response for later scans */
  enable_first_scan_only_gemini: true,

  /** Send only the front image to Claude (left/right are excluded) */
  enable_gemini_front_only: false,

  /** If true, send only detection crops instead of the full front image (not yet implemented — placeholder) */
  enable_gemini_crop_only: false,

  /** Max dimension (px) the client should have resized the front image to before sending */
  image_resize_for_gemini: 800,

  /** Thresholds that determine whether a later-day scan is different enough to re-call Claude */
  meaningful_change_threshold: {
    /** Fractional change in total spot count that triggers a re-run (0.30 = 30%) */
    count_change_pct: 0.30,
    /** Average Ultralytics confidence below this forces a re-run (model was uncertain) */
    min_avg_confidence: 0.30,
    /** A new acne class type appearing always triggers a re-run */
    new_type_triggers_rerun: true,
    /** A new facial zone becoming active always triggers a re-run */
    new_zone_triggers_rerun: true,
    /** Spot count must cross this absolute delta before the % check kicks in (avoids 0→1 = 100%) */
    min_absolute_delta: 3,
  },
};

// ═══════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Maximum retries for transient 429/529 errors */
const MAX_RETRIES = 2;
/** Base delay in ms for exponential backoff on retryable errors */
const RETRY_BASE_DELAY_MS = 2000;

// ── Types ──

interface Detection {
  bbox: [number, number, number, number];
  classIndex: number;
  className: string;
  confidence: number;
}

interface AllDetections {
  front: Detection[];
  left: Detection[];
  right: Detection[];
}

interface PreviousSession {
  id: string;
  total_spots: number | null;
  model_detections: { front: Detection[]; left: Detection[]; right: Detection[] } | null;
  zone_breakdown: any[] | null;
  skin_insights: any | null;
  recommendations: any[] | null;
  skin_plan: any | null;
  reviewed_detections: { front: Detection[]; left: Detection[]; right: Detection[] } | null;
  severity: string | null;
  severity_score: number | null;
  primary_acne_type: string | null;
  description: string | null;
  matched_products: any[] | null;
  skin_assessment?: any[] | null;
  zone_scores?: any[] | null;
}

// ── Helpers ──

function detectMediaType(b64: string): string {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

/** Map a normalised y-coordinate (0..1) to a rough facial zone name */
function yToZone(normY: number): string {
  if (normY < 0.20) return 'forehead';
  if (normY < 0.45) return 'nose_eyes';
  if (normY < 0.70) return 'cheeks_nose';
  return 'chin_jawline';
}

// ── Detection colours (mirrors AcneMapHero CLASS_COLORS) ──────────────────────
const CLASS_COLORS_HEX: Record<string, [number, number, number]> = {
  papules:    [248, 113, 113],  // #F87171
  pustules:   [252, 211,  77],  // #FCD34D
  blackheads: [156, 163, 175],  // #9CA3AF
  whiteheads: [196, 181, 253],  // #C4B5FD
  nodules:    [244, 114, 182],  // #F472B6
  'dark spot':[217, 119,   6],  // #D97706
};

/**
 * Draw the AcneMapHero-style detection visualization onto the (already resized)
 * front image and return it as raw base64 JPEG.
 *
 * Draws a coloured circle outline + subtle fill for every front detection.
 * Uses dynamic import so a jimp load failure never crashes the edge function.
 */
async function buildAnnotatedImage(
  resizedBase64: string,
  detections: Detection[],
  origWidth: number,
  origHeight: number,
): Promise<string | null> {
  if (detections.length === 0) return null;
  try {
    const { default: Jimp } = await import('npm:jimp@0.22.12');

    // Decode the already-resized JPEG
    const bytes = Uint8Array.from(atob(resizedBase64), (c) => c.charCodeAt(0));
    const img = await Jimp.read(bytes.buffer as ArrayBuffer);
    const resW = img.bitmap.width;
    const resH = img.bitmap.height;

    // Scale from ORIGINAL pixel space → resized image space
    const sx = resW / origWidth;
    const sy = resH / origHeight;

    for (const det of detections) {
      const [x1, y1, x2, y2] = det.bbox;
      const cx = ((x1 + x2) / 2) * sx;
      const cy = ((y1 + y2) / 2) * sy;
      const rx = ((x2 - x1) / 2) * sx;
      const ry = ((y2 - y1) / 2) * sy;
      const r  = Math.max(rx, ry, 8);

      const [cr, cg, cb] = CLASS_COLORS_HEX[det.className] ?? [255, 255, 255];
      const outlineInt = Jimp.rgbaToInt(cr, cg, cb, 255);

      // Filled circle with 25 % opacity tint + 100 % outline ring
      const outerR = r + 2;
      for (let dy = -outerR; dy <= outerR; dy++) {
        for (let dx = -outerR; dx <= outerR; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const px = Math.round(cx + dx);
          const py = Math.round(cy + dy);
          if (px < 0 || px >= resW || py < 0 || py >= resH) continue;

          if (dist <= r) {
            const existing = Jimp.intToRGBA(img.getPixelColor(px, py));
            img.setPixelColor(Jimp.rgbaToInt(
              Math.round(existing.r * 0.75 + cr * 0.25),
              Math.round(existing.g * 0.75 + cg * 0.25),
              Math.round(existing.b * 0.75 + cb * 0.25),
              255,
            ), px, py);
          } else if (dist <= outerR) {
            img.setPixelColor(outlineInt, px, py);
          }
        }
      }
    }

    const dataUri = await img.getBase64Async(Jimp.MIME_JPEG);
    return dataUri.replace(/^data:image\/jpeg;base64,/, '');
  } catch (err) {
    console.warn('[gemini-review-scan] annotation skipped (jimp unavailable):', String(err).substring(0, 200));
    return null;
  }
}

/** Classify a single detection into one of 5 facial zones (for Gemini context labels only — approximate) */
function classifyDetectionZone(normX: number, normY: number): string {
  if (normY < 0.28) return 'FOREHEAD';
  if (normY > 0.72) return 'CHIN/JAWLINE';
  if (normX > 0.35 && normX < 0.65) return 'NOSE';
  if (normX <= 0.5) return 'LEFT CHEEK';
  return 'RIGHT CHEEK';
}

const ZONE_NAMES = ['forehead', 'left_cheek', 'right_cheek', 'nose', 'chin_jawline'] as const;

/** Return the set of unique class names across all angles */
function uniqueClasses(det: AllDetections): Set<string> {
  const s = new Set<string>();
  [...det.front, ...det.left, ...det.right].forEach((d) => s.add(d.className));
  return s;
}

/** Estimate which zones are active based on bbox positions */
function activeZones(detections: Detection[], imgHeight: number): Set<string> {
  const zones = new Set<string>();
  detections.forEach((d) => {
    const midY = (d.bbox[1] + d.bbox[3]) / 2;
    zones.add(yToZone(midY / imgHeight));
  });
  return zones;
}

/** Average confidence across all detections */
function avgConfidence(det: AllDetections): number {
  const all = [...det.front, ...det.left, ...det.right];
  if (all.length === 0) return 1.0;
  return all.reduce((s, d) => s + d.confidence, 0) / all.length;
}

// ── Meaningful-change detector ──

interface ChangeResult {
  changed: boolean;
  reasons: string[];
}

function detectMeaningfulChange(
  current: AllDetections,
  prev: PreviousSession,
  imageDimensions: { front: { width: number; height: number } }
): ChangeResult {
  const reasons: string[] = [];
  const t = CONFIG.meaningful_change_threshold;

  // 1. Count change
  const currentTotal = current.front.length + current.left.length + current.right.length;
  const prevTotal = prev.total_spots ?? 0;
  const delta = Math.abs(currentTotal - prevTotal);
  if (
    delta >= t.min_absolute_delta &&
    prevTotal > 0 &&
    delta / prevTotal >= t.count_change_pct
  ) {
    reasons.push(`spot count changed ${prevTotal} → ${currentTotal} (${Math.round((delta / prevTotal) * 100)}%)`);
  }

  // 2. New acne type
  if (t.new_type_triggers_rerun) {
    const prevDet = prev.model_detections;
    if (prevDet) {
      const prevClasses = uniqueClasses(prevDet as AllDetections);
      const currentClasses = uniqueClasses(current);
      const newTypes: string[] = [];
      currentClasses.forEach((c) => { if (!prevClasses.has(c)) newTypes.push(c); });
      if (newTypes.length > 0) {
        reasons.push(`new acne type(s) detected: ${newTypes.join(', ')}`);
      }
    }
  }

  // 3. New zone
  if (t.new_zone_triggers_rerun) {
    const h = imageDimensions.front.height;
    const prevZones = prev.zone_breakdown?.map((z: any) => z.zone) ?? [];
    if (h > 0 && current.front.length > 0) {
      const currentFrontZones = activeZones(current.front, h);
      const newZones: string[] = [];
      currentFrontZones.forEach((z) => {
        if (!prevZones.some((pz: string) => pz.includes(z.split('_')[0]))) {
          newZones.push(z);
        }
      });
      if (newZones.length > 0) {
        reasons.push(`new zone(s) affected: ${newZones.join(', ')}`);
      }
    }
  }

  // 4. Low confidence
  const avg = avgConfidence(current);
  if (avg < t.min_avg_confidence) {
    reasons.push(`low avg model confidence ${avg.toFixed(2)} < ${t.min_avg_confidence}`);
  }

  return { changed: reasons.length > 0, reasons };
}

/**
 * Fix bbox coordinate spaces in Gemini's reviewed_detections:
 *
 * - Model detections (source="model"): Gemini copies bbox values from the text context
 *   which are already in original YOLO pixel space. But in case Gemini drifts, we restore
 *   them from the original YOLO detections using a greedy class-queue match.
 *
 * - AI-added detections (source="ai"): Gemini estimated these from the resized image
 *   (~800px max), so their bbox coords are in resized space. Scale them up to original space.
 */
function fixBboxCoordinates(
  reviewedDetections: { front: any[]; left: any[]; right: any[] },
  original: AllDetections,
  imageDimensions: { front?: { width: number; height: number }; left?: { width: number; height: number }; right?: { width: number; height: number } } | null
): void {
  const angles = ['front', 'left', 'right'] as const;

  for (const angle of angles) {
    const reviewed: any[] = reviewedDetections[angle] ?? [];
    const originalDets: Detection[] = original[angle] ?? [];
    const dims = imageDimensions?.[angle];

    // Compute uniform scale factor: resized → original (aspect ratio preserved, so scaleX == scaleY)
    let bboxScale = 1;
    if (dims) {
      const longest = Math.max(dims.width, dims.height);
      if (longest > CONFIG.image_resize_for_gemini) {
        bboxScale = longest / CONFIG.image_resize_for_gemini;
      }
    }

    // Build per-class FIFO queues of original YOLO detections
    const origQueues: Record<string, Detection[]> = {};
    for (const det of originalDets) {
      if (!origQueues[det.className]) origQueues[det.className] = [];
      origQueues[det.className].push(det);
    }
    const origPtrs: Record<string, number> = {};

    for (const det of reviewed) {
      if (det.source === 'model') {
        // Restore original YOLO bbox to guarantee correct coordinate space
        const cls = det.className as string;
        const queue = origQueues[cls] ?? [];
        const ptr = origPtrs[cls] ?? 0;
        if (ptr < queue.length) {
          det.bbox = queue[ptr].bbox;
          det.confidence = queue[ptr].confidence;
          origPtrs[cls] = ptr + 1;
        }
      } else if (det.source === 'ai' && Array.isArray(det.bbox) && bboxScale > 1) {
        // Scale up from resized Gemini image space to original YOLO pixel space
        det.bbox = (det.bbox as number[]).map((v) => Math.round(v * bboxScale));
      }
    }
  }
}

/** Build reviewed_detections for a cached response (all model detections confirmed) */
function buildCachedReviewedDetections(current: AllDetections) {
  function confirmAll(dets: Detection[]) {
    return dets.map((d) => ({
      bbox: d.bbox,
      classIndex: d.classIndex,
      className: d.className,
      confidence: d.confidence,
      source: 'model',
      status: 'confirmed',
    }));
  }
  return {
    front: confirmAll(current.front),
    left: confirmAll(current.left),
    right: confirmAll(current.right),
  };
}

/** Reconstruct a ScanResponse from a previous session + current detections */
function buildCachedResponse(prev: PreviousSession, current: AllDetections): object {
  const currentTotal = current.front.length + current.left.length + current.right.length;
  return {
    reviewed_detections: buildCachedReviewedDetections(current),
    summary: {
      severity: prev.severity ?? 'mild',
      severity_score: prev.severity_score ?? 0,
      total_spots: currentTotal,
      confirmed_spots: currentTotal,
      ai_added_spots: 0,
      ai_corrected_spots: 0,
      primary_acne_type: prev.primary_acne_type ?? 'unknown',
      description: prev.description ?? '',
    },
    zone_breakdown: prev.zone_breakdown ?? [],
    skin_insights: prev.skin_insights ?? {},
    recommendations: [],
    skin_plan: { morning_routine: [], evening_routine: [], weekly_treatments: [] },
    matched_products: prev.matched_products ?? null,
    skin_assessment: prev.skin_assessment ?? undefined,
    zone_scores: prev.zone_scores ?? undefined,
    cached: true,
    gemini_called: false,
  };
}

// ── Retry helper ──

interface GeminiCallResult {
  ok: boolean;
  status: number;
  body: any;
  retryable: boolean;
  attempts: number;
}

/**
 * Call Gemini API with retry for transient errors.
 */
async function callGeminiWithRetry(
  apiKey: string,
  contents: any[],
  generationConfig?: object
): Promise<GeminiCallResult> {
  let lastResult: GeminiCallResult | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    console.log(`[gemini-review-scan] Gemini API call — model: ${GEMINI_MODEL}, attempt ${attempt}/${MAX_RETRIES + 1}`);

    const res = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: generationConfig ?? { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    });

    console.log(`[gemini-review-scan] Gemini response status: ${res.status}`);

    if (res.ok) {
      const data = await res.json();
      // Extract text from Gemini response format and wrap in Anthropic-compatible shape
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return { ok: true, status: res.status, body: { content: [{ type: 'text', text }] }, retryable: false, attempts: attempt };
    }

    if (res.status !== 429 && res.status !== 503) {
      const errText = await res.text();
      return { ok: false, status: res.status, body: errText, retryable: false, attempts: attempt };
    }

    const errText = await res.text();
    console.log(`[gemini-review-scan] ${res.status} received on attempt ${attempt}: ${errText.substring(0, 200)}`);

    lastResult = { ok: false, status: res.status, body: errText, retryable: true, attempts: attempt };

    if (attempt <= MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[gemini-review-scan] retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return lastResult!;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  console.log('[gemini-review-scan] ══════════ request received ══════════');
  console.log('[gemini-review-scan] method:', req.method);
  console.log('[gemini-review-scan] url:', req.url);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── GET /test — lightweight Claude API health check ──
  if (req.method === 'GET') {
    console.log('[gemini-review-scan] GET /test — running Gemini API health check');
    const testKey = Deno.env.get('GEMINI_API_KEY');
    if (!testKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'GEMINI_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const testRes = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${testKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly: {"status":"ok"}' }] }],
          generationConfig: { maxOutputTokens: 32 },
        }),
      });
      const testStatus = testRes.status;
      const testText = await testRes.text();
      console.log(`[gemini-review-scan] test ${GEMINI_MODEL}: status ${testStatus}`);

      return new Response(
        JSON.stringify({
          ok: testRes.ok,
          model: GEMINI_MODEL,
          status: testStatus,
          ...(testRes.ok
            ? { message: 'Gemini API is reachable and responding' }
            : { error: testText.substring(0, 300) }),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ ok: false, error: String(e) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── POST — full scan review ──
  console.log('[gemini-review-scan] config:', JSON.stringify({
    enable_first_scan_only_gemini: CONFIG.enable_first_scan_only_gemini,
    enable_gemini_front_only: CONFIG.enable_gemini_front_only,
    image_resize_for_gemini: CONFIG.image_resize_for_gemini,
    meaningful_change_threshold: CONFIG.meaningful_change_threshold,
  }));

  try {
    // ── Step 1: Auth ──
    console.log('[gemini-review-scan] step 1: auth');
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[gemini-review-scan] auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[gemini-review-scan] authenticated user:', user.id);

    // ── Step 2: GEMINI_API_KEY ──
    const anthropicKey = Deno.env.get('GEMINI_API_KEY');
    console.log('[gemini-review-scan] step 2: GEMINI_API_KEY present:', !!anthropicKey, 'length:', anthropicKey?.length ?? 0);
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not set in Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 3: Parse body ──
    console.log('[gemini-review-scan] step 3: parsing request body');
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', details: String(e) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { front_image, left_image, right_image, detections, image_dimensions } = body;
    const current: AllDetections = {
      front: detections?.front ?? [],
      left: detections?.left ?? [],
      right: detections?.right ?? [],
    };
    const currentTotal = current.front.length + current.left.length + current.right.length;

    console.log('[gemini-review-scan] received images — front:', front_image?.length ?? 0, 'left:', left_image?.length ?? 0, 'right:', right_image?.length ?? 0);
    console.log('[gemini-review-scan] Ultralytics detections:', {
      front: current.front.length,
      left: current.left.length,
      right: current.right.length,
      total: currentTotal,
    });

    if (!front_image) {
      return new Response(
        JSON.stringify({ error: 'Missing front_image in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 4: First-scan-of-day cache check ──
    if (CONFIG.enable_first_scan_only_gemini) {
      console.log('[gemini-review-scan] step 4: checking for first scan of day');

      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);

      const { data: prevSessions, error: queryError } = await supabase
        .from('scan_sessions')
        .select(`
          id, total_spots, model_detections, zone_breakdown,
          skin_insights, recommendations, skin_plan,
          reviewed_detections, severity, severity_score,
          primary_acne_type, description, matched_products, created_at
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', todayUTC.toISOString())
        .order('created_at', { ascending: true })
        .limit(1);

      if (queryError) {
        console.warn('[gemini-review-scan] DB query error (continuing with Claude):', queryError.message);
      } else if (prevSessions && prevSessions.length > 0) {
        const prev = prevSessions[0] as PreviousSession;
        console.log('[gemini-review-scan] found earlier session today:', prev.id, '— running meaningful-change check');

        const { changed, reasons } = detectMeaningfulChange(current, prev, image_dimensions ?? { front: { width: 0, height: 0 } });

        if (!changed) {
          const skipReason = 'No meaningful change from first scan of day';
          console.log('[gemini-review-scan] ✓ AI SKIPPED —', skipReason);
          console.log('[gemini-review-scan]   cached session:', prev.id);
          console.log('[gemini-review-scan]   prev total_spots:', prev.total_spots, '→ current:', currentTotal);

          const cached = buildCachedResponse(prev, current);
          return new Response(
            JSON.stringify({ ...cached, skip_reason: skipReason }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[gemini-review-scan] ✗ MEANINGFUL CHANGE — re-calling Claude');
        console.log('[gemini-review-scan]   reasons:', reasons.join(' | '));
      } else {
        console.log('[gemini-review-scan] no completed sessions today — FIRST SCAN OF DAY → calling Claude');
      }
    } else {
      console.log('[gemini-review-scan] step 4: first-scan-only disabled, always calling Claude');
    }

    // ── Step 5: Build Anthropic request ──
    console.log('[gemini-review-scan] step 5: building Anthropic request');

    const frontImgWCtx = image_dimensions?.front?.width  ?? 1280;
    const frontImgHCtx = image_dimensions?.front?.height ?? 1280;

    let ultralyticsContext = [
      `## Ultralytics YOLO Detections (all 3 angles)\n`,
      `Total spots found: ${currentTotal}`,
      `Average confidence: ${avgConfidence(current).toFixed(2)}`,
      ``,
      `### FRONT VIEW (${current.front.length} detections)`,
      `Each line shows: [index] type — position in image — confidence`,
      ...current.front.map((d, i) => {
        const cx = ((d.bbox[0] + d.bbox[2]) / 2) / frontImgWCtx;
        const cy = ((d.bbox[1] + d.bbox[3]) / 2) / frontImgHCtx;
        return `  [${i + 1}] ${d.className} — ${Math.round(cx * 100)}% from left, ${Math.round(cy * 100)}% from top — conf ${d.confidence.toFixed(3)}`;
      }),
      ``,
      `### LEFT SIDE (${current.left.length} detections)`,
      ...current.left.map((d, i) =>
        `  [${i + 1}] ${d.className} — conf ${d.confidence.toFixed(3)}`
      ),
      ``,
      `### RIGHT SIDE (${current.right.length} detections)`,
      ...current.right.map((d, i) =>
        `  [${i + 1}] ${d.className} — conf ${d.confidence.toFixed(3)}`
      ),
    ].join('\n');

    const frontDim  = image_dimensions?.front;
    const leftDim   = image_dimensions?.left;
    const rightDim  = image_dimensions?.right;

    // (Labels are now built dynamically after annotatedFront is known below)

    const frontMediaType = detectMediaType(front_image) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    const leftMediaType = left_image ? detectMediaType(left_image) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' : frontMediaType;
    const rightMediaType = right_image ? detectMediaType(right_image) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' : frontMediaType;

    const hasLeftImage = !!left_image;
    const hasRightImage = !!right_image;

    const systemPrompt = `You are an expert dermatologist AI working alongside an Ultralytics YOLO acne detection model.

Your role is strictly complementary to the YOLO model:
- YOLO is the PRIMARY detector. Its results are the ground truth unless you are FULLY certain of an error.
- You must use the YOLO detections provided as structured context for your analysis.
- You may suggest possible spots the model missed (mark as source="ai", status="added").
- You may only override a YOLO result (correct or remove) when you are 100% certain — otherwise keep it as-is.

## Class mapping (YOLO model)
0 = blackheads | 1 = dark spot | 2 = nodules | 3 = papules | 4 = pustules | 5 = whiteheads

Return ONLY valid JSON. No markdown fences. No explanation outside the JSON object.`;

    // ── Build annotated visualization (AcneMapHero-style circles) ──────────────
    console.log('[gemini-review-scan] building annotated front image...');
    const annotatedFront = await buildAnnotatedImage(
      front_image,
      current.front,
      image_dimensions?.front?.width  ?? 1280,
      image_dimensions?.front?.height ?? 1280,
    );
    if (annotatedFront) {
      console.log('[gemini-review-scan] annotation built OK, size:', Math.round(annotatedFront.length * 3 / 4 / 1024), 'KB');
    }

    const imageCount = 1 + (annotatedFront ? 1 : 0) + (hasLeftImage ? 1 : 0) + (hasRightImage ? 1 : 0);

    // Build image labels — annotated image goes first when available
    const annotatedLabel  = 'IMAGE 1 — ANNOTATED FRONT VIEW: coloured circles mark every YOLO-detected spot. Each numbered detection in the list below corresponds to one circle. Use this image to visually identify which facial region each circle sits in (forehead, left cheek, right cheek, nose, or chin/jawline) — the face may not be centred in the photo, so judge zones relative to the actual face visible in the image.';
    const plainFrontIdx   = annotatedFront ? 2 : 1;
    const plainFrontLabel = frontDim
      ? `IMAGE ${plainFrontIdx} — FRONT VIEW original (${frontDim.width}x${frontDim.height}px, sent resized to ≤${CONFIG.image_resize_for_gemini}px) — use for skin texture, tone, and assessment`
      : `IMAGE ${plainFrontIdx} — FRONT VIEW original`;
    const leftIdx   = plainFrontIdx + 1;
    const rightIdx  = leftIdx + 1;
    const leftLabel = leftDim
      ? `IMAGE ${leftIdx} — LEFT SIDE VIEW (${leftDim.width}x${leftDim.height}px original)`
      : `IMAGE ${leftIdx} — LEFT SIDE VIEW`;
    const rightLabel = rightDim
      ? `IMAGE ${rightIdx} — RIGHT SIDE VIEW (${rightDim.width}x${rightDim.height}px original)`
      : `IMAGE ${rightIdx} — RIGHT SIDE VIEW`;

    const userPrompt = `You are provided with ${imageCount} face image${imageCount > 1 ? 's' : ''} of the same person:
${annotatedFront ? `- ${annotatedLabel}\n` : ''}- ${plainFrontLabel}${hasLeftImage ? `\n- ${leftLabel}` : ''}${hasRightImage ? `\n- ${rightLabel}` : ''}

${ultralyticsContext}

## Your two tasks

### Task 1 — Review YOLO detections across all angles
${annotatedFront ? 'The FIRST image has coloured circles marking every YOLO-detected spot. Use it to visually locate each detection on the face. The SECOND image is the plain original for skin quality assessment.' : ''}
Using all ${imageCount} images and the YOLO detection list:
- Confirm detections on each angle's image that you can visually verify
- Note any possible missed spots on any image
- Cross-reference all angles for a complete picture of the person's skin

### Task 2 — Skin analysis
- Overall severity and zone breakdown
- Skin type, moisture, 2 key observations
- zone_assignments: for EACH front detection listed above (in order [1], [2], …), look at the annotated image and assign it to exactly one zone. Output as an array of strings, one per detection, in the same order. Valid values: "forehead", "left_cheek", "right_cheek", "nose", "chin_jawline". Judge relative to the actual face in the image — the face may not fill the frame.
- skin_assessment: assess all 11 categories below from the photo and YOLO data. Score each 0–10 (lower = better condition). Mark between 1 and 4 of the lowest-scoring categories as is_strength=true, and between 1 and 4 of the highest-scoring as is_strength=false. Label must be a friendly one-sentence plain-English description.

Categories: active_breakouts, comedones, dark_spots, redness, skin_texture, pore_visibility, skin_tone_evenness, oiliness, hydration, brightness, under_eye

## Required JSON output

Return ONLY valid JSON:

{
  "reviewed_detections": {
    "front": [{"bbox": [x1,y1,x2,y2], "classIndex": 0, "className": "blackheads", "confidence": 0.95, "source": "model", "status": "confirmed"}],
    "left": [],
    "right": []
  },
  "summary": {
    "severity": "mild",
    "severity_score": 35,
    "total_spots": 12,
    "confirmed_spots": 10,
    "ai_added_spots": 2,
    "ai_corrected_spots": 0,
    "primary_acne_type": "comedonal",
    "description": "One sentence overview."
  },
  "zone_breakdown": [
    {"zone": "forehead", "spot_count": 7, "primary_types": ["papules"], "severity": "moderate", "note": "brief"}
  ],
  "skin_insights": {
    "skin_type": "combination",
    "moisture": "low-normal",
    "key_observations": ["obs 1", "obs 2"]
  },
  "zone_assignments": ["forehead", "left_cheek", "chin_jawline"],
  "skin_assessment": [
    {"category": "active_breakouts", "label": "Several inflamed spots on forehead and chin", "score": 7, "is_strength": false},
    {"category": "comedones", "label": "Very few blackheads or whiteheads detected", "score": 2, "is_strength": true},
    {"category": "dark_spots", "label": "Some post-inflammatory marks still fading", "score": 6, "is_strength": false},
    {"category": "redness", "label": "Mild redness around the cheeks", "score": 5, "is_strength": false},
    {"category": "skin_texture", "label": "Texture looks relatively smooth overall", "score": 3, "is_strength": true},
    {"category": "hydration", "label": "Skin looks well moisturised", "score": 2, "is_strength": true}
  ],
  "recommendations": [],
  "skin_plan": {"morning_routine": [], "evening_routine": [], "weekly_treatments": []}
}

NOTE: Return empty arrays for recommendations and skin_plan — those are generated separately in the plan step.

CRITICAL:
- severity must be exactly "mild", "moderate", or "severe"
- zone_assignments must have exactly ${current.front.length} entries (one per front detection, in order)
- confirmed YOLO detections: source="model" status="confirmed"; missed: source="ai" status="added"; false positive: status="removed"
- Keep ALL text values short (one sentence max per field)
- Empty arrays are valid`;

    // Build Gemini content parts — annotated image first (if available), then originals
    const geminiParts: any[] = [];
    if (annotatedFront) {
      // Annotated visualization goes first — Gemini uses it to identify spot locations/zones
      geminiParts.push({ inline_data: { mime_type: 'image/jpeg', data: annotatedFront } });
    }
    geminiParts.push({ inline_data: { mime_type: frontMediaType, data: front_image } });
    if (hasLeftImage) {
      geminiParts.push({ inline_data: { mime_type: leftMediaType, data: left_image } });
    }
    if (hasRightImage) {
      geminiParts.push({ inline_data: { mime_type: rightMediaType, data: right_image } });
    }
    geminiParts.push({ text: systemPrompt + '\n\n' + userPrompt });

    const geminiContents = [{ parts: geminiParts }];

    console.log('[gemini-review-scan] Gemini payload info:');
    console.log('  model:', GEMINI_MODEL);
    console.log('  images sent:', imageCount, annotatedFront ? '(incl. annotated)' : '(no annotation)');
    console.log('  detections — front:', current.front.length, 'left:', current.left.length, 'right:', current.right.length);

    // ── Step 6: Call Gemini API (with retry) ──
    console.log('[gemini-review-scan] step 6: calling Gemini API (with retry support)');
    const geminiResult = await callGeminiWithRetry(anthropicKey, geminiContents, {
      temperature: 0.3,
      maxOutputTokens: 32768,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    });

    console.log(`[gemini-review-scan] Gemini call completed — status: ${geminiResult.status}, attempts: ${geminiResult.attempts}`);

    if (!geminiResult.ok) {
      const errBody = typeof geminiResult.body === 'string' ? geminiResult.body : JSON.stringify(geminiResult.body);
      console.error('[gemini-review-scan] Gemini API error:', geminiResult.status, errBody.substring(0, 500));

      let userHint = '';
      if (geminiResult.status === 429) userHint = `Gemini rate limit hit after ${geminiResult.attempts} attempts. Try again in a minute.`;
      else if (geminiResult.status === 401 || geminiResult.status === 403) userHint = 'GEMINI_API_KEY is invalid. Please update your key in Supabase secrets.';

      return new Response(
        JSON.stringify({
          error: `Gemini API returned ${geminiResult.status}`,
          details: errBody.substring(0, 500),
          attempts: geminiResult.attempts,
          hint: userHint || undefined,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 7: Parse Gemini response ──
    console.log('[gemini-review-scan] step 7: parsing Gemini response');
    const anthropicData = geminiResult.body;
    const stopReason = anthropicData.stop_reason;
    const textBlock = anthropicData.content?.find((b: any) => b.type === 'text');
    const resultText = textBlock?.text ?? '';

    console.log('[gemini-review-scan] stop_reason:', stopReason);
    console.log('[gemini-review-scan] response text length:', resultText.length);

    if (!resultText) {
      console.error('[gemini-review-scan] Empty Claude response');
      console.error('[gemini-review-scan] full response:', JSON.stringify(anthropicData).substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Claude returned empty response', stop_reason: stopReason }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: any;
    try {
      result = JSON.parse(resultText);
    } catch {
      // Try stripping markdown fences first
      const stripped = resultText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      try {
        result = JSON.parse(stripped);
      } catch {
        // Try extracting the outermost JSON object
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
          } catch (parseErr) {
            console.error('[gemini-review-scan] Could not parse Gemini JSON (truncated?):', String(parseErr));
            console.error('[gemini-review-scan] response snippet (first 500):', resultText.substring(0, 500));
            return new Response(
              JSON.stringify({ error: 'Gemini returned malformed or truncated JSON', snippet: resultText.substring(0, 300), parse_error: String(parseErr) }),
              { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.error('[gemini-review-scan] No JSON object found in Gemini response');
          console.error('[gemini-review-scan] response snippet:', resultText.substring(0, 300));
          return new Response(
            JSON.stringify({ error: 'Could not parse Gemini response as JSON', snippet: resultText.substring(0, 200) }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // ── Fix bbox coordinate spaces ──
    // Model detections: restore original YOLO bboxes (Gemini may drift from the values
    //   it was given, or future prompt changes might omit them).
    // AI-added detections: scale up from the resized Gemini image space to original space.
    if (result.reviewed_detections) {
      fixBboxCoordinates(result.reviewed_detections, current, image_dimensions);
    }

    // ── Normalize severity to valid enum values ──
    const VALID_SEVERITIES = ['mild', 'moderate', 'severe'];
    if (result.summary?.severity && !VALID_SEVERITIES.includes(result.summary.severity)) {
      const raw = result.summary.severity.toLowerCase();
      if (raw.includes('min') || raw.includes('none') || raw.includes('clear') || raw === 'low') {
        result.summary.severity = 'mild';
      } else if (raw.includes('sev') || raw.includes('high') || raw.includes('severe')) {
        result.summary.severity = 'severe';
      } else {
        result.summary.severity = 'moderate';
      }
      console.log(`[gemini-review-scan] normalized severity "${raw}" → "${result.summary.severity}"`);
    }

    // ── Step 8: Validate required fields ──
    const missing: string[] = [];
    if (!result.reviewed_detections) missing.push('reviewed_detections');
    if (!result.summary) missing.push('summary');
    if (!Array.isArray(result.zone_breakdown)) missing.push('zone_breakdown');
    if (!result.skin_insights) missing.push('skin_insights');

    if (missing.length > 0) {
      console.error('[gemini-review-scan] response missing fields:', missing);
      return new Response(
        JSON.stringify({ error: 'Claude returned incomplete response', missing_fields: missing }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Build zone_scores from Gemini's per-detection zone_assignments ──────────
    // Gemini assigns each front detection (in order) to a zone by looking at the
    // annotated image. We tally those assignments here — counts always match YOLO total.
    {
      const assignments: string[] = Array.isArray(result.zone_assignments) ? result.zone_assignments : [];
      console.log('[gemini-review-scan] zone_assignments from Gemini:', assignments);

      const zoneData: Record<string, { count: number; types: Set<string> }> = {};
      for (const z of ZONE_NAMES) zoneData[z] = { count: 0, types: new Set() };

      current.front.forEach((det, i) => {
        const raw = (assignments[i] ?? '').toLowerCase().trim();
        // Accept minor variations ("left cheek" → "left_cheek", etc.)
        const zone = ZONE_NAMES.find(z => z === raw || z.replace('_', ' ') === raw || raw.includes(z.split('_')[0]))
          ?? 'left_cheek'; // fallback to left_cheek if Gemini returns garbage
        zoneData[zone].count++;
        zoneData[zone].types.add(det.className);
      });

      result.zone_scores = ZONE_NAMES.map(zone => {
        const { count, types } = zoneData[zone];
        const severity = count === 0 ? 'clear' : count <= 2 ? 'mild' : count <= 5 ? 'moderate' : 'severe';
        return { zone, lesion_count: count, severity, primary_types: Array.from(types) };
      });

      console.log('[gemini-review-scan] zone_scores (from assignments):', result.zone_scores.map((z: any) => `${z.zone}:${z.lesion_count}`).join(', '));
    }

    // ── Clamp skin_assessment to 1–4 strengths and 1–4 weaknesses ──
    if (Array.isArray(result.skin_assessment) && result.skin_assessment.length > 0) {
      const strengths  = result.skin_assessment.filter((a: any) =>  a.is_strength).slice(0, 4);
      const weaknesses = result.skin_assessment.filter((a: any) => !a.is_strength).slice(0, 4);
      result.skin_assessment = [...strengths, ...weaknesses];
    } else {
      console.warn('[gemini-review-scan] skin_assessment missing or empty from Gemini response');
    }

    result.gemini_called = true;
    result.cached = false;

    console.log('[gemini-review-scan] ✓ SUCCESS');
    console.log('  total_spots:', result.summary?.total_spots);
    console.log('  severity:', result.summary?.severity, '(score:', result.summary?.severity_score + ')');
    console.log('  ai_added_spots:', result.summary?.ai_added_spots);
    console.log('  zones:', result.zone_breakdown?.map((z: any) => z.zone).join(', '));

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[gemini-review-scan] unhandled error:', err, (err as any)?.stack);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
