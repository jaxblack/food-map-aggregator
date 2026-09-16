import { DEMO_PLACES } from "@/features/places/data/demo-places";
import type {
  PlacesResponse,
  SourceMode,
} from "@/features/places/model/types";

export function isSourceMode(value: string | null): value is SourceMode {
  return value === "demo" || value === "live";
}

export function getPlaces(sourceMode: SourceMode = "demo"): PlacesResponse {
  if (sourceMode === "live") {
    return {
      sourceMode,
      providerStatus: {
        provider: "external-provider",
        state: "unavailable",
        message: "Live provider is not configured in this foundation slice.",
      },
      places: [],
    };
  }

  return {
    sourceMode,
    providerStatus: {
      provider: "built-in-demo",
      state: "ready",
      message: "Deterministic local dataset",
    },
    places: [...DEMO_PLACES],
  };
}
