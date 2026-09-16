import type {
  Coordinates,
  ProviderId,
  ProviderMode,
  ProviderStatus,
  PlacesQuery,
} from "@/features/places/model/types";

export interface ProviderPlace {
  externalId: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  priceLevel: 1 | 2 | 3 | 4;
  rating: number;
  coordinates: Coordinates;
}

export interface ProviderResult {
  status: ProviderStatus;
  places: ProviderPlace[];
}

export interface PlaceProviderAdapter {
  id: ProviderId;
  mode: ProviderMode;
  priority: number;
  search(query: PlacesQuery): Promise<ProviderResult>;
}
