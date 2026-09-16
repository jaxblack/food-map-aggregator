import { describe, expect, it } from "vitest";

import { getPlaces, isSourceMode } from "./get-places";

describe("getPlaces", () => {
  it("returns a deterministic, explicitly labeled demo aggregation", async () => {
    const response = await getPlaces("demo");

    expect(response.providerStatus.state).toBe("ready");
    expect(response.providerStatuses?.map(({ provider, mode }) => [
      provider,
      mode,
    ])).toEqual([
      ["amap", "demo"],
      ["meituan", "demo"],
      ["eleme", "demo"],
      ["douyin", "demo"],
    ]);
    expect(response.places.map((place) => place.id)).toEqual([
      "amap-harbor-noodles",
      "meituan-garden-table",
      "eleme-ember-kitchen",
    ]);
    expect(response.places[0].sourceProviders).toEqual(["amap", "douyin"]);
  });

  it("models an unconfigured live provider without demo fallback", async () => {
    const response = await getPlaces("live", { amapApiKey: "" });

    expect(response.providerStatus.state).toBe("unavailable");
    expect(response.providerStatuses).toEqual([
      expect.objectContaining({
        provider: "amap",
        mode: "live",
        state: "unavailable",
      }),
    ]);
    expect(response.places).toEqual([]);
  });

  it("validates source mode values", () => {
    expect(isSourceMode("demo")).toBe(true);
    expect(isSourceMode("other")).toBe(false);
  });

  it("rejects invalid center coordinates", async () => {
    await expect(
      getPlaces("demo", {
        center: { latitude: 91, longitude: 114 },
      }),
    ).rejects.toThrow("Invalid center coordinates");
  });
});
