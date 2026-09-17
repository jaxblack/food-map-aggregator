import type { Page } from "@playwright/test";

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

export async function mockExternalNetwork(page: Page) {
  const appOrigin = new URL(
    process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000/",
  ).origin;

  await page.route(/^https?:\/\//, (route) => {
    const url = new URL(route.request().url());
    if (url.origin === appOrigin) {
      return route.continue();
    }
    if (url.hostname === "tile.openstreetmap.org") {
      return route.fulfill({
        body: transparentPng,
        contentType: "image/png",
        status: 200,
      });
    }
    return route.abort("blockedbyclient");
  });
}

export async function mockMapFailure(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "WebGLRenderingContext", {
      configurable: true,
      value: undefined,
    });
  });
}
