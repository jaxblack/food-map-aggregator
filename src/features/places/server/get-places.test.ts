import { describe, expect, it, vi } from "vitest";

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

  it("automatically combines live Amap with explicitly demo-only platforms", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "1",
          pois: [
            {
              id: "live-cafe",
              name: "Live Cafe",
              location: "114.173,22.301",
              type: "餐饮服务;咖啡厅",
              adname: "油尖旺区",
              business: { rating: "4.8", cost: "68" },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const response = await getPlaces("auto", {
      amapApiKey: "server-only-key",
      fetcher,
    });

    expect(response.sourceMode).toBe("mixed");
    expect(response.providerStatuses?.map(({ provider, mode }) => [
      provider,
      mode,
    ])).toEqual([
      ["amap", "live"],
      ["meituan", "demo"],
      ["eleme", "demo"],
      ["douyin", "demo"],
    ]);
    expect(response.places).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "amap-live-cafe",
          sources: [
            expect.objectContaining({
              provider: "amap",
              mode: "live",
            }),
          ],
        }),
      ]),
    );
  });

  it("validates source mode values", () => {
    expect(isSourceMode("auto")).toBe(true);
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

  it("accepts 10km searches and rejects larger radii", async () => {
    await expect(
      getPlaces("demo", { radiusMeters: 10_000 }),
    ).resolves.toEqual(expect.objectContaining({ sourceMode: "demo" }));
    await expect(
      getPlaces("demo", { radiusMeters: 10_001 }),
    ).rejects.toThrow("Invalid place search bounds");
  });
});
