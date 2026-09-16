import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_PLACES } from "@/features/places/data/demo-places";
import { PlaceExplorer } from "./place-explorer";

describe("PlaceExplorer", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
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
});
