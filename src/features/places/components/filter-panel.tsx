"use client";

import type { DragEvent, FormEvent } from "react";

import { DEMO_LOCATION_LABELS } from "@/features/places/data/demo-locations";
import {
  RADIUS_OPTIONS,
  type PlacePreferences,
  type RadiusKm,
  type SortDirection,
  type SortField,
} from "@/features/places/model/preferences";
import { PROVIDER_NAMES } from "@/features/places/model/providers";
import type { ProviderId } from "@/features/places/model/types";

export type GeolocationState =
  | "demo"
  | "loading"
  | "denied"
  | "error"
  | "manual"
  | "success";
export type ManualLocationState = "idle" | "loading" | "error" | "success";

interface FilterPanelProps {
  cuisines: string[];
  geolocationState: GeolocationState;
  locationLabel: string;
  manualLocationMessage: string;
  manualLocationQuery: string;
  manualLocationState: ManualLocationState;
  onChange: (preferences: PlacePreferences) => void;
  onManualLocationQueryChange: (query: string) => void;
  onMoveProvider: (provider: ProviderId, offset: -1 | 1) => void;
  onRequestLocation: () => void;
  onSearchManualLocation: () => void;
  onUseDemoLocation: () => void;
  preferences: PlacePreferences;
  resultCount: number;
}

const GEO_MESSAGES: Record<GeolocationState, string> = {
  demo: "Manual demo location active — not your current location.",
  loading: "Requesting your browser location…",
  denied: "Location permission denied. The manual demo location remains active.",
  error: "Your location could not be determined. The manual demo location remains active.",
  manual: "A manually searched location is active for this session.",
  success: "Current browser location active for this session only.",
};

function directionLabel(field: SortField, direction: SortDirection): string {
  if (field === "distance") {
    return direction === "asc" ? "Ascending — nearest first" : "Descending — farthest first";
  }
  if (field === "rating") {
    return direction === "asc" ? "Ascending — lowest rated first" : "Descending — highest rated first";
  }
  return direction === "asc" ? "Ascending — lowest price first" : "Descending — highest price first";
}

export function FilterPanel({
  cuisines,
  geolocationState,
  locationLabel,
  manualLocationMessage,
  manualLocationQuery,
  manualLocationState,
  onChange,
  onManualLocationQueryChange,
  onMoveProvider,
  onRequestLocation,
  onSearchManualLocation,
  onUseDemoLocation,
  preferences,
  resultCount,
}: FilterPanelProps) {
  const update = <Key extends keyof PlacePreferences>(
    key: Key,
    value: PlacePreferences[Key],
  ) => onChange({ ...preferences, [key]: value });

  const dropProvider = (
    event: DragEvent<HTMLLIElement>,
    target: ProviderId,
  ) => {
    event.preventDefault();
    const dragged = event.dataTransfer.getData("text/plain") as ProviderId;
    const from = preferences.providerOrder.indexOf(dragged);
    const to = preferences.providerOrder.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...preferences.providerOrder];
    next.splice(from, 1);
    next.splice(to, 0, dragged);
    update("providerOrder", next);
  };

  return (
    <aside className="filters" aria-label="Search filters and preferences">
      <div className="filterGroup">
        <h2>Location</h2>
        <div className="buttonRow">
          <button onClick={onRequestLocation} type="button" disabled={geolocationState === "loading"}>
            Use my location
          </button>
          <button onClick={onUseDemoLocation} type="button">Use manual demo location</button>
        </div>
        <p className="filterHint" role="status" aria-live="polite">{GEO_MESSAGES[geolocationState]}</p>
        <p className="activeLocation">
          Active area: <strong>{locationLabel}</strong>
        </p>
        <form
          className="manualLocationForm"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            onSearchManualLocation();
          }}
        >
          <label htmlFor="manual-location">Search an address or demo area</label>
          <div className="manualLocationRow">
            <input
              autoComplete="street-address"
              id="manual-location"
              list="demo-location-options"
              maxLength={80}
              onChange={(event) =>
                onManualLocationQueryChange(event.target.value)
              }
              placeholder="e.g. 上海人民广场"
              value={manualLocationQuery}
            />
            <button
              disabled={
                manualLocationState === "loading" ||
                manualLocationQuery.trim().length === 0
              }
              type="submit"
            >
              {manualLocationState === "loading" ? "Searching…" : "Find"}
            </button>
          </div>
          <datalist id="demo-location-options">
            {DEMO_LOCATION_LABELS.map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
        </form>
        {manualLocationMessage ? (
          <p
            className={`filterHint manualLocationMessage manualLocationMessage--${manualLocationState}`}
            role="status"
          >
            {manualLocationMessage}
          </p>
        ) : null}
      </div>

      <fieldset className="filterGroup">
        <legend>Search radius</legend>
        <div className="choiceRow">
          {RADIUS_OPTIONS.map((radius) => (
            <label key={radius}>
              <input
                checked={preferences.radiusKm === radius}
                name="radius"
                onChange={() => update("radiusKm", radius as RadiusKm)}
                type="radio"
              />
              {radius} km
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filterGroup">
        <legend>Cuisines (choose any)</legend>
        <div className="choiceRow">
          {cuisines.map((cuisine) => (
            <label key={cuisine}>
              <input
                checked={preferences.cuisines.includes(cuisine)}
                onChange={() =>
                  update(
                    "cuisines",
                    preferences.cuisines.includes(cuisine)
                      ? preferences.cuisines.filter((value) => value !== cuisine)
                      : [...preferences.cuisines, cuisine],
                  )
                }
                type="checkbox"
              />
              {cuisine}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="filterGroup sortControls">
        <label>
          Sort by
          <select
            value={preferences.sortField}
            onChange={(event) => update("sortField", event.target.value as SortField)}
          >
            <option value="distance">Distance</option>
            <option value="rating">Rating</option>
            <option value="price">Average price</option>
          </select>
        </label>
        <label>
          Order
          <select
            aria-label="Sort order"
            value={preferences.sortDirection}
            onChange={(event) => update("sortDirection", event.target.value as SortDirection)}
          >
            <option value="asc">{directionLabel(preferences.sortField, "asc")}</option>
            <option value="desc">{directionLabel(preferences.sortField, "desc")}</option>
          </select>
        </label>
      </div>

      <div className="filterGroup">
        <h2>Provider priority</h2>
        <p className="filterHint">Drag providers, or use the move buttons.</p>
        <ol className="providerOrder">
          {preferences.providerOrder.map((provider, index) => (
            <li
              draggable
              key={provider}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", provider)}
              onDrop={(event) => dropProvider(event, provider)}
            >
              <span>{index + 1}. {PROVIDER_NAMES[provider]}</span>
              <span>
                <button
                  aria-label={`Move ${PROVIDER_NAMES[provider]} up`}
                  disabled={index === 0}
                  onClick={() => onMoveProvider(provider, -1)}
                  type="button"
                >↑</button>
                <button
                  aria-label={`Move ${PROVIDER_NAMES[provider]} down`}
                  disabled={index === preferences.providerOrder.length - 1}
                  onClick={() => onMoveProvider(provider, 1)}
                  type="button"
                >↓</button>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="srStatus" role="status" aria-live="polite">
        {resultCount} restaurants shown. Radius {preferences.radiusKm} kilometers.
        {preferences.cuisines.length
          ? ` Cuisines: ${preferences.cuisines.join(", ")}.`
          : " All cuisines."}
        {` Sorted by ${preferences.sortField}, ${directionLabel(preferences.sortField, preferences.sortDirection).toLowerCase()}.`}
      </p>
    </aside>
  );
}
