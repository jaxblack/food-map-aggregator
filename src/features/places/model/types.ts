export type SourceMode = "demo" | "live";

export type ProviderState = "ready" | "unavailable";

export interface ProviderStatus {
  provider: "built-in-demo" | "external-provider";
  state: ProviderState;
  message: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  priceLevel: 1 | 2 | 3 | 4;
  rating: number;
  coordinates: Coordinates;
}

export interface PlacesResponse {
  sourceMode: SourceMode;
  providerStatus: ProviderStatus;
  places: Place[];
}
