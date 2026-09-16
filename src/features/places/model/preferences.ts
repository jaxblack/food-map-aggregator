import type { Place, ProviderId } from "@/features/places/model/types";

export const PREFERENCES_STORAGE_KEY = "food-map.preferences.v1";

export const RADIUS_OPTIONS = [1, 3, 5, 10] as const;
export type RadiusKm = (typeof RADIUS_OPTIONS)[number];
export type SortField = "distance" | "rating" | "price";
export type SortDirection = "asc" | "desc";

export interface PlacePreferences {
  radiusKm: RadiusKm;
  cuisines: string[];
  sortField: SortField;
  sortDirection: SortDirection;
  providerOrder: ProviderId[];
}

export const DEFAULT_PROVIDER_ORDER: ProviderId[] = [
  "meituan",
  "eleme",
  "douyin",
  "amap",
];

export const DEFAULT_PREFERENCES: PlacePreferences = {
  radiusKm: 3,
  cuisines: [],
  sortField: "distance",
  sortDirection: "asc",
  providerOrder: DEFAULT_PROVIDER_ORDER,
};

const SORT_FIELDS: SortField[] = ["distance", "rating", "price"];
const SORT_DIRECTIONS: SortDirection[] = ["asc", "desc"];

function hasExactProviders(value: unknown): value is ProviderId[] {
  return (
    Array.isArray(value) &&
    value.length === DEFAULT_PROVIDER_ORDER.length &&
    DEFAULT_PROVIDER_ORDER.every((provider) => value.includes(provider)) &&
    new Set(value).size === value.length
  );
}

export function loadPreferences(
  storage: Pick<Storage, "getItem">,
): PlacePreferences {
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(PREFERENCES_STORAGE_KEY) ?? "null",
    );
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_PREFERENCES;
    }

    const value = parsed as Partial<PlacePreferences>;
    return {
      radiusKm: RADIUS_OPTIONS.includes(value.radiusKm as RadiusKm)
        ? (value.radiusKm as RadiusKm)
        : DEFAULT_PREFERENCES.radiusKm,
      cuisines: Array.isArray(value.cuisines)
        ? value.cuisines.filter(
            (cuisine): cuisine is string =>
              typeof cuisine === "string" && cuisine.length > 0,
          )
        : [],
      sortField: SORT_FIELDS.includes(value.sortField as SortField)
        ? (value.sortField as SortField)
        : DEFAULT_PREFERENCES.sortField,
      sortDirection: SORT_DIRECTIONS.includes(
        value.sortDirection as SortDirection,
      )
        ? (value.sortDirection as SortDirection)
        : DEFAULT_PREFERENCES.sortDirection,
      providerOrder: hasExactProviders(value.providerOrder)
        ? value.providerOrder
        : DEFAULT_PROVIDER_ORDER,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(
  storage: Pick<Storage, "setItem">,
  preferences: PlacePreferences,
): void {
  storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export function moveProvider(
  order: ProviderId[],
  provider: ProviderId,
  offset: -1 | 1,
): ProviderId[] {
  const currentIndex = order.indexOf(provider);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) {
    return order;
  }

  const next = [...order];
  [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
  return next;
}

export function sortPlaces(
  places: Place[],
  field: SortField,
  direction: SortDirection,
): Place[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...places].sort((left, right) => {
    const leftValue =
      field === "distance"
        ? (left.distanceMeters ?? Number.POSITIVE_INFINITY)
        : field === "rating"
          ? left.rating
          : left.priceLevel;
    const rightValue =
      field === "distance"
        ? (right.distanceMeters ?? Number.POSITIVE_INFINITY)
        : field === "rating"
          ? right.rating
          : right.priceLevel;
    return (leftValue - rightValue) * multiplier || left.name.localeCompare(right.name);
  });
}
