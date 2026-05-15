import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { skin_profile_id, existing_plan } = await req.json();
    if (!skin_profile_id) {
      return new Response(JSON.stringify({ error: 'Missing skin_profile_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Gather ALL available data about this user ──

    const { data: skin, error: skinError } = await supabaseClient
      .from('skin_profiles')
      .select('user_id, skin_type, acne_type, severity, analysis_notes')
      .eq('id', skin_profile_id)
      .single();

    if (skinError || !skin) {
      return new Response(JSON.stringify({ error: 'Skin profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch everything in parallel
    const [obRes, scansRes, progressRes] = await Promise.all([
      // Onboarding data
      supabaseClient
        .from('onboarding_data')
        .select('age_range, acne_duration, tried_products, known_allergies, skin_concerns, hormonal_treatment')
        .eq('user_id', skin.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Product scan history (what products they've checked)
      supabaseClient
        .from('product_scans')
        .select('product_name, verdict, ingredients')
        .eq('user_id', skin.user_id)
        .order('created_at', { ascending: false })
        .limit(20),

      // Progress photos (skin improvement tracking)
      supabaseClient
        .from('progress_photos')
        .select('severity_score, improvement_percentage, analysis_notes, annotations, created_at')
        .eq('user_id', skin.user_id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const ob = obRes.data;
    const scans = scansRes.data || [];
    const progress = progressRes.data || [];

    // ── Build rich context sections ──

    // Skin profile
    const skinContext = [
      `Skin type: ${skin.skin_type}`,
      `Acne type: ${skin.acne_type}`,
      `Severity: ${skin.severity}`,
      skin.analysis_notes ? `AI scan analysis: ${skin.analysis_notes}` : '',
    ].filter(Boolean).join('\n');

    // Onboarding context
    const onboardingContext = ob ? [
      `Age range: ${ob.age_range}`,
      `Acne duration: ${ob.acne_duration}`,
      ob.tried_products?.length ? `Products already tried: ${ob.tried_products.join(', ')}` : '',
      ob.known_allergies?.length ? `Known allergies: ${ob.known_allergies.join(', ')}` : '',
      ob.skin_concerns?.length ? `Primary concerns: ${ob.skin_concerns.join(', ')}` : '',
      ob.hormonal_treatment?.length && !(ob.hormonal_treatment.length === 1 && ob.hormonal_treatment[0] === 'none')
        ? `Hormonal treatment / birth control: ${ob.hormonal_treatment.join(', ')} — factor these hormonal inputs into androgen-driven acne reasoning and avoid recommendations that interact (e.g. anti-androgen herbs that could conflict with HRT).`
        : '',
    ].filter(Boolean).join('\n') : '';

    // Product scan history — what they've scanned and results
    const scanContext = scans.length > 0
      ? `Products scanned recently:\n${scans.map(s =>
          `- ${s.product_name}: ${s.verdict}${s.ingredients?.length ? ` (contains: ${s.ingredients.slice(0, 5).join(', ')})` : ''}`
        ).join('\n')}`
      : '';

    // Progress tracking — how their skin has been changing
    const progressContext = progress.length > 0
      ? `Skin progress tracking (most recent first):\n${progress.map(p => {
          const date = new Date(p.created_at).toLocaleDateString();
          const improvement = p.improvement_percentage != null ? ` | ${p.improvement_percentage}% improvement` : '';
          const zones = p.annotations ? Object.entries(p.annotations as Record<string, string>)
            .filter(([_, v]) => v && v !== 'clear')
            .map(([zone, note]) => `${zone}: ${note}`)
            .join(', ') : '';
          return `- ${date}: severity ${p.severity_score}/10${improvement}${zones ? ` | Zones: ${zones}` : ''}${p.analysis_notes ? ` | Notes: ${p.analysis_notes.substring(0, 100)}` : ''}`;
        }).join('\n')}`
      : '';

    // Products they found suitable vs unsuitable
    const suitableProducts = scans.filter(s => s.verdict === 'suitable').map(s => s.product_name);
    const unsuitableProducts = scans.filter(s => s.verdict === 'unsuitable').map(s => s.product_name);
    const productInsight = [
      suitableProducts.length ? `Products that worked for them: ${suitableProducts.join(', ')}` : '',
      unsuitableProducts.length ? `Products that did NOT work: ${unsuitableProducts.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    // ── Assemble the full prompt ──

    const existingPlanContext = Array.isArray(existing_plan) && existing_plan.length > 0
      ? `═══ CURRENT PLAN (smart-merge mode) ═══\n${existing_plan.map((item: any, i: number) =>
          `${i + 1}. [${item.pillar}] ${item.title} — ${item.rationale}`
        ).join('\n')}`
      : '';

    // Compact product catalog (id + brand + short name + category) — Gemini picks a matching
    // product_id for each PRODUCT pick so the UI can render the real product image.
    // Keep this short to avoid token bloat. If no good match exists, AI omits product_id.
    const PRODUCT_CATALOG = `═══ AVAILABLE PRODUCT CATALOG ═══
For every PRODUCT pillar item, set "product_id" to the id of the closest matching product below.
If nothing in the catalog matches well, omit product_id entirely.

sk-1   Santa Cruz Paleo — Beef Tallow & Honey Moisturizer (Skincare)
sk-2   Cocokind — Texture Smoothing Cream w/ Squalane (Skincare)
sk-3   HERBIVORE — Aquarius BHA + Blue Tansy Clarity Cleanser (Skincare)
sk-4   True Botanicals — Renew Pure Radiance Oil (Skincare)
sk-5   OSEA — Ocean Cleanser, Mineral-Rich Gentle Face Wash (Skincare)
sk-6   PAI — Organic Rosehip BioRegenerate Facial Oil (Skincare)
sk-7   Youth to the People — Superfood Kale + Green Tea Cleanser (Skincare)
sk-8   Dr. Bronner's — Pure-Castile Liquid Soap, Baby Unscented (Skincare)
sk-9   Badger — Damascus Rose Face Oil (Skincare)
sk-10  Weleda — Skin Food Original Ultra-Rich Body Cream (Skincare)
sk-11  THAYERS — Alcohol-Free Rose Petal Witch Hazel Toner (Skincare)
sk-12  Eminence — Clear Skin Probiotic Cleanser (Skincare)
sk-13  KORA Organics — Noni Glow Hydrating Face Oil (Skincare)
sk-14  Trilogy — Certified Organic Rosehip Oil (Skincare)
sk-15  Beauty of Joseon — Glow Serum, Propolis + Niacinamide (Skincare)
su-1   Garden of Life — Raw Zinc 30mg + Vitamin C (Supplements)
su-2   Ancient Nutrition — Multi Collagen Protein Powder (Supplements)
su-3   MaryRuth's — Liquid Morning Multivitamin (Supplements)
su-4   New Chapter — Fermented Zinc Complex (Supplements)
su-5   MegaFood — Skin, Nails & Hair 2 Vitamins (Supplements)`;

    const SCHEMA_DOC = `═══ OUTPUT SCHEMA ═══
Return ONE JSON object (no markdown, no backticks, no commentary) with exactly these fields:

{
  "skin_goal": {
    "headline":    "<one calm action-oriented sentence describing today's focus, ~10-14 words, ends with a period>",
    "description": "<one sentence starting with 'Based on your latest scan:' summarising current state + key zone>",
    "tags": [
      { "label": "Stable" | "Improving" | "Flare-up", "kind": "trend" },
      { "label": "<zone>",  "kind": "zone"  },
      { "label": "<focus>", "kind": "focus" }
    ]
  },
  "avoid_today": [ "<don't #1>", "<don't #2>", "<don't #3>" ],
  "coach_note":  "<1-2 short sentences of warm encouragement>",
  "ranked_items": [ ...exactly 10 items, see RANKED ITEM RULES below ]
}

Skin-goal tag rules:
- "trend" label MUST be exactly one of: "Stable", "Improving", "Flare-up".
- "zone"  label is a single short zone name: "Forehead", "Cheeks", "T-zone", "Chin", "Nose", "Jawline".
- "focus" label is a 1-2 word treatment focus: "Barrier care", "Oil control", "Hydration", "Pore care", "Calm", "Brightening".
- Always include exactly 3 tags in this order: trend, zone, focus.

Avoid-today rules: 3 short don'ts, max 4 words each, e.g. "Don't over-exfoliate", "Don't pick at spots", "Skip harsh new actives".

Coach-note rules: 1-2 sentences, warm, plain, no emojis, max 22 words total.`;

    const freshTaskInstruction = `═══ YOUR TASK ═══
Generate today's plan as ONE JSON object matching the schema. The ranked_items array must contain exactly 10 actionable recommendations — always include 6-7 PRODUCT picks, 1-2 diet, 1 herbal, 1 lifestyle:

PRODUCT picks: Clean/natural skincare only. Recommend specific natural ingredients — tallow balm, rosehip oil (natural vitamin A), willow bark (natural BHA), tea tree oil, bakuchiol, manuka honey, niacinamide in clean formulations, zinc oxide mineral SPF. Favor brands like Santa Cruz Paleo, Cocokind, Herbivore, OSEA, Pai, Badger, Weleda, True Botanicals. Prioritize product picks — this is a skincare app and topical interventions are the most actionable for the patient.

DIET picks: Whole-food nutrition categories — be broad and category-level, NOT specific foods. Say "omega-3 rich foods" not "salmon". Say "fermented foods" not "sauerkraut". Say "antioxidant-rich berries" not "blueberries". Use nutrient/category framing: collagen-building foods, anti-inflammatory omega-3 sources, gut-healing fermented foods, antioxidant-rich produce, blood-sugar-stabilising whole grains. Recommend eliminating: dairy, refined sugar, seed oils, processed foods, whey protein. Keep it approachable and non-prescriptive about specific foods.

HERBAL picks: Traditional herbs with real evidence + specific dosages. Spearmint tea (anti-androgen, 2 cups/day), ashwagandha (cortisol reduction), neem (Ayurvedic purification), triphala (digestive cleanse), manjistha (blood purifying), burdock root (liver + skin), holy basil/tulsi (adaptogen), turmeric + black pepper (anti-inflammatory), dandelion root (liver detox).

LIFESTYLE picks: Natural practices — morning sunlight 10-20 min (circadian reset + vitamin D), grounding/earthing barefoot on grass, cold showers or ice rolling (reduces inflammation), gua sha facial massage (lymphatic drainage), silk/satin pillowcase (less friction), breathwork or meditation (cortisol management), exercise (sweating = detox), clean water (filtered, no fluoride).

RANKED ITEM RULES:
- "pillar": one of "product" | "diet" | "herbal" | "lifestyle".
- "title": 2-4 words. For product picks, prefer a generic product type ("Gentle Cleanser", "Lightweight Moisturizer", "Mineral SPF 30", "Rosehip Oil") rather than the brand name.
- "rationale": one short sentence (≤ 12 words) describing what the step does for the patient (e.g. "Removes oil and buildup without drying your skin.").
- "time_of_day": exactly "morning" OR "night". No other values. Split the 10 items so morning and night each have a sensible mix (e.g. cleanser/moisturizer/SPF in morning; cleanser/serum/moisturizer/herbal in night). Lifestyle and herbal items go in whichever fits the practice (sunlight = morning, ashwagandha = night).
- "duration_min": integer minutes for one execution of this step (typically 1 for products, 5 for herbal tea, 10 for lifestyle practices).
- "product_id": for "product" pillar items only, pick the closest matching id from the PRODUCT CATALOG. Omit if no good match.
- "notes": an array of exactly 3 bullet strings. Each bullet MUST (a) name the patient's exact skin type / acne type / severity from the profile above, (b) explain the biological or nutritional mechanism connecting this pick to THAT specific condition, (c) NEVER repeat or paraphrase the rationale field. Each bullet is one short punchy sentence, no more than 15 words.
- "impact_rank": integer 1-10, 1 = highest priority.

BAD notes (do NOT do this): ["Rosehip oil is great for your skin.", "It helps with acne.", "Use it nightly."] — too vague, repeats rationale, doesn't mention their specific condition.
GOOD notes: ["Your hormonal acne triggers excess sebum via androgens — rosehip's trans-retinoic acid directly normalises sebocyte output at the follicle.", "Unlike synthetic retinoids, it won't disrupt your combination skin barrier or trigger the inflammation that worsens your breakouts.", "The linoleic acid in rosehip also corrects the fatty-acid deficiency common in acne-prone skin."]

Example item:
{"pillar":"product","title":"Rosehip Oil","rationale":"Natural vitamin A — softens scars and balances oil.","time_of_day":"night","duration_min":1,"product_id":"sk-6","notes":["Your hormonal acne triggers excess sebum via androgens — rosehip's trans-retinoic acid directly normalises sebocyte output at the follicle.","Unlike synthetic retinoids, it won't disrupt your combination skin barrier or trigger inflammation that worsens your breakouts.","The linoleic acid in rosehip corrects the fatty-acid deficiency that is consistently elevated in acne-prone skin."],"impact_rank":1}

${SCHEMA_DOC}

${PRODUCT_CATALOG}

Exactly 10 items in ranked_items. 6-7 must be product pillar. notes field is REQUIRED and must be personalised to this patient's exact profile.`;

    const mergeTaskInstruction = `${existingPlanContext}

═══ YOUR TASK ═══
You are updating this patient's plan based on their latest scan. Output the SAME JSON object shape described in the schema below. Rules:
- KEEP items whose pillar/rationale still matches the current skin profile.
- ADD 1–2 new items if the latest scan reveals a condition not addressed (e.g. a new acne type detected).
- REMOVE an item ONLY when you are certain its target condition is no longer present. When in doubt, keep it.
- Output exactly 10 items in ranked_items. All 4 pillars (product, diet, herbal, lifestyle) must remain present.
- Regenerate skin_goal / avoid_today / coach_note FRESH based on the latest scan (do not just copy old ones).

RANKED ITEM RULES:
- "pillar": one of "product" | "diet" | "herbal" | "lifestyle".
- "title": 2-4 words. For product picks, prefer a generic product type ("Gentle Cleanser") rather than the brand name.
- "rationale": one short sentence (≤ 12 words).
- "time_of_day": exactly "morning" OR "night". No other values.
- "duration_min": integer minutes.
- "product_id": for "product" pillar items only, closest matching id from PRODUCT CATALOG below. Omit if no good match.
- "notes": exactly 3 personalised bullets that (a) name the patient's exact skin/acne type, (b) explain mechanism, (c) don't repeat rationale.
- "impact_rank": integer 1-10, 1 = highest.

${SCHEMA_DOC}

${PRODUCT_CATALOG}

Exactly 10 items in ranked_items. 6-7 must be product pillar. notes field is REQUIRED.`;

    const taskInstruction = existingPlanContext ? mergeTaskInstruction : freshTaskInstruction;

    const prompt = `You are a holistic skin health practitioner who combines ancestral wisdom with evidence-based dermatology. You take a root-cause, whole-body approach to skin health. Your philosophy:

- NATURAL FIRST: Prioritize plant-based, clean, and traditional remedies over synthetic/pharmaceutical products.
- CLEAN FORMULATIONS: When recommending actives (retinoids, BHA, niacinamide, zinc), suggest them in clean/natural forms — willow bark extract as natural BHA, bakuchiol or rosehip oil as retinol alternatives, food-based zinc. Never recommend CeraVe, Neutrogena, La Roche-Posay, or similar mainstream/corporate brands.
- ROOT CAUSE: Skin problems reflect internal imbalances — gut health, hormones, inflammation, nutrient deficiencies, toxin load, stress. Address the root cause.
- ANCESTRAL HEALTH: Draw from Ayurveda (neem, triphala, manjistha, ashwagandha), TCM (gua sha, herbal formulas), and ancestral nutrition (bone broth, fermented foods, omega-3 rich foods). Grounding, cold exposure, morning sunlight, filtered water.

═══ PATIENT PROFILE ═══
${skinContext}

${onboardingContext ? `═══ PATIENT HISTORY ═══\n${onboardingContext}\n` : ''}
${productInsight ? `═══ PRODUCT EXPERIENCE ═══\n${productInsight}\n` : ''}
${scanContext ? `═══ RECENT PRODUCT SCANS ═══\n${scanContext}\n` : ''}
${progressContext ? `═══ SKIN PROGRESS OVER TIME ═══\n${progressContext}\n` : ''}

${taskInstruction}`;

    const REQUIRED_PILLARS = ['product', 'diet', 'herbal', 'lifestyle'];

    // Helper: extract every complete {...} object from an arbitrary string
    function extractObjects(src: string): any[] {
      const results: any[] = [];
      let depth = 0;
      let start = -1;
      for (let i = 0; i < src.length; i++) {
        if (src[i] === '{') {
          if (depth === 0) start = i;
          depth++;
        } else if (src[i] === '}') {
          depth--;
          if (depth === 0 && start !== -1) {
            try { results.push(JSON.parse(src.slice(start, i + 1))); } catch {}
            start = -1;
          }
        }
      }
      return results;
    }

    function missingPillars(items: any[]): string[] {
      const found = new Set(items.map((i: any) => i.pillar));
      return REQUIRED_PILLARS.filter(p => !found.has(p));
    }

    interface GeminiPlan {
      items: any[];
      skin_goal: any | null;
      avoid_today: string[] | null;
      coach_note: string | null;
    }

    async function callGemini(extraInstruction = ''): Promise<{ plan: GeminiPlan | null; error?: string }> {
      const body: any = {
        contents: [{ parts: [{ text: extraInstruction ? `${prompt}\n\nCRITICAL: ${extraInstruction}` : prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 12288,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error(`[generate-plan] Gemini HTTP ${r.status}:`, errText.substring(0, 500));
        return { plan: null, error: `Gemini HTTP ${r.status}: ${errText.substring(0, 200)}` };
      }

      const g = await r.json();
      const candidate = g.candidates?.[0];
      const t = candidate?.content?.parts?.[0]?.text ?? '';
      if (!t) {
        const finishReason = candidate?.finishReason ?? 'unknown';
        const safetyRatings = candidate?.safetyRatings ? JSON.stringify(candidate.safetyRatings) : '';
        console.error(`[generate-plan] Empty Gemini response. finishReason=${finishReason} safety=${safetyRatings}`);
        return { plan: null, error: `Empty Gemini response (finishReason: ${finishReason})` };
      }

      console.log('[generate-plan] Gemini raw text (first 600):', t.substring(0, 600));

      let parsed: any;
      try { parsed = JSON.parse(t); } catch {
        console.warn('[generate-plan] Direct JSON.parse failed — attempting object extraction');
        parsed = extractObjects(t);
      }

      // Two acceptable shapes:
      //   1. New object shape: { skin_goal, avoid_today, coach_note, ranked_items: [...] }
      //   2. Bare array of items (legacy fallback)
      let itemsRaw: any[] | null = null;
      let skin_goal:   any | null     = null;
      let avoid_today: string[] | null = null;
      let coach_note:  string | null   = null;

      if (Array.isArray(parsed)) {
        itemsRaw = parsed;
      } else if (parsed && typeof parsed === 'object') {
        itemsRaw    = parsed.ranked_items ?? parsed.items ?? parsed.recommendations ?? null;
        skin_goal   = parsed.skin_goal   ?? null;
        avoid_today = Array.isArray(parsed.avoid_today) ? parsed.avoid_today : null;
        coach_note  = typeof parsed.coach_note === 'string' ? parsed.coach_note : null;
      }

      if (!Array.isArray(itemsRaw)) return { plan: null, error: 'Response missing ranked_items array' };

      const items = itemsRaw.filter(
        (item: any) => item && typeof item === 'object' && item.pillar && item.title && item.rationale
      );

      // Defensive: collapse any midday/evening leftovers to morning/night.
      for (const it of items) {
        if (it.time_of_day === 'midday')  it.time_of_day = 'morning';
        if (it.time_of_day === 'evening') it.time_of_day = 'night';
        if (it.time_of_day !== 'morning' && it.time_of_day !== 'night') it.time_of_day = 'morning';
        if (typeof it.duration_min !== 'number') it.duration_min = it.pillar === 'product' ? 1 : 5;
      }

      return { plan: { items, skin_goal, avoid_today, coach_note } };
    }

    // ── First attempt ──
    let ranked_items: any[] | null = null;
    let skin_goal:    any | null     = null;
    let avoid_today:  string[] | null = null;
    let coach_note:   string | null   = null;

    const first = await callGemini();
    if (!first.plan || first.plan.items.length === 0) {
      console.error('First Gemini call failed:', first.error);
      return new Response(JSON.stringify({
        error: `Failed to generate plan — ${first.error ?? 'no items parsed'}`,
        details: first.error,
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    ranked_items = first.plan.items;
    skin_goal    = first.plan.skin_goal;
    avoid_today  = first.plan.avoid_today;
    coach_note   = first.plan.coach_note;

    // ── Check all 4 pillars present; retry once if not ──
    const missing = missingPillars(ranked_items);
    if (missing.length > 0) {
      console.warn('[generate-plan] Missing pillars after first attempt:', missing, '— retrying');
      const retry = await callGemini(
        `The previous response was MISSING items for these pillars: ${missing.join(', ')}. You MUST include at least one item for EVERY pillar: product, diet, herbal, lifestyle. No exceptions.`
      );
      if (retry.plan && retry.plan.items.length > 0) {
        const retryMissing = missingPillars(retry.plan.items);
        if (retryMissing.length < missing.length) {
          ranked_items = retry.plan.items;
          for (const pillar of missingPillars(ranked_items)) {
            const fallback = first.plan.items.find((i: any) => i.pillar === pillar);
            if (fallback) ranked_items.push(fallback);
          }
          // Prefer retry's extras if it produced them, else keep first attempt's.
          skin_goal   = retry.plan.skin_goal   ?? skin_goal;
          avoid_today = retry.plan.avoid_today ?? avoid_today;
          coach_note  = retry.plan.coach_note  ?? coach_note;
        }
      }
    }

    if (ranked_items.length === 0) {
      return new Response(JSON.stringify({ error: 'Failed to parse response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deactivate old plans
    await supabaseClient
      .from('personalized_plans')
      .update({ is_active: false })
      .eq('user_id', skin.user_id);

    const empty = {};
    const { data: saved, error: saveErr } = await supabaseClient
      .from('personalized_plans')
      .insert({
        user_id: skin.user_id,
        skin_profile_id,
        products_pillar: empty,
        diet_pillar: empty,
        herbal_pillar: empty,
        lifestyle_pillar: empty,
        ranked_items,
        skin_goal,
        avoid_today,
        coach_note,
        is_active: true,
      })
      .select()
      .single();

    if (saveErr) {
      console.error('Save error:', saveErr);
      return new Response(JSON.stringify({
        error: `Failed to save plan — ${saveErr.message}`,
        details: saveErr.message,
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(saved), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
