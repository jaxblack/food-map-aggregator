import { findDemoLocation } from "@/features/places/data/demo-locations";
import type { GeocodeResult } from "@/features/places/model/types";
import { isValidCoordinates } from "./geo";

const AMAP_GEOCODE_URL = "https://restapi.amap.com/v3/geocode/geo";
const REQUEST_TIMEOUT_MS = 4_000;

type GeocodeErrorCode = "invalid_query" | "not_found" | "upstream";

export class GeocodeError extends Error {
  constructor(
    readonly code: GeocodeErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function geocodeLocation(
  input: string,
  apiKey: string | undefined = process.env.AMAP_WEB_SERVICE_KEY,
  fetcher: typeof fetch = fetch,
): Promise<GeocodeResult> {
  const query = input.trim();
  if (!query || query.length > 80) {
    throw new GeocodeError("invalid_query", "Address must be 1-80 characters.");
  }

  if (!apiKey) {
    const demo = findDemoLocation(query);
    if (!demo) {
      throw new GeocodeError(
        "not_found",
        "No demo location matched. Try 香港尖沙咀、北京国贸、上海人民广场或深圳市民中心。",
      );
    }
    return demo;
  }

  const url = new URL(AMAP_GEOCODE_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("address", query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new GeocodeError("upstream", "Amap geocoding request failed.");
    }

    const payload: unknown = await response.json();
    if (
      !isRecord(payload) ||
      payload.status !== "1" ||
      !Array.isArray(payload.geocodes)
    ) {
      throw new GeocodeError(
        "upstream",
        "Amap returned an invalid geocoding response.",
      );
    }
    const first = payload.geocodes[0];
    if (!isRecord(first) || typeof first.location !== "string") {
      throw new GeocodeError("not_found", "No matching address was found.");
    }
    const [longitudeValue, latitudeValue] = first.location.split(",");
    const coordinates = {
      latitude: Number(latitudeValue),
      longitude: Number(longitudeValue),
    };
    if (!isValidCoordinates(coordinates)) {
      throw new GeocodeError(
        "upstream",
        "Amap returned invalid address coordinates.",
      );
    }

    return {
      label:
        typeof first.formatted_address === "string"
          ? first.formatted_address
          : query,
      coordinates,
      mode: "live",
      provider: "amap",
    };
  } catch (error) {
    if (error instanceof GeocodeError) throw error;
    throw new GeocodeError(
      "upstream",
      "Amap geocoding timed out or could not be completed.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
