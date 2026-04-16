import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CACHE_TTL_HOURS = 24;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ products: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const b64 = Deno.env.get('DATAFORSEO_B64');
    if (!b64) {
      return new Response(JSON.stringify({ error: 'DATAFORSEO_B64 not set', products: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedQuery = query.trim().toLowerCase();

    // ── Check Supabase cache first ────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const cacheKey = `search:${normalizedQuery}`;
    let cacheEnabled = true;
    try {
      const { data: cached } = await supabase
        .from('search_cache')
        .select('results, created_at')
        .eq('query', cacheKey)
        .maybeSingle();

      if (cached) {
        const ageHours = (Date.now() - new Date(cached.created_at).getTime()) / 3600000;
        if (ageHours < CACHE_TTL_HOURS) {
          console.log('[search] cache hit:', normalizedQuery);
          return new Response(JSON.stringify({ products: cached.results, cached: true }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch {
      cacheEnabled = false; // table doesn't exist yet, skip caching
    }

    // ── Try DataForSEO first, fall back to Rainforest ───────────────────
    console.log('[search] calling DataForSEO for:', normalizedQuery);

    let products: any[] = [];

    try {
      const dfsRes = await fetch(
        'https://api.dataforseo.com/v3/merchant/amazon/products/live/advanced',
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${b64}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{
            keyword: query.trim(),
            location_code: 2840,
            language_code: 'en',
            se_domain: 'amazon.com',
            depth: 20,
          }]),
        }
      );

      if (dfsRes.ok) {
        const dfsData = await dfsRes.json();
        if (dfsData.status_code === 20000) {
          const items = dfsData.tasks?.[0]?.result?.[0]?.items ?? [];
          products = items
            .filter((item: any) => item.title && item.image_url && item.asin)
            .slice(0, 20)
            .map((item: any) => ({
              id: `dfs-${item.asin}`,
              asin: item.asin,
              brand: item.brand || extractBrand(item.title),
              name: item.title,
              category: guessCategory(item.title),
              image_url: item.image_url,
              price: item.price_from ? `$${Number(item.price_from).toFixed(2)}` : '',
              price_numeric: item.price_from || 0,
              rating: item.rating?.value || 0,
              reviews: item.rating?.votes_count || 0,
              description: '',
              match_percent: 85,
            }));
          console.log('[search] DataForSEO returned', products.length, 'products');
        } else {
          console.warn('[search] DataForSEO status:', dfsData.status_code, dfsData.status_message, '— falling back to Rainforest');
        }
      }
    } catch (err) {
      console.warn('[search] DataForSEO error, falling back to Rainforest:', err);
    }

    // ── Rainforest fallback ──────────────────────────────────────────────
    if (products.length === 0) {
      const rfKey = Deno.env.get('RAINFOREST_API_KEY');
      if (rfKey) {
        console.log('[search] falling back to Rainforest');
        const rfUrl = `https://api.rainforestapi.com/request?` + new URLSearchParams({
          api_key: rfKey,
          type: 'search',
          amazon_domain: 'amazon.com',
          search_term: query.trim(),
        });
        const rfRes = await fetch(rfUrl);
        if (rfRes.ok) {
          const rfData = await rfRes.json();
          const raw = rfData.search_results ?? [];
          products = raw
            .filter((item: any) => item && typeof item === 'object' && item.asin && item.title)
            .slice(0, 20)
            .map((item: any) => {
              const rawImg = typeof item.image === 'string'
                ? item.image
                : (item.image?.link || item.main_image?.link || '');
              return {
                id: `rf-${item.asin}`,
                asin: item.asin,
                brand: item.brand || extractBrand(item.title),
                name: item.title,
                category: guessCategory(item.title),
                image_url: rawImg.replace(/\._[A-Z0-9_,]+_\./, '._SL1500_.'),
                price: item.price?.raw || '',
                price_numeric: item.price?.value || 0,
                rating: item.rating || 0,
                reviews: item.ratings_total || 0,
                description: '',
                match_percent: 85,
              };
            })
            .filter((p: any) => p.image_url);
          console.log('[search] Rainforest returned', products.length, 'products');
        }
      }
    }

    // ── Save to cache ────────────────────────────────────────────────────
    if (products.length > 0 && cacheEnabled) {
      try {
        await supabase
          .from('search_cache')
          .upsert({ query: cacheKey, results: products, created_at: new Date().toISOString() }, { onConflict: 'query' });
      } catch {
        // cache write failed, non-fatal
      }
    }

    return new Response(JSON.stringify({ products }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('search-products error:', err);
    return new Response(JSON.stringify({ products: [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function guessCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.match(/cleanser|moistur|serum|spf|sunscreen|toner|retinol|cream|lotion|face|skin|oil|balm/)) return 'Skincare';
  if (t.match(/vitamin|omega|zinc|magnesium|biotin|supplement|capsule|probiotic|collagen/)) return 'Supplements';
  if (t.match(/tea|turmeric|ashwagandha|herb|neem|extract|adaptogen/)) return 'Herbal';
  if (t.match(/pillow|towel|silk|satin|roller|gua sha|brush|tool/)) return 'Accessories';
  return 'Skincare';
}

function extractBrand(title: string): string {
  return title.split(' ')[0] || '';
}
