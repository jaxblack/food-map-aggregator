import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  loadPreferences,
  moveProvider,
  savePreferences,
} from "./preferences";

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
});
