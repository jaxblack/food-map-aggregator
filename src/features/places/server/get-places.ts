import type {
  Coordinates,
  PlaceFilters,
  PlacesResponse,
  RequestedSourceMode,
  ProviderStatus,
  SourceMode,
} from "@/features/places/model/types";
import { DEFAULT_CENTER } from "@/features/places/data/demo-locations";
import { aggregatePlaces } from "./aggregate";
import { isValidCoordinates } from "./geo";
import { createAmapProvider } from "./providers/amap";
import { DEMO_PROVIDERS } from "./providers/demo";
import type { PlaceProviderAdapter } from "./provider";

export { DEFAULT_CENTER };
export const DEFAULT_RADIUS_METERS = 3_000;
export const MAX_RADIUS_METERS = 10_000;
export const DEFAULT_RESULT_LIMIT = 20;
export const MAX_RESULT_LIMIT = 25;

export interface GetPlacesOptions extends PlaceFilters {
  center?: Coordinates;
  radiusMeters?: number;
  limit?: number;
  amapApiKey?: string;
  fetcher?: typeof fetch;
}

export function isSourceMode(
  value: string | null,
): value is RequestedSourceMode {
  return value === "auto" || value === "demo" || value === "live";
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
    message: `${ready.length}/${statuses.length} providers ready${
      errors.length ? ` · ${errors.length} failed` : ""
    }`,
  };
}

export async function getPlaces(
  requestedMode: RequestedSourceMode = "auto",
  options: GetPlacesOptions = {},
): Promise<PlacesResponse> {
  const center = options.center ?? DEFAULT_CENTER;
  if (!isValidCoordinates(center)) {
    throw new RangeError("Invalid center coordinates.");
  }

  const radiusMeters = options.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const limit = options.limit ?? DEFAULT_RESULT_LIMIT;
  if (
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0 ||
    radiusMeters > MAX_RADIUS_METERS ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    limit > MAX_RESULT_LIMIT ||
    (options.category !== undefined &&
      (options.category.trim().length === 0 ||
        options.category.trim().length > 60))
  ) {
    throw new RangeError("Invalid place search bounds.");
  }

  const query = {
    center,
    radiusMeters,
    limit,
    category: options.category?.trim(),
    maxPriceLevel: options.maxPriceLevel,
    minRating: options.minRating,
  };
  const amapApiKey =
    options.amapApiKey !== undefined
      ? options.amapApiKey
      : process.env.AMAP_WEB_SERVICE_KEY;
  let sourceMode: SourceMode;
  let adapters: readonly PlaceProviderAdapter[];
  if (requestedMode === "demo" || (requestedMode === "auto" && !amapApiKey)) {
    sourceMode = "demo";
    adapters = DEMO_PROVIDERS;
  } else if (requestedMode === "live") {
    sourceMode = "live";
    adapters = [createAmapProvider(amapApiKey, options.fetcher)];
  } else {
    sourceMode = "mixed";
    adapters = [
      createAmapProvider(amapApiKey, options.fetcher),
      ...DEMO_PROVIDERS.filter(({ id }) => id !== "amap"),
    ];
  }
  const { places, statuses } = await aggregatePlaces(adapters, query);

  return {
    sourceMode,
    providerStatus: aggregateStatus(statuses),
    providerStatuses: statuses,
    places,
  };
}
