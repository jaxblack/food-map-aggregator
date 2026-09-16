import type { PlacesQuery } from "@/features/places/model/types";
import type {
  PlaceProviderAdapter,
  ProviderPlace,
  ProviderResult,
} from "@/features/places/server/provider";

const AMAP_AROUND_URL = "https://restapi.amap.com/v5/place/around";
const AMAP_DINING_CATEGORY = "050000";
const MAX_RADIUS_METERS = 10_000;
const MAX_RESULTS = 25;
const REQUEST_TIMEOUT_MS = 4_000;

interface AmapPoi {
  id: string;
  name: string;
  location: string;
  type?: string;
  address?: string;
  adname?: string;
  business?: {
    rating?: string;
    cost?: string;
  };
}

interface AmapResponse {
  status: "0" | "1";
  info?: string;
  infocode?: string;
  pois: AmapPoi[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parsePoi(value: unknown): AmapPoi | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.location !== "string"
  ) {
    return null;
  }

  const business = isRecord(value.business)
    ? {
        rating: optionalString(value.business.rating),
        cost: optionalString(value.business.cost),
      }
    : undefined;

  return {
    id: value.id,
    name: value.name,
    location: value.location,
    type: optionalString(value.type),
    address: optionalString(value.address),
    adname: optionalString(value.adname),
    business,
  };
}

function parseAmapResponse(value: unknown): AmapResponse | null {
  if (!isRecord(value) || (value.status !== "0" && value.status !== "1")) {
    return null;
  }
  if (!Array.isArray(value.pois)) {
    return null;
  }

  const pois: AmapPoi[] = [];
  for (const item of value.pois) {
    const poi = parsePoi(item);
    if (!poi) {
      return null;
    }
    pois.push(poi);
  }

  return {
    status: value.status,
    info: optionalString(value.info),
    infocode: optionalString(value.infocode),
    pois,
  };
}

function priceLevel(cost: string | undefined): 1 | 2 | 3 | 4 {
  const amount = Number(cost);
  if (!Number.isFinite(amount) || amount <= 50) return 1;
  if (amount <= 100) return 2;
  if (amount <= 250) return 3;
  return 4;
}

function normalizePoi(poi: AmapPoi): ProviderPlace | null {
  const [longitudeValue, latitudeValue] = poi.location.split(",");
  const longitude = Number(longitudeValue);
  const latitude = Number(latitudeValue);
  const rating = Number(poi.business?.rating);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return {
    externalId: poi.id,
    externalUrl: `https://uri.amap.com/marker?position=${encodeURIComponent(
      `${longitude},${latitude}`,
    )}&name=${encodeURIComponent(poi.name)}&coordinate=gaode&callnative=0`,
    name: poi.name,
    cuisine: poi.type?.split(";")[0] || "餐饮",
    neighborhood: poi.adname || poi.address || "附近",
    priceLevel: priceLevel(poi.business?.cost),
    rating: Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : 0,
    coordinates: { latitude, longitude },
  };
}

function unavailable(message: string): ProviderResult {
  return {
    status: {
      provider: "amap",
      state: "unavailable",
      mode: "live",
      resultCount: 0,
      message,
    },
    places: [],
  };
}

export function createAmapProvider(
  apiKey: string | undefined = process.env.AMAP_WEB_SERVICE_KEY,
  fetcher: typeof fetch = fetch,
): PlaceProviderAdapter {
  return {
    id: "amap",
    mode: "live",
    priority: 0,
    async search(query: PlacesQuery): Promise<ProviderResult> {
      if (!apiKey) {
        return unavailable(
          "Live Amap is not configured; select demo mode for fixture data.",
        );
      }

      const url = new URL(AMAP_AROUND_URL);
      url.searchParams.set("key", apiKey);
      url.searchParams.set(
        "location",
        `${query.center.longitude},${query.center.latitude}`,
      );
      url.searchParams.set(
        "radius",
        String(Math.min(query.radiusMeters, MAX_RADIUS_METERS)),
      );
      url.searchParams.set("types", AMAP_DINING_CATEGORY);
      url.searchParams.set(
        "page_size",
        String(Math.min(query.limit, MAX_RESULTS)),
      );
      url.searchParams.set("page_num", "1");
      url.searchParams.set("show_fields", "business");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetcher(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          return {
            ...unavailable("Amap request failed safely."),
            status: {
              ...unavailable("Amap request failed safely.").status,
              state: "error",
            },
          };
        }

        const payload = parseAmapResponse(await response.json());
        if (!payload || payload.status !== "1") {
          return {
            ...unavailable("Amap returned an invalid or unsuccessful response."),
            status: {
              ...unavailable(
                "Amap returned an invalid or unsuccessful response.",
              ).status,
              state: "error",
            },
          };
        }

        const places = payload.pois
          .map(normalizePoi)
          .filter((place): place is ProviderPlace => place !== null);
        return {
          status: {
            provider: "amap",
            state: "ready",
            mode: "live",
            resultCount: places.length,
            message: "Live Amap Web Service",
          },
          places,
        };
      } catch {
        return {
          ...unavailable("Amap request timed out or could not be completed."),
          status: {
            ...unavailable(
              "Amap request timed out or could not be completed.",
            ).status,
            state: "error",
          },
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
