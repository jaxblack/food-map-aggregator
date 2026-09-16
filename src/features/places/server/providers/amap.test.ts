import { describe, expect, it, vi } from "vitest";

import { createAmapProvider } from "./amap";

const query = {
  center: { latitude: 22.3, longitude: 114.17 },
  radiusMeters: 9_000,
  limit: 100,
};

describe("createAmapProvider", () => {
  it("uses bounded official around-search parameters and normalizes valid data", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "1",
          pois: [
            {
              id: "poi-1",
              name: "Test Cafe",
              location: "114.171,22.301",
              type: "餐饮服务;咖啡厅",
              adname: "油尖旺区",
              business: { rating: "4.6", cost: "88" },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await createAmapProvider("server-secret", fetcher).search(
      query,
    );
    const requestedUrl = new URL(String(fetcher.mock.calls[0][0]));

    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      "https://restapi.amap.com/v5/place/around",
    );
    expect(requestedUrl.searchParams.get("radius")).toBe("9000");
    expect(requestedUrl.searchParams.get("types")).toBe("050000");
    expect(requestedUrl.searchParams.get("page_size")).toBe("25");
    expect(result.status).toEqual(
      expect.objectContaining({ state: "ready", mode: "live", resultCount: 1 }),
    );
    expect(result.places[0]).toEqual(
      expect.objectContaining({
        externalUrl: expect.stringContaining("https://uri.amap.com/marker"),
        name: "Test Cafe",
        rating: 4.6,
        priceLevel: 2,
      }),
    );
  });

  it("rejects malformed responses without exposing credentials", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "1", pois: [{ id: "bad" }] }), {
        status: 200,
      }),
    );

    const result = await createAmapProvider("server-secret", fetcher).search(
      query,
    );

    expect(result.status.state).toBe("error");
    expect(result.status.message).not.toContain("server-secret");
    expect(result.places).toEqual([]);
  });

  it("reports transport failures as errors rather than demo success", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("network includes server-secret"));

    const result = await createAmapProvider("server-secret", fetcher).search(
      query,
    );

    expect(result.status).toEqual(
      expect.objectContaining({ provider: "amap", state: "error", mode: "live" }),
    );
    expect(result.status.message).not.toContain("server-secret");
    expect(result.places).toEqual([]);
  });
});
