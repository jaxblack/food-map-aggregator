import { describe, expect, it } from "vitest";

import type {
  ProviderId,
  ProviderState,
} from "@/features/places/model/types";
import type {
  PlaceProviderAdapter,
  ProviderPlace,
} from "@/features/places/server/provider";
import { aggregatePlaces } from "./aggregate";
import { distanceMeters, isValidCoordinates } from "./geo";

const center = { latitude: 22.3, longitude: 114.17 };
const query = {
  center,
  radiusMeters: 3_000,
  limit: 20,
};

function adapter(
  id: ProviderId,
  priority: number,
  places: ProviderPlace[],
  state: ProviderState = "ready",
): PlaceProviderAdapter {
  return {
    id,
    priority,
    mode: "demo",
    async search() {
      return {
        status: {
          provider: id,
          state,
          mode: "demo" as const,
          message: `${id} ${state}`,
          resultCount: places.length,
        },
        places,
      };
    },
  };
}

function place(
  externalId: string,
  name: string,
  overrides: Partial<ProviderPlace> = {},
): ProviderPlace {
  return {
    externalId,
    name,
    cuisine: "Noodles",
    neighborhood: "Central",
    priceLevel: 2,
    rating: 4.5,
    coordinates: center,
    ...overrides,
  };
}

describe("aggregatePlaces", () => {
  it("normalizes, validates, and conservatively deduplicates nearby exact names", async () => {
    const { places } = await aggregatePlaces(
      [
        adapter("amap", 0, [place("a", " Same  Place ")]),
        adapter("meituan", 1, [
          place("b", "same place", {
            coordinates: { latitude: 22.3001, longitude: 114.1701 },
          }),
          place("far", "same place", {
            coordinates: { latitude: 22.31, longitude: 114.17 },
          }),
          place("invalid", "Invalid", {
            coordinates: { latitude: 120, longitude: 114 },
          }),
        ]),
      ],
      query,
    );

    expect(places).toHaveLength(2);
    expect(places[0]).toEqual(
      expect.objectContaining({
        id: "amap-a",
        name: "Same Place",
        sourceProviders: ["amap", "meituan"],
        sources: [
          expect.objectContaining({ provider: "amap", mode: "demo" }),
          expect.objectContaining({ provider: "meituan", mode: "demo" }),
        ],
      }),
    );
    expect(places[1].id).toBe("meituan-far");
  });

  it("applies filters and stable provider-priority sorting", async () => {
    const { places } = await aggregatePlaces(
      [
        adapter("eleme", 2, [place("e", "Eleme")]),
        adapter("amap", 0, [
          place("filtered", "Cheap Rice", {
            cuisine: "Rice",
            rating: 3,
          }),
          place("a", "Amap"),
        ]),
        adapter("meituan", 1, [place("m", "Meituan")]),
      ],
      { ...query, category: "nood", minRating: 4, maxPriceLevel: 2 },
    );

    expect(places.map(({ id }) => id)).toEqual([
      "amap-a",
      "meituan-m",
      "eleme-e",
    ]);
  });

  it("propagates every provider status unchanged", async () => {
    const { statuses } = await aggregatePlaces(
      [
        adapter("amap", 0, [], "error"),
        adapter("meituan", 1, [], "unavailable"),
      ],
      query,
    );

    expect(statuses.map(({ provider, state }) => [provider, state])).toEqual([
      ["amap", "error"],
      ["meituan", "unavailable"],
    ]);
  });
});

describe("geo utilities", () => {
  it("validates coordinate bounds and calculates geographic distance", () => {
    expect(isValidCoordinates(center)).toBe(true);
    expect(isValidCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
    expect(
      distanceMeters(center, { latitude: 22.301, longitude: 114.17 }),
    ).toBeCloseTo(111, 0);
  });
});
