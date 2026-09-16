import { describe, expect, it } from "vitest";

import { getPlaces, isSourceMode } from "./get-places";

describe("getPlaces", () => {
  it("returns a deterministic ready demo dataset", () => {
    const response = getPlaces("demo");

    expect(response.providerStatus.state).toBe("ready");
    expect(response.places.map((place) => place.id)).toEqual([
      "harbor-noodles",
      "garden-table",
      "ember-kitchen",
    ]);
  });

  it("models an unconfigured live provider without demo fallback", () => {
    const response = getPlaces("live");

    expect(response.providerStatus.state).toBe("unavailable");
    expect(response.places).toEqual([]);
  });

  it("validates source mode values", () => {
    expect(isSourceMode("demo")).toBe(true);
    expect(isSourceMode("other")).toBe(false);
  });
});
