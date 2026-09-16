import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DEMO_PLACES } from "@/features/places/data/demo-places";
import { PlaceExplorer } from "./place-explorer";

describe("PlaceExplorer", () => {
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
});
