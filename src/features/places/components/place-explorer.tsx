"use client";

import { useEffect, useMemo, useState } from "react";

import { FilterPanel, type GeolocationState } from "./filter-panel";
import { MapView } from "./map-view";
import { DEFAULT_CENTER } from "@/features/places/server/get-places";
import { distanceMeters } from "@/features/places/server/geo";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  moveProvider,
  savePreferences,
  sortPlaces,
  type PlacePreferences,
} from "@/features/places/model/preferences";
import type {
  Coordinates,
  Place,
  ProviderStatus,
  SourceMode,
} from "@/features/places/model/types";

interface PlaceExplorerProps {
  places: Place[];
  providerStatus: ProviderStatus;
  sourceMode: SourceMode;
}

export function PlaceExplorer({
  places,
  providerStatus,
  sourceMode,
}: PlaceExplorerProps) {
  const [selectedId, setSelectedId] = useState(places[0]?.id ?? null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [geolocationState, setGeolocationState] =
    useState<GeolocationState>("demo");

  useEffect(() => {
    setPreferences(loadPreferences(window.localStorage));
  }, []);

  const updatePreferences = (next: PlacePreferences) => {
    setPreferences(next);
    savePreferences(window.localStorage, next);
  };

  const cuisines = useMemo(
    () => [...new Set(places.map((place) => place.cuisine))].sort(),
    [places],
  );
  const visiblePlaces = useMemo(() => {
    const located = places.map((place) => ({
      ...place,
      distanceMeters: Math.round(distanceMeters(center, place.coordinates)),
    }));
    const filtered = located.filter(
      (place) =>
        (place.distanceMeters ?? Infinity) <= preferences.radiusKm * 1_000 &&
        (preferences.cuisines.length === 0 ||
          preferences.cuisines.includes(place.cuisine)),
    );
    return sortPlaces(filtered, preferences.sortField, preferences.sortDirection);
  }, [center, places, preferences]);
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedId);

  const requestLocation = () => {
    setGeolocationState("loading");
    if (!navigator.geolocation) {
      setCenter(DEFAULT_CENTER);
      setGeolocationState("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCenter({ latitude: coords.latitude, longitude: coords.longitude });
        setGeolocationState("success");
      },
      ({ code }) => {
        setCenter(DEFAULT_CENTER);
        setGeolocationState(code === 1 ? "denied" : "error");
      },
    );
  };

  const useDemoLocation = () => {
    setCenter(DEFAULT_CENTER);
    setGeolocationState("demo");
  };

  return (
    <section className="explorer" aria-label="Food map explorer">
      <header className="explorerHeader">
        <div>
          <p className="eyebrow">Source: {sourceMode}</p>
          <h1>Find a table nearby</h1>
          <p className="intro">
            A deterministic demo of a food map, ready for a real provider later.
          </p>
        </div>
        <p className={`status status--${providerStatus.state}`} role="status">
          <span aria-hidden="true" />
          {providerStatus.provider}: {providerStatus.message}
        </p>
      </header>

      <FilterPanel
        cuisines={cuisines}
        geolocationState={geolocationState}
        onChange={updatePreferences}
        onMoveProvider={(provider, offset) =>
          updatePreferences({
            ...preferences,
            providerOrder: moveProvider(
              preferences.providerOrder,
              provider,
              offset,
            ),
          })
        }
        onRequestLocation={requestLocation}
        onUseDemoLocation={useDemoLocation}
        preferences={preferences}
        resultCount={visiblePlaces.length}
      />

      <div className="explorerGrid">
        <MapView
          onSelect={setSelectedId}
          places={visiblePlaces}
          selectedId={selectedId}
        />

        <aside className="resultsPanel" aria-label="Restaurant results">
          <div className="sheetHandle" aria-hidden="true" />
          <h2>Nearby restaurants</h2>
          <ol className="placeList" aria-label="Demo restaurants">
            {visiblePlaces.map((place, index) => {
              const selected = place.id === selectedId;
              return (
                <li key={place.id}>
                  <button
                    aria-pressed={selected}
                    className={`placeCard${selected ? " placeCard--selected" : ""}`}
                    onClick={() => setSelectedId(place.id)}
                    type="button"
                  >
                    <span className="placeNumber">{index + 1}</span>
                    <span>
                      <strong>{place.name}</strong>
                      <small>
                        {place.cuisine} · {place.neighborhood}
                      </small>
                    </span>
                    <span className="placeMeta">
                      ★ {place.rating} · {"$".repeat(place.priceLevel)} ·{" "}
                      {((place.distanceMeters ?? 0) / 1_000).toFixed(1)} km
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
        <p className="srStatus" role="status">
          {selectedPlace
            ? `${selectedPlace.name} selected.`
            : "No restaurant selected."}
        </p>
      </div>
    </section>
  );
}
