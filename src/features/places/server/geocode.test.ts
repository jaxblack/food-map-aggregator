import { describe, expect, it, vi } from "vitest";

import { geocodeLocation } from "./geocode";

describe("geocodeLocation", () => {
  it("uses deterministic named demo locations without a key", async () => {
    await expect(geocodeLocation("上海", "")).resolves.toEqual(
      expect.objectContaining({
        label: "上海人民广场（演示位置）",
        mode: "demo",
        provider: "built-in-demo",
        coordinates: { latitude: 31.2304, longitude: 121.4737 },
      }),
    );
  });

  it("does not invent an unknown demo address", async () => {
    await expect(
      geocodeLocation("不存在的演示地点", ""),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("resolves live addresses through Amap without exposing the key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "1",
          geocodes: [
            {
              formatted_address: "北京市朝阳区国贸",
              location: "116.4581,39.9097",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await geocodeLocation("北京国贸", "secret-key", fetcher);
    const requestedUrl = new URL(String(fetcher.mock.calls[0][0]));

    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      "https://restapi.amap.com/v3/geocode/geo",
    );
    expect(requestedUrl.searchParams.get("key")).toBe("secret-key");
    expect(result).toEqual({
      label: "北京市朝阳区国贸",
      coordinates: { latitude: 39.9097, longitude: 116.4581 },
      mode: "live",
      provider: "amap",
    });
  });
});
