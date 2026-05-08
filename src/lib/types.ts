export interface DrinkResult {
  title: string;
  price: number | null;
  oldPrice: number | null;
  source: string;
  rating: number | null;
  reviews: number | null;
  distance: string | null;
  saleTags: string[];
  thumbnail: string | null;
  link: string | null;
}

export interface FilterOption {
  text: string;
  shoprs: string | null;
}

export interface Filter {
  type: string;
  inputType: string;
  options: FilterOption[];
}

export interface SearchResponse {
  results: DrinkResult[];
  nearby: DrinkResult[];
  query: string;
  location: string;
  filters: Filter[];
}

export interface CocktailIngredient {
  name: string;
  measure: string;
  isAlcoholic: boolean;
  cheapestProduct: DrinkResult | null;
}

export interface PartyIngredient {
  name: string;
  totalNeededMl: number;
  totalNeededDisplay: string;
  bottleSize: string;
  bottlesNeeded: number;
  product: DrinkResult | null;
  totalPrice: number | null;
}

export interface PartyResponse {
  servings: number;
  ingredients: PartyIngredient[];
  totalCost: number;
  costPerDrink: number;
}

export interface CocktailResponse {
  name: string;
  glass: string;
  instructions: string;
  thumbnail: string | null;
  ingredients: CocktailIngredient[];
  totalCost: number | null;
  costPerDrink: number | null;
}
