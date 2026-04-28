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

    const { skin_profile_id } = await req.json();
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

═══ YOUR TASK ═══
Generate exactly 10 actionable recommendations — always include 6-7 PRODUCT picks, 1-2 diet, 1 herbal, 1 lifestyle:

PRODUCT picks: Clean/natural skincare only. Recommend specific natural ingredients — tallow balm, rosehip oil (natural vitamin A), willow bark (natural BHA), tea tree oil, bakuchiol, manuka honey, niacinamide in clean formulations, zinc oxide mineral SPF. Favor brands like Santa Cruz Paleo, Cocokind, Herbivore, OSEA, Pai, Badger, Weleda, True Botanicals. Prioritize product picks — this is a skincare app and topical interventions are the most actionable for the patient.

DIET picks: Whole-food nutrition categories — be broad and category-level, NOT specific foods. Say "omega-3 rich foods" not "salmon". Say "fermented foods" not "sauerkraut". Say "antioxidant-rich berries" not "blueberries". Use nutrient/category framing: collagen-building foods, anti-inflammatory omega-3 sources, gut-healing fermented foods, antioxidant-rich produce, blood-sugar-stabilising whole grains. Recommend eliminating: dairy, refined sugar, seed oils, processed foods, whey protein. Keep it approachable and non-prescriptive about specific foods.

HERBAL picks: Traditional herbs with real evidence + specific dosages. Spearmint tea (anti-androgen, 2 cups/day), ashwagandha (cortisol reduction), neem (Ayurvedic purification), triphala (digestive cleanse), manjistha (blood purifying), burdock root (liver + skin), holy basil/tulsi (adaptogen), turmeric + black pepper (anti-inflammatory), dandelion root (liver detox).

LIFESTYLE picks: Natural practices — morning sunlight 10-20 min (circadian reset + vitamin D), grounding/earthing barefoot on grass, cold showers or ice rolling (reduces inflammation), gua sha facial massage (lymphatic drainage), silk/satin pillowcase (less friction), breathwork or meditation (cortisol management), exercise (sweating = detox), clean water (filtered, no fluoride).

CRITICAL FORMAT RULES:
- "title": 1-3 words max
- "rationale": ultra-short action hint (e.g. "2 cups daily · anti-androgen")
- "time_of_day": assign based on what makes sense for this specific item — "morning", "midday", or "evening". Spread product picks intelligently across all three times (e.g. morning cleanser + SPF, midday mist, evening serum + moisturiser). Do NOT put all products in morning.
- "notes": an array of exactly 3 bullet strings. Each bullet MUST (a) name the patient's exact skin type / acne type / severity from the profile above, (b) explain the biological or nutritional mechanism connecting this pick to THAT specific condition, (c) NEVER repeat or paraphrase the rationale field. Be precise, personal, and brief — each bullet is one short punchy sentence, no more than 15 words.

BAD notes (do NOT do this): ["Rosehip oil is great for your skin.", "It helps with acne.", "Use it nightly."] — too vague, repeats rationale, doesn't mention their specific condition.
GOOD notes: ["Your hormonal acne triggers excess sebum via androgens — rosehip's trans-retinoic acid directly normalises sebocyte output at the follicle.", "Unlike synthetic retinoids, it won't disrupt your combination skin barrier or trigger the inflammation that worsens your breakouts.", "The linoleic acid in rosehip also corrects the fatty-acid deficiency common in acne-prone skin."]

Example items:
{"pillar":"product","title":"Rosehip oil","rationale":"Natural vitamin A alt · nightly","notes":["Your hormonal acne triggers excess sebum via androgens — rosehip's trans-retinoic acid directly normalises sebocyte output at the follicle.","Unlike synthetic retinoids, it won't disrupt your combination skin barrier or trigger inflammation that worsens your breakouts.","The linoleic acid in rosehip corrects the fatty-acid deficiency that is consistently elevated in acne-prone skin."],"impact_rank":1}
{"pillar":"diet","title":"Bone broth","rationale":"1 cup daily · collagen + gut healing","notes":["Your inflammatory acne is linked to intestinal permeability — a leaky gut floods your bloodstream with endotoxins that spike skin inflammation.","Bone broth's glycine and glutamine tighten tight-junction proteins in the intestinal wall, cutting off this inflammatory trigger at source.","Collagen peptides also support your skin's own structural repair, reducing the scarring severity common with your acne type."],"impact_rank":2}

Return ONLY a JSON array. No markdown. No explanation. No backticks.
[{"pillar":"...","title":"...","rationale":"...","time_of_day":"morning","notes":["...","...","..."],"impact_rank":1}, ...10 items]

pillar values: product | diet | herbal | lifestyle
time_of_day values: morning | midday | evening
Exactly 10 items. 6-7 must be product pillar, spread across morning/midday/evening. impact_rank 1 = highest priority. notes field is REQUIRED and must be personalised to this patient's exact profile.`;

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

    async function callGemini(extraInstruction = ''): Promise<{ items: any[] | null; error?: string }> {
      const body: any = {
        contents: [{ parts: [{ text: extraInstruction ? `${prompt}\n\nCRITICAL: ${extraInstruction}` : prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) return { items: null, error: await r.text() };

      const g = await r.json();
      const t = g.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!t) return { items: null, error: `Empty response (finishReason: ${g.candidates?.[0]?.finishReason ?? 'unknown'})` };

      console.log('[generate-plan] Gemini raw text (first 600):', t.substring(0, 600));

      let parsed: any;
      try { parsed = JSON.parse(t); } catch {
        console.warn('[generate-plan] Direct JSON.parse failed — attempting object extraction');
        parsed = extractObjects(t);
      }

      if (!Array.isArray(parsed)) {
        const candidate = parsed?.ranked_items ?? parsed?.items ?? parsed?.recommendations;
        if (Array.isArray(candidate)) parsed = candidate; else return { items: null, error: 'Response is not a JSON array' };
      }

      const items = parsed.filter(
        (item: any) => item && typeof item === 'object' && item.pillar && item.title && item.rationale
      );
      return { items };
    }

    // ── First attempt ──
    let ranked_items: any[] | null = null;
    const first = await callGemini();
    if (!first.items || first.items.length === 0) {
      console.error('First Gemini call failed:', first.error);
      return new Response(JSON.stringify({ error: 'Failed to generate plan', details: first.error }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    ranked_items = first.items;

    // ── Check all 4 pillars present; retry once if not ──
    const missing = missingPillars(ranked_items);
    if (missing.length > 0) {
      console.warn('[generate-plan] Missing pillars after first attempt:', missing, '— retrying');
      const retry = await callGemini(
        `The previous response was MISSING items for these pillars: ${missing.join(', ')}. You MUST include at least one item for EVERY pillar: product, diet, herbal, lifestyle. No exceptions.`
      );
      if (retry.items && retry.items.length > 0) {
        // Merge: keep retry result but backfill any still-missing pillars from the first attempt
        const retryMissing = missingPillars(retry.items);
        if (retryMissing.length < missing.length) {
          ranked_items = retry.items;
          // If retry still missing some, backfill from first attempt
          for (const pillar of missingPillars(ranked_items)) {
            const fallback = first.items.find((i: any) => i.pillar === pillar);
            if (fallback) ranked_items.push(fallback);
          }
        }
        // else retry made things worse — keep original
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
        is_active: true,
      })
      .select()
      .single();

    if (saveErr) {
      console.error('Save error:', saveErr);
      return new Response(JSON.stringify({ error: 'Failed to save plan', details: saveErr.message }), {
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
