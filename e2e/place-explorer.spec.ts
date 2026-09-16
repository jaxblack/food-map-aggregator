import { expect, test, type Page } from "@playwright/test";

const preferencesKey = "food-map.preferences.v1";

async function blockExternalNetwork(page: Page) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?::\d+)?(?:\/|$))/, (route) =>
    route.abort("blockedbyclient"),
  );
}

async function restaurantNames(page: Page) {
  return page
    .getByRole("list", { name: "Demo restaurants" })
    .locator("strong")
    .allTextContents();
}

test.beforeEach(async ({ page }) => {
  await blockExternalNetwork(page);
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
  ).toContainText("Deterministic demo fixture");

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
