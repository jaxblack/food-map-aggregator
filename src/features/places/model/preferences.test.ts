import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  loadPreferences,
  moveProvider,
  savePreferences,
  sortPlaces,
} from "./preferences";
import type { Place } from "./types";

describe("place preferences", () => {
  it("round-trips only non-sensitive filter preferences", () => {
    const setItem = vi.fn();
    const preferences = {
      ...DEFAULT_PREFERENCES,
      radiusKm: 10 as const,
      cuisines: ["Grill", "Noodles"],
      sortField: "rating" as const,
      sortDirection: "desc" as const,
    };

    savePreferences({ setItem }, preferences);

    expect(setItem).toHaveBeenCalledWith(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
    expect(setItem.mock.calls[0][1]).not.toContain("latitude");
    expect(
      loadPreferences({ getItem: () => setItem.mock.calls[0][1] }),
    ).toEqual(preferences);
  });

  it("recovers safe defaults from invalid storage and moves providers", () => {
    expect(loadPreferences({ getItem: () => "{invalid" })).toEqual(
      DEFAULT_PREFERENCES,
    );
    expect(moveProvider(DEFAULT_PREFERENCES.providerOrder, "eleme", -1)).toEqual(
      ["eleme", "meituan", "douyin", "amap"],
    );
  });

  it("uses provider priority as a stable tie-breaker", () => {
    const base = {
      cuisine: "Cafe",
      neighborhood: "Central",
      priceLevel: 2 as const,
      rating: 4.7,
      coordinates: { latitude: 22.3, longitude: 114.17 },
      distanceMeters: 200,
    };
    const places: Place[] = [
      {
        ...base,
        id: "amap",
        name: "Amap Place",
        sourceProviders: ["amap"],
      },
      {
        ...base,
        id: "eleme",
        name: "Eleme Place",
        sourceProviders: ["eleme"],
      },
    ];

    expect(
      sortPlaces(places, "rating", "desc", [
        "eleme",
        "amap",
        "meituan",
        "douyin",
      ]).map(({ id }) => id),
    ).toEqual(["eleme", "amap"]);
  });
});
