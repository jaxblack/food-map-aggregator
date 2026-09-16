import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_PLACES } from "@/features/places/data/demo-places";
import { PlaceExplorer } from "./place-explorer";

describe("PlaceExplorer", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/geocode")) {
          return new Response(
            JSON.stringify({
              label: "上海人民广场（演示位置）",
              coordinates: { latitude: 31.2304, longitude: 121.4737 },
              mode: "demo",
              provider: "built-in-demo",
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            sourceMode: "demo",
            providerStatus: {
              provider: "aggregation",
              state: "ready",
              message: "Demo",
            },
            providerStatuses: [],
            places: DEMO_PLACES,
          }),
          { status: 200 },
        );
      }),
    );
  });

  it("keeps list and map selection in sync", async () => {
    const user = userEvent.setup();

    render(
      <PlaceExplorer
        places={[...DEMO_PLACES]}
        providerStatus={{
          provider: "built-in-demo",
          state: "ready",
          message: "Deterministic local dataset",
        }}
        sourceMode="demo"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show Ember Kitchen" }));

    expect(
      within(screen.getByRole("list", { name: "Demo restaurants" })).getByRole(
        "button",
        { name: /Ember Kitchen/ },
      ),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText("Lantern Hill", { selector: ".mapCallout span" }),
    ).toBeVisible();
    expect(screen.getByText(/Ember Kitchen selected/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ele.me demo search" }),
    ).toHaveAttribute("href", "https://www.ele.me/");
  });

  it("provides an attributed fallback when an interactive map is unavailable", () => {
    render(
      <PlaceExplorer
        places={[...DEMO_PLACES]}
        providerStatus={{
          provider: "built-in-demo",
          state: "ready",
          message: "Demo",
        }}
        sourceMode="demo"
      />,
    );

    expect(screen.getByText(/interactive map unavailable/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /OpenStreetMap contributors/ }),
    ).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  });

  it("supports persistent multi-select filters, sorting, and keyboard provider ordering", async () => {
    const user = userEvent.setup();
    render(
      <PlaceExplorer
        places={[...DEMO_PLACES]}
        providerStatus={{ provider: "built-in-demo", state: "ready", message: "Demo" }}
        sourceMode="demo"
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Grill" }));
    expect(
      within(screen.getByRole("list", { name: "Demo restaurants" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText("Sort by"), "rating");
    await user.selectOptions(screen.getByLabelText("Sort order"), "desc");
    await user.click(screen.getByRole("button", { name: "Move Ele.me up" }));

    expect(window.localStorage.getItem("food-map.preferences.v1")).toContain(
      '"cuisines":["Grill"]',
    );
    expect(screen.getByText(/1 restaurants shown/)).toBeInTheDocument();
    expect(screen.getByText("1. Ele.me")).toBeVisible();
  });

  it("announces geolocation loading, denied, error, and success states", async () => {
    const user = userEvent.setup();
    let success: PositionCallback = () => undefined;
    let error: PositionErrorCallback = () => undefined;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((onSuccess, onError) => {
          success = onSuccess;
          error = onError;
        }),
      },
    });
    render(
      <PlaceExplorer
        places={[...DEMO_PLACES]}
        providerStatus={{ provider: "built-in-demo", state: "ready", message: "Demo" }}
        sourceMode="demo"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByText(/Requesting your browser location/)).toBeVisible();
    act(() => error({ code: 1 } as GeolocationPositionError));
    expect(await screen.findByText(/permission denied/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Use my location" }));
    act(() => error({ code: 2 } as GeolocationPositionError));
    expect(await screen.findByText(/could not be determined/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Use my location" }));
    act(() =>
      success({
        coords: { latitude: 22.3, longitude: 114.17 },
      } as GeolocationPosition),
    );
    expect(await screen.findByText(/Current browser location active/)).toBeVisible();
    expect(
      window.localStorage.getItem("food-map.preferences.v1") ?? "",
    ).not.toContain("22.3");
  });

  it("searches a manual address and refreshes when the radius changes", async () => {
    const user = userEvent.setup();
    render(
      <PlaceExplorer
        places={[...DEMO_PLACES]}
        providerStatus={{
          provider: "built-in-demo",
          state: "ready",
          message: "Demo",
        }}
        sourceMode="demo"
      />,
    );

    await user.type(
      screen.getByLabelText("Search an address or demo area"),
      "上海",
    );
    await user.click(screen.getByRole("button", { name: "Find" }));
    expect(
      await screen.findByText(/上海人民广场（演示位置）/),
    ).toBeVisible();
    expect(screen.getByText(/deterministic demo area/i)).toBeVisible();

    await user.click(screen.getByRole("radio", { name: "10 km" }));
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("radius=10000"),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
