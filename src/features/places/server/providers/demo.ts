import { PROVIDER_FIXTURES } from "@/features/places/data/provider-fixtures";
import { DEFAULT_CENTER } from "@/features/places/data/demo-locations";
import type { ProviderId } from "@/features/places/model/types";
import type {
  PlaceProviderAdapter,
  ProviderResult,
} from "@/features/places/server/provider";

const PROVIDER_PRIORITIES: Record<ProviderId, number> = {
  amap: 0,
  meituan: 1,
  eleme: 2,
  douyin: 3,
};

export function createDemoProvider(id: ProviderId): PlaceProviderAdapter {
  return {
    id,
    mode: "demo",
    priority: PROVIDER_PRIORITIES[id],
    async search(query): Promise<ProviderResult> {
      const latitudeOffset = query.center.latitude - DEFAULT_CENTER.latitude;
      const longitudeOffset =
        query.center.longitude - DEFAULT_CENTER.longitude;
      const places = PROVIDER_FIXTURES[id].map((place) => ({
        ...place,
        coordinates: {
          latitude: Math.max(
            -90,
            Math.min(90, place.coordinates.latitude + latitudeOffset),
          ),
          longitude: Math.max(
            -180,
            Math.min(180, place.coordinates.longitude + longitudeOffset),
          ),
        },
      }));
      return {
        status: {
          provider: id,
          state: "ready",
          mode: "demo",
          resultCount: places.length,
          message: "Deterministic demo fixture",
        },
        places,
      };
    },
  };
}

export const DEMO_PROVIDERS = (
  ["amap", "meituan", "eleme", "douyin"] as const
).map(createDemoProvider);
