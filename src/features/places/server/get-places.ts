import type {
  Coordinates,
  PlaceFilters,
  PlacesResponse,
  ProviderStatus,
  SourceMode,
} from "@/features/places/model/types";
import { aggregatePlaces } from "./aggregate";
import { isValidCoordinates } from "./geo";
import { createAmapProvider } from "./providers/amap";
import { DEMO_PROVIDERS } from "./providers/demo";

export const DEFAULT_CENTER: Coordinates = {
  latitude: 22.3005,
  longitude: 114.1722,
};
export const DEFAULT_RADIUS_METERS = 3_000;
export const DEFAULT_RESULT_LIMIT = 20;
export const MAX_RESULT_LIMIT = 25;

export interface GetPlacesOptions extends PlaceFilters {
  center?: Coordinates;
  radiusMeters?: number;
  limit?: number;
  amapApiKey?: string;
  fetcher?: typeof fetch;
}

export function isSourceMode(value: string | null): value is SourceMode {
  return value === "demo" || value === "live";
}

function aggregateStatus(statuses: ProviderStatus[]): ProviderStatus {
  const ready = statuses.filter((status) => status.state === "ready");
  const errors = statuses.filter((status) => status.state === "error");
  return {
    provider: "aggregation",
    state: ready.length > 0 ? "ready" : errors.length > 0 ? "error" : "unavailable",
    resultCount: statuses.reduce(
      (total, status) => total + (status.resultCount ?? 0),
      0,
    ),
    message: statuses
      .map((status) => `${status.provider}: ${status.message}`)
      .join(" | "),
  };
}

export async function getPlaces(
  sourceMode: SourceMode = "demo",
  options: GetPlacesOptions = {},
): Promise<PlacesResponse> {
  const center = options.center ?? DEFAULT_CENTER;
  if (!isValidCoordinates(center)) {
    throw new RangeError("Invalid center coordinates.");
  }

  const query = {
    center,
    radiusMeters: Math.min(
      Math.max(options.radiusMeters ?? DEFAULT_RADIUS_METERS, 1),
      DEFAULT_RADIUS_METERS,
    ),
    limit: Math.min(
      Math.max(options.limit ?? DEFAULT_RESULT_LIMIT, 1),
      MAX_RESULT_LIMIT,
    ),
    category: options.category,
    maxPriceLevel: options.maxPriceLevel,
    minRating: options.minRating,
  };
  const adapters =
    sourceMode === "demo"
      ? DEMO_PROVIDERS
      : [createAmapProvider(options.amapApiKey, options.fetcher)];
  const { places, statuses } = await aggregatePlaces(adapters, query);

  return {
    sourceMode,
    providerStatus: aggregateStatus(statuses),
    providerStatuses: statuses,
    places,
  };
}
