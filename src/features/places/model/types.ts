export type RequestedSourceMode = "auto" | "demo" | "live";
export type SourceMode = "demo" | "live" | "mixed";

export type ProviderId = "amap" | "meituan" | "eleme" | "douyin";
export type ProviderMode = "demo" | "live";
export type ProviderState = "ready" | "unavailable" | "error";

export interface ProviderStatus {
  provider: ProviderId | "aggregation" | "built-in-demo" | "external-provider";
  state: ProviderState;
  message: string;
  mode?: ProviderMode;
  resultCount?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PlaceSource {
  provider: ProviderId;
  mode: ProviderMode;
  externalId: string;
  url?: string;
}

export interface Place {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  priceLevel: 1 | 2 | 3 | 4;
  rating: number;
  coordinates: Coordinates;
  sources?: PlaceSource[];
  sourceProviders?: ProviderId[];
  distanceMeters?: number;
}

export interface PlacesResponse {
  sourceMode: SourceMode;
  providerStatus: ProviderStatus;
  providerStatuses?: ProviderStatus[];
  places: Place[];
}

export interface PlaceFilters {
  category?: string;
  maxPriceLevel?: 1 | 2 | 3 | 4;
  minRating?: number;
}

export interface PlacesQuery extends PlaceFilters {
  center: Coordinates;
  radiusMeters: number;
  limit: number;
}

export interface GeocodeResult {
  label: string;
  coordinates: Coordinates;
  mode: ProviderMode;
  provider: "amap" | "built-in-demo";
}
