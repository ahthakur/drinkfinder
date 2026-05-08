import { NextRequest } from "next/server";
import type { CocktailIngredient, CocktailResponse, DrinkResult, PartyIngredient, PartyResponse } from "@/lib/types";

interface CacheEntry {
  data: CocktailResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const partyCacheMap = new Map<string, { data: PartyResponse; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

const NON_ALCOHOLIC = new Set([
  "sugar syrup", "simple syrup", "syrup", "sugar",
  "lime juice", "lemon juice", "orange juice", "cranberry juice",
  "grapefruit juice", "pineapple juice", "tomato juice", "apple juice",
  "lime", "lemon", "orange", "mint", "ice",
  "cream", "milk", "coconut milk", "coconut cream",
  "coffee", "espresso", "hot chocolate",
  "soda water", "club soda", "tonic water", "ginger ale", "ginger beer",
  "cola", "coke", "sprite", "7-up", "lemonade",
  "grenadine", "bitters", "angostura bitters",
  "salt", "pepper", "tabasco", "worcestershire sauce",
  "egg white", "egg yolk", "egg",
  "water", "honey", "agave syrup", "maple syrup",
  "whipped cream", "nutmeg", "cinnamon", "cocoa powder",
  "olive", "cherry", "maraschino cherry",
]);

const BOTTLE_SIZES_ML = [375, 750, 1000, 1750];

function isAlcoholic(ingredient: string): boolean {
  return !NON_ALCOHOLIC.has(ingredient.toLowerCase().trim());
}

function parseMeasureToMl(measure: string): number | null {
  if (!measure) return null;
  const lower = measure.toLowerCase().trim();

  let num: number;
  const mixedMatch = lower.match(/^(\d+)\s+(\d+)\/(\d+)/);
  const fracMatch = lower.match(/^(\d+)\/(\d+)/);
  const numMatch = lower.match(/^([\d.]+)/);

  if (mixedMatch) {
    num = parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  } else if (fracMatch) {
    num = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  } else if (numMatch) {
    num = parseFloat(numMatch[1]);
  } else {
    return null;
  }

  if (lower.includes("cl")) return num * 10;
  if (lower.includes("ml")) return num;
  if (lower.includes("oz")) return num * 29.57;
  if (lower.includes("shot")) return num * 44;
  if (lower.includes("jigger")) return num * 44;
  if (lower.includes("cup")) return num * 236;
  if (lower.includes("tsp") || lower.includes("teaspoon")) return num * 5;
  if (lower.includes("tbsp") || lower.includes("tablespoon")) return num * 15;
  if (lower.includes("dash")) return num * 1;
  if (lower.includes("drop")) return num * 0.5;
  if (lower.includes("splash")) return num * 5;
  if (lower.includes("part")) return num * 30;

  return num * 29.57;
}

function formatMl(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${Math.round(ml)}ml`;
}

function bottleSizeLabel(ml: number): string {
  if (ml === 375) return "375ml";
  if (ml === 750) return "750ml";
  if (ml === 1000) return "1L";
  if (ml === 1750) return "1.75L";
  return `${ml}ml`;
}

function bestBottleSize(totalNeededMl: number): number {
  for (const size of BOTTLE_SIZES_ML) {
    if (size >= totalNeededMl) return size;
  }
  return BOTTLE_SIZES_ML[BOTTLE_SIZES_ML.length - 1];
}

function parseResultBottleMl(title: string): number | null {
  const lower = title.toLowerCase();
  const literMatch = lower.match(/([\d.]+)\s*l(?:iter|itre)?(?:\b|$)/);
  if (literMatch) {
    const val = parseFloat(literMatch[1]);
    if (val > 0 && val <= 5) return val * 1000;
  }
  const mlMatch = lower.match(/([\d,]+)\s*ml/);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1].replace(",", ""));
    if (val > 0) return val;
  }
  return null;
}

async function fetchCheapestProduct(
  query: string,
  location: string,
  apiKey: string
): Promise<DrinkResult | null> {
  const searchQuery = location ? `${query} near me` : query;
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: searchQuery,
    gl: "us",
    hl: "en",
    api_key: apiKey,
  });
  if (location) params.set("location", location);

  try {
    const res = await fetch(`https://serpapi.com/search?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data.shopping_results as Record<string, unknown>[]) || [];
    if (results.length === 0) return null;

    let localBest: Record<string, unknown> | null = null;
    let localBestPrice = Infinity;
    let onlineBest: Record<string, unknown> | null = null;
    let onlineBestPrice = Infinity;

    for (const item of results) {
      const price = item.extracted_price as number | undefined;
      if (price == null) continue;
      const extensions = (item.extensions as string[]) || [];
      const isLocal = extensions.some(
        (e) => e.includes("mi") || e.includes("mile") || e.includes("Nearby")
      );
      if (isLocal && price < localBestPrice) {
        localBestPrice = price;
        localBest = item;
      } else if (!isLocal && price < onlineBestPrice) {
        onlineBestPrice = price;
        onlineBest = item;
      }
    }

    const cheapest = localBest || onlineBest;
    if (!cheapest) return null;

    const extensions = (cheapest.extensions as string[]) || [];
    const distance =
      extensions.find(
        (e) => e.includes("mi") || e.includes("mile") || e.includes("Nearby")
      ) || null;

    return {
      title: (cheapest.title as string) || "",
      price: (cheapest.extracted_price as number) ?? null,
      oldPrice: null,
      source: (cheapest.source as string) || "",
      rating: (cheapest.rating as number) ?? null,
      reviews: (cheapest.reviews as number) ?? null,
      distance,
      saleTags: [],
      thumbnail: (cheapest.thumbnail as string) || null,
      link: (cheapest.product_link as string) || (cheapest.link as string) || null,
    };
  } catch {
    return null;
  }
}

async function fetchBestBottle(
  ingredient: string,
  targetSizeMl: number,
  location: string,
  apiKey: string
): Promise<DrinkResult | null> {
  const sizeLabel = bottleSizeLabel(targetSizeMl);
  const query = location ? `${ingredient} ${sizeLabel} near me` : `${ingredient} ${sizeLabel}`;

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    gl: "us",
    hl: "en",
    api_key: apiKey,
  });
  if (location) params.set("location", location);

  try {
    const res = await fetch(`https://serpapi.com/search?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data.shopping_results as Record<string, unknown>[]) || [];
    if (results.length === 0) return null;

    let localSizeMatch: Record<string, unknown> | null = null;
    let localSizePrice = Infinity;
    let localFallback: Record<string, unknown> | null = null;
    let localFallbackPrice = Infinity;
    let onlineSizeMatch: Record<string, unknown> | null = null;
    let onlineSizePrice = Infinity;
    let onlineFallback: Record<string, unknown> | null = null;
    let onlineFallbackPrice = Infinity;

    for (const item of results) {
      const price = item.extracted_price as number | undefined;
      if (price == null) continue;
      const title = (item.title as string) || "";
      const bottleMl = parseResultBottleMl(title);
      const extensions = (item.extensions as string[]) || [];
      const isLocal = extensions.some(
        (e) => e.includes("mi") || e.includes("mile") || e.includes("Nearby")
      );
      const sizeMatch = bottleMl && bottleMl >= targetSizeMl * 0.9 && bottleMl <= targetSizeMl * 1.5;

      if (isLocal) {
        if (sizeMatch && price < localSizePrice) { localSizePrice = price; localSizeMatch = item; }
        if (price < localFallbackPrice) { localFallbackPrice = price; localFallback = item; }
      } else {
        if (sizeMatch && price < onlineSizePrice) { onlineSizePrice = price; onlineSizeMatch = item; }
        if (price < onlineFallbackPrice) { onlineFallbackPrice = price; onlineFallback = item; }
      }
    }

    const chosen = localSizeMatch || localFallback || onlineSizeMatch || onlineFallback;
    if (!chosen) return null;

    const extensions = (chosen.extensions as string[]) || [];
    const distance =
      extensions.find(
        (e) => e.includes("mi") || e.includes("mile") || e.includes("Nearby")
      ) || null;

    return {
      title: (chosen.title as string) || "",
      price: (chosen.extracted_price as number) ?? null,
      oldPrice: null,
      source: (chosen.source as string) || "",
      rating: (chosen.rating as number) ?? null,
      reviews: (chosen.reviews as number) ?? null,
      distance,
      saleTags: [],
      thumbnail: (chosen.thumbnail as string) || null,
      link: (chosen.product_link as string) || (chosen.link as string) || null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get("name");
  const location = searchParams.get("location") || "";
  const servings = parseInt(searchParams.get("servings") || "1", 10);

  if (!name) {
    return Response.json({ error: "Parameter 'name' is required" }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  // Base cocktail lookup (servings=1)
  const baseCacheKey = `cocktail:${name}:${location}`.toLowerCase();
  let baseData: CocktailResponse;

  const cached = cache.get(baseCacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    baseData = cached.data;
  } else {
    try {
      const cocktailRes = await fetch(
        `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`
      );
      if (!cocktailRes.ok) {
        return Response.json({ error: "Failed to fetch cocktail recipe" }, { status: 502 });
      }

      const cocktailData = await cocktailRes.json();
      const drinks = cocktailData.drinks;

      if (!drinks || drinks.length === 0) {
        return Response.json({ found: false });
      }

      const drink = drinks[0];
      const rawIngredients: { name: string; measure: string }[] = [];

      for (let i = 1; i <= 15; i++) {
        const ing = drink[`strIngredient${i}`];
        const meas = drink[`strMeasure${i}`];
        if (ing && ing.trim()) {
          rawIngredients.push({
            name: ing.trim(),
            measure: meas ? meas.trim() : "",
          });
        }
      }

      const ingredients: CocktailIngredient[] = await Promise.all(
        rawIngredients.map(async ({ name: ingName, measure }) => {
          const alcoholic = isAlcoholic(ingName);
          let cheapestProduct: DrinkResult | null = null;

          if (alcoholic) {
            cheapestProduct = await fetchCheapestProduct(ingName, location, apiKey);
          }

          return {
            name: ingName,
            measure,
            isAlcoholic: alcoholic,
            cheapestProduct,
          };
        })
      );

      const pricedIngredients = ingredients.filter((i) => i.cheapestProduct?.price != null);
      const totalCost =
        pricedIngredients.length > 0
          ? pricedIngredients.reduce((sum, i) => sum + (i.cheapestProduct!.price!), 0)
          : null;

      baseData = {
        name: drink.strDrink || name,
        glass: drink.strGlass || "",
        instructions: drink.strInstructions || "",
        thumbnail: drink.strDrinkThumb || null,
        ingredients,
        totalCost,
        costPerDrink: totalCost,
      };

      cache.set(baseCacheKey, { data: baseData, timestamp: Date.now() });
    } catch (err) {
      return Response.json(
        { error: "Failed to fetch cocktail data", details: String(err) },
        { status: 500 }
      );
    }
  }

  // If servings <= 1, return base cocktail data
  if (servings <= 1) {
    return Response.json({ found: true, ...baseData });
  }

  // Party mode: find best bottles for the needed quantities
  const partyCacheKey = `party:${name}:${location}:${servings}`.toLowerCase();
  const partyCached = partyCacheMap.get(partyCacheKey);
  if (partyCached && Date.now() - partyCached.timestamp < CACHE_TTL) {
    return Response.json({ found: true, ...baseData, party: partyCached.data });
  }

  const partyIngredients: PartyIngredient[] = await Promise.all(
    baseData.ingredients
      .filter((ing) => ing.isAlcoholic)
      .map(async (ing) => {
        const perServingMl = parseMeasureToMl(ing.measure);
        const totalNeededMl = perServingMl ? perServingMl * servings : 0;
        const targetSize = totalNeededMl > 0 ? bestBottleSize(totalNeededMl) : 750;
        const bottlesNeeded = totalNeededMl > 0 ? Math.ceil(totalNeededMl / targetSize) : 1;

        const product = await fetchBestBottle(ing.name, targetSize, location, apiKey);

        return {
          name: ing.name,
          totalNeededMl: Math.round(totalNeededMl),
          totalNeededDisplay: totalNeededMl > 0 ? formatMl(totalNeededMl) : ing.measure,
          bottleSize: bottleSizeLabel(targetSize),
          bottlesNeeded,
          product,
          totalPrice: product?.price ? product.price * bottlesNeeded : null,
        };
      })
  );

  const totalCost = partyIngredients.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);

  const partyData: PartyResponse = {
    servings,
    ingredients: partyIngredients,
    totalCost,
    costPerDrink: servings > 0 ? totalCost / servings : totalCost,
  };

  partyCacheMap.set(partyCacheKey, { data: partyData, timestamp: Date.now() });

  return Response.json({ found: true, ...baseData, party: partyData });
}
