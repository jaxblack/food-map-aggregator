import { expect, test, type Page } from "@playwright/test";

import { mockExternalNetwork, mockMapFailure } from "./test-helpers";

const preferencesKey = "food-map.preferences.v1";

async function restaurantNames(page: Page) {
  return page
    .getByRole("list", { name: "Demo restaurants" })
    .locator("strong")
    .allTextContents();
}

test.beforeEach(async ({ page }) => {
  await mockExternalNetwork(page);
});

test("keeps cards and interactive map markers selected in both directions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Interactive map ready.")).toBeAttached();

  const emberCard = page.locator(".placeCard", { hasText: "Ember Kitchen" });
  const emberMarker = page.getByRole("button", { name: "Show Ember Kitchen" });
  await emberCard.click();
  await expect(emberCard).toHaveAttribute("aria-pressed", "true");
  await expect(emberMarker).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Ember Kitchen selected.")).toBeAttached();

  const gardenCard = page.locator(".placeCard", { hasText: "Garden Table" });
  const gardenMarker = page.getByRole("button", { name: "Show Garden Table" });
  await gardenMarker.click();
  await expect(gardenMarker).toHaveAttribute("aria-pressed", "true");
  await expect(gardenCard).toHaveAttribute("aria-pressed", "true");
  await expect(emberCard).toHaveAttribute("aria-pressed", "false");
});

test("uses a stable desktop split layout", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByText("Interactive map ready.")).toBeAttached();

  const map = await page.locator(".mapFrame").boundingBox();
  const results = await page
    .getByRole("complementary", { name: "Restaurant results" })
    .boundingBox();
  expect(map).not.toBeNull();
  expect(results).not.toBeNull();
  expect(Math.abs(map!.y - results!.y)).toBeLessThanOrEqual(1);
  expect(results!.x - (map!.x + map!.width)).toBeGreaterThanOrEqual(15);
  expect(map!.width / results!.width).toBeGreaterThan(1.4);
  expect(map!.height).toBeGreaterThanOrEqual(520);
});

test("overlays a bounded bottom sheet on the mobile map", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText("Interactive map ready.")).toBeAttached();

  const grid = await page.locator(".explorerGrid").boundingBox();
  const map = await page.locator(".mapFrame").boundingBox();
  const sheet = await page
    .getByRole("complementary", { name: "Restaurant results" })
    .boundingBox();
  await expect(page.locator(".sheetHandle")).toBeVisible();
  expect(grid).not.toBeNull();
  expect(map).not.toBeNull();
  expect(sheet).not.toBeNull();
  expect(Math.abs(sheet!.x - map!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(sheet!.width - map!.width)).toBeLessThanOrEqual(1);
  expect(sheet!.y).toBeGreaterThan(map!.y);
  expect(sheet!.y).toBeLessThan(map!.y + map!.height);
  expect(Math.abs(sheet!.y + sheet!.height - (grid!.y + grid!.height))).toBeLessThanOrEqual(1);
  expect(sheet!.height).toBeLessThanOrEqual(grid!.height * 0.47);
});

test("keeps the restaurant list usable when the map cannot load", async ({
  page,
}) => {
  await mockMapFailure(page);
  await page.goto("/");

  await expect(
    page.getByText(/Interactive map unavailable. Showing the accessible fallback map/),
  ).toBeVisible();
  const emberCard = page.locator(".placeCard", { hasText: "Ember Kitchen" });
  await emberCard.click();
  await expect(emberCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Ember Kitchen selected.")).toBeAttached();

  await page.getByRole("checkbox", { name: "Noodles" }).check();
  await expect(restaurantNames(page)).resolves.toEqual(["Harbor Noodles"]);
});

test("keeps the manual demo location after geolocation is denied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => error?.({ code: 1, message: "Denied by E2E", PERMISSION_DENIED: 1 } as GeolocationPositionError),
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText(/Location permission denied/)).toBeVisible();

  await page
    .getByRole("button", { name: "Use manual demo location" })
    .click();
  await expect(page.getByText(/Manual demo location active/)).toBeVisible();
  await expect(page.getByText("3 restaurants shown.", { exact: false })).toBeAttached();
});

test("searches a manual demo area and sends the selected 10km radius", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Search an address or demo area")
    .fill("上海人民广场");
  await page.getByRole("button", { name: "Find" }).click();
  await expect(page.getByText(/上海人民广场（演示位置）/)).toBeVisible();
  await expect(page.getByText(/deterministic demo area/i)).toBeVisible();

  const response = page.waitForResponse((candidate) =>
    candidate.url().includes("/api/places") &&
    candidate.url().includes("radius=10000"),
  );
  await page.getByRole("radio", { name: "10 km" }).check();
  expect((await response).ok()).toBe(true);
  await expect(page.getByText("3 restaurants shown.", { exact: false })).toBeAttached();
});

test("filters cuisines and sorts results deterministically", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("checkbox", { name: "Noodles" }).check();
  await expect(page.getByText("1 restaurants shown.", { exact: false })).toBeAttached();
  await expect(restaurantNames(page)).resolves.toEqual(["Harbor Noodles"]);

  await page.getByRole("checkbox", { name: "Noodles" }).uncheck();
  await page.getByLabel("Sort by").selectOption("rating");
  await page.getByLabel("Sort order").selectOption("desc");
  await expect(restaurantNames(page)).resolves.toEqual([
    "Ember Kitchen",
    "Harbor Noodles",
    "Garden Table",
  ]);
});

test("persists provider priority across reloads", async ({ page }) => {
  await page.goto("/");
  const providers = page.locator(".providerOrder li");

  await expect(providers).toHaveText([
    /1\. Meituan/,
    /2\. Ele\.me/,
    /3\. Douyin/,
    /4\. Amap/,
  ]);
  await page.getByRole("button", { name: "Move Meituan down" }).click();
  await expect(providers).toHaveText([
    /1\. Ele\.me/,
    /2\. Meituan/,
    /3\. Douyin/,
    /4\. Amap/,
  ]);

  await page.reload();
  await expect(providers).toHaveText([
    /1\. Ele\.me/,
    /2\. Meituan/,
    /3\. Douyin/,
    /4\. Amap/,
  ]);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), preferencesKey))
    .toContain('"providerOrder":["eleme","meituan","douyin","amap"]');
});

test("labels demo and live source responses", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Source: demo")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "aggregation:" }),
  ).toContainText("4/4 providers ready");

  const demoResponse = await page.request.get("/api/places?source=demo");
  expect(demoResponse.ok()).toBe(true);
  const demo = await demoResponse.json();
  expect(demo.sourceMode).toBe("demo");
  expect(demo.providerStatuses).toEqual(
    expect.arrayContaining([expect.objectContaining({ mode: "demo" })]),
  );

  const liveResponse = await page.request.get("/api/places?source=live");
  expect(liveResponse.ok()).toBe(true);
  const live = await liveResponse.json();
  expect(live.sourceMode).toBe("live");
  expect(live.providerStatuses).toEqual([
    expect.objectContaining({ provider: "amap", mode: "live" }),
  ]);
});

test("shows honest provider links for demo merchants", async ({ page }) => {
  await page.goto("/");
  const links = page.getByLabel("Harbor Noodles provider links");

  await expect(links.getByRole("link", { name: "Amap demo search" })).toHaveAttribute(
    "data-mode",
    "demo",
  );
  await expect(
    links.getByRole("link", { name: "Douyin demo search" }),
  ).toHaveAttribute("rel", "noreferrer");
});
