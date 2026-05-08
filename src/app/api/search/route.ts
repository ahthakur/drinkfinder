import { NextRequest } from "next/server";
import type { DrinkResult, Filter, SearchResponse } from "@/lib/types";

interface CacheEntry {
  data: SearchResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const EXPOSED_FILTER_TYPES = new Set([
  "price",
  "wine sweetness",
  "country of origin",
  "stores",
  "color",
  "brand",
  "features",
]);

function parseDrinkResult(item: Record<string, unknown>): DrinkResult {
  const extensions = (item.extensions as string[]) || [];
  const distance =
    extensions.find(
      (e) => e.includes("mi") || e.includes("mile") || e.includes("Nearby")
    ) || null;
  const saleTags = extensions.filter(
    (e) => e.toLowerCase().includes("sale") || e.toLowerCase().includes("off")
  );

  const tag = item.tag as string | undefined;
  if (tag) saleTags.push(tag);

  return {
    title: (item.title as string) || "",
    price: (item.extracted_price as number) ?? null,
    oldPrice: (item.extracted_old_price as number) ??
      (typeof item.old_price === "string"
        ? parseFloat(item.old_price.replace(/[^0-9.]/g, "")) || null
        : null),
    source: (item.source as string) || "",
    rating: (item.rating as number) ?? null,
    reviews: (item.reviews as number) ?? null,
    distance,
    saleTags,
    thumbnail: (item.thumbnail as string) || null,
    link: (item.product_link as string) || (item.link as string) || null,
  };
}

function extractShoprs(serpApiLink: string): string | null {
  try {
    const url = new URL(serpApiLink);
    return url.searchParams.get("shoprs");
  } catch {
    return null;
  }
}

function parseFilters(
  rawFilters: Record<string, unknown>[]
): Filter[] {
  const filters: Filter[] = [];

  for (const f of rawFilters) {
    const type = (f.type as string) || "";
    const inputType = (f.input_type as string) || "";

    // Top-level quick filters (Nearby, On sale, etc.)
    if (!type && inputType === "link_with_icon") {
      const opts = (f.options as Record<string, unknown>[]) || [];
      for (const o of opts) {
        const text = (o.text as string) || "";
        const lower = text.toLowerCase();
        if (lower === "nearby" || lower === "on sale") {
          filters.push({
            type: text,
            inputType: "toggle",
            options: [{ text, shoprs: extractShoprs((o.serpapi_link as string) || "") }],
          });
        }
      }
      continue;
    }

    if (!EXPOSED_FILTER_TYPES.has(type.toLowerCase())) continue;

    const options = ((f.options as Record<string, unknown>[]) || []).map((o) => ({
      text: (o.text as string) || "",
      shoprs: extractShoprs((o.serpapi_link as string) || ""),
    }));

    if (options.length > 0) {
      filters.push({ type, inputType, options });
    }
  }

  return filters;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const location = searchParams.get("location");
  const shoprs = searchParams.get("shoprs");

  if (!query) {
    return Response.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const cacheKey = `${query}:${location || ""}:${shoprs || ""}`.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Response.json(cached.data);
  }

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    gl: "us",
    hl: "en",
    api_key: apiKey,
  });
  if (location) {
    params.set("location", location);
  }
  if (shoprs) {
    params.set("shoprs", shoprs);
  }

  try {
    const res = await fetch(`https://serpapi.com/search?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `SerpApi error: ${res.status}`, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();

    const allResults = (
      (data.shopping_results as Record<string, unknown>[]) || []
    ).map(parseDrinkResult);

    const shoppingResults = allResults
      .sort((a, b) => {
        const aLocal = a.distance !== null ? 0 : 1;
        const bLocal = b.distance !== null ? 0 : 1;
        if (aLocal !== bLocal) return aLocal - bLocal;
        return (a.price ?? Infinity) - (b.price ?? Infinity);
      });

    let nearby: DrinkResult[] = [];
    const categorized =
      (data.categorized_shopping_results as Record<string, unknown>[]) || [];
    for (const section of categorized) {
      if (
        typeof section.title === "string" &&
        section.title.toLowerCase().includes("nearby")
      ) {
        nearby = (
          (section.shopping_results as Record<string, unknown>[]) || []
        )
          .map(parseDrinkResult)
          .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        break;
      }
    }

    const filters = parseFilters(
      (data.filters as Record<string, unknown>[]) || []
    );

    const response: SearchResponse = {
      results: shoppingResults,
      nearby,
      query,
      location: location || "",
      filters,
    };

    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return Response.json(response);
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch results", details: String(err) },
      { status: 500 }
    );
  }
}
