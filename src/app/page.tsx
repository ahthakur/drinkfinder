"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CocktailResponse, DrinkResult, Filter, PartyResponse, SearchResponse } from "@/lib/types";

function StarRating({ rating, reviews }: { rating: number; reviews: number | null }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-xs">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? "text-amber-400" : half && i === full ? "text-amber-300" : "text-gray-200"}>
          ★
        </span>
      ))}
      <span className="text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      {reviews !== null && <span className="text-muted-foreground">({reviews.toLocaleString()})</span>}
    </span>
  );
}

function priceColor(price: number, allPrices: number[]): string {
  if (allPrices.length <= 1) return "text-emerald-600";
  const min = allPrices[0];
  const max = allPrices[allPrices.length - 1];
  const range = max - min;
  if (range === 0) return "text-emerald-600";
  const ratio = (price - min) / range;
  if (ratio <= 0.25) return "text-emerald-600";
  if (ratio <= 0.5) return "text-lime-600";
  if (ratio <= 0.75) return "text-amber-600";
  return "text-red-600";
}

function ResultCard({ result, rank, allPrices }: { result: DrinkResult; rank?: number; allPrices: number[] }) {
  const hasSale = result.saleTags.length > 0 || result.oldPrice !== null;
  const savings = result.oldPrice && result.price ? result.oldPrice - result.price : null;
  const pctOff = savings && result.oldPrice ? Math.round((savings / result.oldPrice) * 100) : null;
  const colorClass = result.price !== null ? priceColor(result.price, allPrices) : "";

  const Wrapper = result.link ? "a" : "div";
  const wrapperProps = result.link
    ? { href: result.link, target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper {...wrapperProps} className="block group">
      <Card className={`overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border-border/60 ${rank === 1 ? "ring-2 ring-emerald-400/50 border-emerald-200" : ""}`}>
        <CardContent className="flex gap-4 p-4">
          <div className="relative shrink-0">
            {result.thumbnail ? (
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-[72px] h-[72px] object-contain rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-1"
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-2xl">
                🍷
              </div>
            )}
            {rank === 1 && (
              <div className="absolute -top-1.5 -left-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                BEST
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
              {result.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">{result.source}</span>
              {result.distance && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {result.distance}
                  </span>
                </>
              )}
            </div>
            {result.rating !== null && (
              <StarRating rating={result.rating} reviews={result.reviews} />
            )}
          </div>

          <div className="shrink-0 text-right flex flex-col items-end justify-center gap-0.5">
            {result.price !== null ? (
              <span className={`text-xl font-bold tracking-tight ${colorClass}`}>
                ${result.price.toFixed(2)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Price N/A</span>
            )}
            {result.oldPrice !== null && (
              <span className="text-xs text-muted-foreground line-through">
                ${result.oldPrice.toFixed(2)}
              </span>
            )}
            {hasSale && pctOff ? (
              <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-1.5 py-0 font-bold">
                {pctOff}% OFF
              </Badge>
            ) : hasSale ? (
              <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-1.5 py-0 font-bold">
                SALE
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}

function ResultSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="flex gap-4 p-4">
        <Skeleton className="w-[72px] h-[72px] rounded-lg" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <div className="space-y-2 py-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResultCount({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
        {label}
      </h2>
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
        {count} {count === 1 ? "result" : "results"}
      </span>
    </div>
  );
}

interface ActiveFilter {
  type: string;
  text: string;
  shoprs: string;
}

function FilterSection({
  filter,
  active,
  onToggle,
}: {
  filter: Filter;
  active: Set<string>;
  onToggle: (shoprs: string, text: string, type: string) => void;
}) {
  const [expanded, setExpanded] = useState(filter.options.length <= 5);
  const visibleOptions = expanded ? filter.options : filter.options.slice(0, 5);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {filter.type}
      </h3>
      <div className="space-y-1">
        {visibleOptions.map((opt) => {
          if (!opt.shoprs) return null;
          const isActive = active.has(opt.shoprs);
          return (
            <button
              key={opt.shoprs}
              onClick={() => onToggle(opt.shoprs!, opt.text, filter.type)}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 font-medium"
                  : "hover:bg-muted/60 text-foreground/80"
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-border/80"
                }`}
              >
                {isActive && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {opt.text}
            </button>
          );
        })}
      </div>
      {!expanded && filter.options.length > 5 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium pl-2"
        >
          Show {filter.options.length - 5} more
        </button>
      )}
    </div>
  );
}

function FilterPanelContent({
  filters,
  activeShoprs,
  onToggle,
  onClear,
}: {
  filters: Filter[];
  activeShoprs: Set<string>;
  onToggle: (shoprs: string, text: string, type: string) => void;
  onClear: () => void;
}) {
  const toggleFilters = filters.filter((f) => f.inputType === "toggle");
  const sectionFilters = filters.filter((f) => f.inputType !== "toggle");

  return (
    <div className="space-y-5">
      {toggleFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {toggleFilters.map((f) => {
            const opt = f.options[0];
            if (!opt?.shoprs) return null;
            const isActive = activeShoprs.has(opt.shoprs);
            return (
              <button
                key={opt.shoprs}
                onClick={() => onToggle(opt.shoprs!, opt.text, f.type)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                  isActive
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "border-border/60 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {f.type === "Nearby" ? "📍 Nearby" : f.type === "On sale" ? "🏷️ On Sale" : f.type}
              </button>
            );
          })}
        </div>
      )}
      {sectionFilters.map((f) => (
        <FilterSection
          key={f.type}
          filter={f}
          active={activeShoprs}
          onToggle={onToggle}
        />
      ))}
      {activeShoprs.size > 0 && (
        <button
          onClick={onClear}
          className="text-xs text-red-500 hover:text-red-600 font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function PartyShoppingList({ party, cocktailName }: { party: PartyResponse; cocktailName: string }) {
  const storeGroups = new Map<string, { name: string; price: number; qty: number; bottleSize: string; ingredient: string; link: string | null }[]>();

  for (const ing of party.ingredients) {
    if (ing.product?.price != null) {
      const store = ing.product.source;
      if (!storeGroups.has(store)) storeGroups.set(store, []);
      storeGroups.get(store)!.push({
        name: ing.product.title,
        price: ing.product.price,
        qty: ing.bottlesNeeded,
        bottleSize: ing.bottleSize,
        ingredient: ing.name,
        link: ing.product.link,
      });
    }
  }

  if (storeGroups.size === 0) return null;

  const handleShare = () => {
    let text = `🍸 ${cocktailName} — Shopping List (${party.servings} drink${party.servings !== 1 ? "s" : ""})\n\n`;
    for (const [store, items] of storeGroups) {
      text += `📍 ${store}\n`;
      for (const item of items) {
        const qtyLabel = item.qty > 1 ? ` ×${item.qty}` : "";
        text += `  • ${item.name}${qtyLabel} — $${(item.price * item.qty).toFixed(2)}\n`;
      }
      text += "\n";
    }
    text += `Total: $${party.totalCost.toFixed(2)} ($${party.costPerDrink.toFixed(2)}/drink)`;

    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        navigator.clipboard.writeText(text);
      });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-0">
        <div className="p-4 pb-3 border-b border-border/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Shopping List</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="text-xs h-7 px-2 rounded-lg"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </Button>
        </div>

        <div className="px-4 py-3 border-b border-border/20 space-y-2">
          {party.ingredients.map((ing, i) => {
            const Wrapper = ing.product?.link ? "a" : "div";
            const wrapperProps = ing.product?.link
              ? { href: ing.product.link, target: "_blank" as const, rel: "noopener noreferrer" }
              : {};
            return (
              <Wrapper key={i} {...wrapperProps} className={`flex items-center justify-between text-sm ${ing.product?.link ? "hover:bg-muted/50 -mx-1 px-1 rounded transition-colors" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ing.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      need {ing.totalNeededDisplay}
                    </span>
                  </div>
                  {ing.product && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {ing.product.title.length > 45 ? ing.product.title.slice(0, 45) + "..." : ing.product.title}
                      {" · "}{ing.product.source}
                      {ing.product.distance && <span className="ml-1">· {ing.product.distance}</span>}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right ml-3">
                  {ing.totalPrice != null ? (
                    <div>
                      <span className="text-sm font-bold text-emerald-600">
                        ${ing.totalPrice.toFixed(2)}
                      </span>
                      {ing.bottlesNeeded > 1 && (
                        <div className="text-[10px] text-muted-foreground">
                          {ing.bottlesNeeded} × ${ing.product!.price!.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>

        {Array.from(storeGroups).map(([store, items]) => (
          <div key={store} className="px-4 py-2.5 border-b border-border/20">
            <div className="text-xs font-semibold text-foreground/60 mb-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {store}
            </div>
            {items.map((item, i) => {
              const ItemWrapper = item.link ? "a" : "div";
              const itemProps = item.link
                ? { href: item.link, target: "_blank" as const, rel: "noopener noreferrer" }
                : {};
              return (
                <ItemWrapper key={i} {...itemProps} className={`flex items-center justify-between py-1 text-sm ${item.link ? "hover:text-emerald-700 transition-colors" : ""}`}>
                  <span className="text-foreground/80">
                    {item.qty > 1 ? `${item.qty}× ` : ""}{item.name}
                  </span>
                  <span className="font-medium text-foreground/70">${(item.price * item.qty).toFixed(2)}</span>
                </ItemWrapper>
              );
            })}
          </div>
        ))}

        <div className="p-4 bg-emerald-50/50 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-bold text-emerald-700">${party.totalCost.toFixed(2)}</span>
            <span className="text-emerald-600/70 ml-1 text-xs">
              total · ${party.costPerDrink.toFixed(2)}/drink
            </span>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
            {party.servings} drink{party.servings !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function CocktailCard({ cocktail, location }: { cocktail: CocktailResponse; location: string }) {
  const [servings, setServings] = useState(1);
  const [partyData, setPartyData] = useState<PartyResponse | null>(null);
  const [partyLoading, setPartyLoading] = useState(false);

  const fetchParty = useCallback(async (count: number) => {
    if (count <= 1) {
      setPartyData(null);
      return;
    }
    setPartyLoading(true);
    try {
      const params = new URLSearchParams({ name: cocktail.name, servings: count.toString() });
      if (location) params.set("location", location);
      const res = await fetch(`/api/cocktail?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.party) setPartyData(data.party);
      }
    } catch { /* ignore */ }
    finally { setPartyLoading(false); }
  }, [cocktail.name, location]);

  const handleSetServings = (count: number) => {
    setServings(count);
    if (count <= 1) setPartyData(null);
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/60">
        <CardContent className="p-0">
          <div className="flex gap-4 p-4 pb-3 border-b border-border/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
            {cocktail.thumbnail && (
              <img
                src={cocktail.thumbnail}
                alt={cocktail.name}
                className="w-20 h-20 rounded-xl object-cover shadow-sm"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">{cocktail.name}</h2>
              {cocktail.searchedName && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Closest recipe for &ldquo;{cocktail.searchedName}&rdquo;
                </p>
              )}
              {cocktail.glass && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Served in a {cocktail.glass.toLowerCase()}
                </p>
              )}
            </div>
          </div>

          <div className="px-4 pt-3 pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-1">
              Ingredients
            </h3>
            {cocktail.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{ing.name}</span>
                    {ing.measure && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {ing.measure}
                      </span>
                    )}
                  </div>
                  {ing.cheapestProduct && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {ing.cheapestProduct.title.length > 40
                        ? ing.cheapestProduct.title.slice(0, 40) + "..."
                        : ing.cheapestProduct.title}
                      {" · "}
                      {ing.cheapestProduct.source}
                      {ing.cheapestProduct.distance && ` · ${ing.cheapestProduct.distance}`}
                    </div>
                  )}
                  {!ing.isAlcoholic && !ing.cheapestProduct && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic">
                      Available at any grocery store
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right ml-3">
                  {ing.cheapestProduct?.price != null ? (
                    <span className="text-sm font-bold text-emerald-600">
                      ${ing.cheapestProduct.price.toFixed(2)}
                    </span>
                  ) : ing.isAlcoholic ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {cocktail.totalCost != null && (
            <div className="mx-4 mb-3 mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 font-medium">Total Ingredient Cost</div>
                <div className="text-xs text-emerald-600/70 mt-0.5">
                  Cheapest bottles — makes multiple drinks
                </div>
              </div>
              <span className="text-xl font-bold text-emerald-700">
                ${cocktail.totalCost.toFixed(2)}
              </span>
            </div>
          )}

          <div className="px-4 pb-4 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-1.5">
              How to make it
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {cocktail.instructions}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/60 border-dashed border-2 border-amber-200/60 bg-amber-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                🎉 Party Mode
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                How many drinks? We&apos;ll find the best bottles.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetServings(Math.max(1, servings - 1))}
                className="w-8 h-8 p-0 rounded-lg text-lg"
                disabled={servings <= 1 || partyLoading}
              >
                −
              </Button>
              <span className="w-8 text-center font-bold text-lg">{servings}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetServings(servings + 1)}
                className="w-8 h-8 p-0 rounded-lg text-lg"
                disabled={partyLoading}
              >
                +
              </Button>
            </div>
          </div>
          {servings > 1 && (
            <Button
              className="w-full mt-3"
              onClick={() => fetchParty(servings)}
              disabled={partyLoading}
            >
              {partyLoading ? "Finding bottles..." : "Find bottles"}
            </Button>
          )}
        </CardContent>
      </Card>

      {partyLoading && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      )}

      {!partyLoading && partyData && (
        <PartyShoppingList party={partyData} cocktailName={cocktail.name} />
      )}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [locationDisplay, setLocationDisplay] = useState("Detecting location...");
  const [zipInput, setZipInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DrinkResult[]>([]);
  const [nearby, setNearby] = useState<DrinkResult[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [cocktail, setCocktail] = useState<CocktailResponse | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDisplay("Enter zip code");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            "";
          const state = data.address?.state || "";
          const zip = data.address?.postcode || "";
          if (city && state) {
            setLocation(`${city}, ${state}, United States`);
            setLocationDisplay(`${city}, ${state}${zip ? ` ${zip}` : ""}`);
          } else {
            setLocationDisplay("Enter zip code");
          }
        } catch {
          setLocationDisplay("Enter zip code");
        }
      },
      () => {
        setLocationDisplay("Enter zip code");
      }
    );
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const doSearch = useCallback(async (q: string, shoprs?: string) => {
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setCocktail(null);

    try {
      if (!shoprs) {
        const cocktailParams = new URLSearchParams({ name: q });
        if (location) cocktailParams.set("location", location);
        const cocktailRes = await fetch(`/api/cocktail?${cocktailParams.toString()}`);
        if (cocktailRes.ok) {
          const cocktailData = await cocktailRes.json();
          if (cocktailData.found) {
            setCocktail(cocktailData as CocktailResponse);
            setResults([]);
            setNearby([]);
            setFilters([]);
            setLoading(false);
            return;
          }
        }
      }

      const params = new URLSearchParams({ q });
      if (location) params.set("location", location);
      if (shoprs) params.set("shoprs", shoprs);
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Search failed");
      }
      const data: SearchResponse = await res.json();
      setResults(data.results);
      setNearby(data.nearby);
      if (!shoprs) {
        setFilters(data.filters);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setResults([]);
      setNearby([]);
    } finally {
      setLoading(false);
    }
  }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilters([]);
    doSearch(query.trim());
  };

  const handleLocationSubmit = () => {
    const zip = zipInput.trim();
    if (!zip) return;
    setLocation(zip);
    setLocationDisplay(zip);
    setDialogOpen(false);
    setZipInput("");
  };

  const handleFilterToggle = useCallback(
    (shoprs: string, text: string, type: string) => {
      setActiveFilters((prev) => {
        const exists = prev.find((f) => f.shoprs === shoprs);
        if (exists) {
          const next = prev.filter((f) => f.shoprs !== shoprs);
          if (next.length === 0) {
            doSearch(query.trim());
          } else {
            doSearch(query.trim(), next[next.length - 1].shoprs);
          }
          return next;
        }
        const next = [...prev, { type, text, shoprs }];
        doSearch(query.trim(), shoprs);
        return next;
      });
    },
    [doSearch, query]
  );

  const handleClearFilters = useCallback(() => {
    setActiveFilters([]);
    doSearch(query.trim());
  }, [doSearch, query]);

  const activeShoprsSet = new Set(activeFilters.map((f) => f.shoprs));

  const allPrices = [...nearby, ...results]
    .map((r) => r.price)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-8 flex flex-col gap-6">
      <header className="text-center pt-8 pb-2">
        <div className="inline-flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            D
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            DrinkFinder
          </h1>
        </div>
        <p className="text-muted-foreground text-xs">
          Compare real in-store prices from retailers near you
        </p>
      </header>

      <form onSubmit={handleSearch} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              type="text"
              placeholder='Try "riesling", "IPA", "Don Julio"...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-11 text-base rounded-xl border-border/60 focus:ring-emerald-500/20"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              "Search"
            )}
          </Button>
        </div>
      </form>

      <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <span>{locationDisplay}</span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="ml-1 text-emerald-600 hover:text-emerald-700 font-medium underline-offset-2 hover:underline">
            Change
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Your Location</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Zip code or city, state"
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLocationSubmit()}
                className="rounded-lg"
              />
              <Button onClick={handleLocationSubmit} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                Set
              </Button>
            </div>
            <button
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-2 flex items-center gap-1"
              onClick={() => {
                detectLocation();
                setDialogOpen(false);
              }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Use my current location
            </button>
          </DialogContent>
        </Dialog>
      </div>

      {searched && !loading && filters.length > 0 && (
        <div className="space-y-2">
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border/60 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilters.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {activeFilters.length}
                </span>
              )}
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">
                <FilterPanelContent
                  filters={filters}
                  activeShoprs={activeShoprsSet}
                  onToggle={(shoprs, text, type) => {
                    handleFilterToggle(shoprs, text, type);
                    setFilterSheetOpen(false);
                  }}
                  onClear={() => {
                    handleClearFilters();
                    setFilterSheetOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((f) => (
                <button
                  key={f.shoprs}
                  onClick={() => handleFilterToggle(f.shoprs, f.text, f.type)}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  {f.text}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
              <button
                onClick={handleClearFilters}
                className="text-xs text-muted-foreground hover:text-red-500 px-2 py-1 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <ResultSkeleton />
          <ResultSkeleton />
          <ResultSkeleton />
          <ResultSkeleton />
        </div>
      )}

      {error && (
        <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
          {error}
        </div>
      )}

      {!loading && !error && searched && cocktail && (
        <CocktailCard cocktail={cocktail} location={location} />
      )}

      {!loading && !error && searched && !cocktail && (
        <>
          {nearby.length > 0 && (
            <section className="space-y-3">
              <ResultCount count={nearby.length} label="In Stores Nearby" />
              {nearby.map((r, i) => (
                <ResultCard key={`nearby-${i}`} result={r} rank={i === 0 ? 1 : undefined} allPrices={allPrices} />
              ))}
            </section>
          )}

          {results.length > 0 && (
            <section className="space-y-3">
              <ResultCount count={results.length} label="All Results — By Price" />
              {results.map((r, i) => (
                <ResultCard key={`result-${i}`} result={r} rank={nearby.length === 0 && i === 0 ? 1 : undefined} allPrices={allPrices} />
              ))}
            </section>
          )}

          {results.length === 0 && nearby.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="text-4xl">🔍</div>
              <p className="text-sm text-muted-foreground">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">
                Try a broader search like &ldquo;wine&rdquo; or &ldquo;beer&rdquo;
              </p>
            </div>
          )}
        </>
      )}

      {!searched && !loading && (
        <div className="text-center py-16 space-y-4">
          <div className="text-5xl">🍺🍷🥃</div>
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground/80">
              What are you drinking tonight?
            </p>
            <p className="text-sm text-muted-foreground">
              Search any drink to compare prices at stores near you.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["riesling wine", "IPA beer", "bourbon", "espresso martini"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  setActiveFilters([]);
                  doSearch(suggestion);
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <footer className="text-center text-[11px] text-muted-foreground mt-auto pt-6 pb-2 space-y-0.5 border-t border-border/40">
        <p>Prices from Google Shopping. May vary in-store.</p>
        <p>You must be 21 or older to purchase alcohol.</p>
      </footer>
    </main>
  );
}
