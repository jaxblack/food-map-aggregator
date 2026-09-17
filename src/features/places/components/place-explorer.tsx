"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { appPath } from "@/app-path";
import {
  FilterPanel,
  type GeolocationState,
  type ManualLocationState,
} from "./filter-panel";
import { MapView } from "./map-view";
import { DEFAULT_CENTER } from "@/features/places/data/demo-locations";
import { distanceMeters } from "@/features/places/server/geo";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  moveProvider,
  savePreferences,
  sortPlaces,
  type PlacePreferences,
} from "@/features/places/model/preferences";
import { PROVIDER_NAMES } from "@/features/places/model/providers";
import type {
  Coordinates,
  GeocodeResult,
  Place,
  PlacesResponse,
  ProviderStatus,
  SourceMode,
} from "@/features/places/model/types";

interface PlaceExplorerProps {
  places: Place[];
  providerStatus: ProviderStatus;
  providerStatuses?: ProviderStatus[];
  sourceMode: SourceMode;
}

export function PlaceExplorer({
  places,
  providerStatus,
  providerStatuses = [],
  sourceMode,
}: PlaceExplorerProps) {
  const [data, setData] = useState<PlacesResponse>({
    places,
    providerStatus,
    providerStatuses,
    sourceMode,
  });
  const [selectedId, setSelectedId] = useState(places[0]?.id ?? null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [geolocationState, setGeolocationState] =
    useState<GeolocationState>("demo");
  const [locationLabel, setLocationLabel] = useState(
    "香港尖沙咀（演示位置）",
  );
  const [manualLocationQuery, setManualLocationQuery] = useState("");
  const [manualLocationState, setManualLocationState] =
    useState<ManualLocationState>("idle");
  const [manualLocationMessage, setManualLocationMessage] = useState("");
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const skipInitialSearch = useRef(true);

  useEffect(() => {
    setPreferences(loadPreferences(window.localStorage));
  }, []);

  useEffect(() => {
    if (skipInitialSearch.current) {
      skipInitialSearch.current = false;
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      source: "auto",
      lat: String(center.latitude),
      lng: String(center.longitude),
      radius: String(preferences.radiusKm * 1_000),
    });
    setSearchState("loading");
    setSearchMessage("Refreshing nearby restaurants…");

    void fetch(`${appPath("/api/places")}?${params}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null);
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Nearby search failed.";
          throw new Error(message);
        }
        return (await response.json()) as PlacesResponse;
      })
      .then((response) => {
        setData(response);
        setSearchState("idle");
        setSearchMessage("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSearchState("error");
        setSearchMessage(
          error instanceof Error
            ? `${error.message} Showing the last successful results.`
            : "Nearby search failed. Showing the last successful results.",
        );
      });

    return () => controller.abort();
  }, [center.latitude, center.longitude, preferences.radiusKm]);

  const updatePreferences = (next: PlacePreferences) => {
    setPreferences(next);
    savePreferences(window.localStorage, next);
  };

  const cuisines = useMemo(
    () => [...new Set(data.places.map((place) => place.cuisine))].sort(),
    [data.places],
  );
  const visiblePlaces = useMemo(() => {
    const located = data.places.map((place) => ({
      ...place,
      distanceMeters: Math.round(distanceMeters(center, place.coordinates)),
    }));
    const filtered = located.filter(
      (place) =>
        (place.distanceMeters ?? Infinity) <= preferences.radiusKm * 1_000 &&
        (preferences.cuisines.length === 0 ||
          preferences.cuisines.includes(place.cuisine)),
    );
    return sortPlaces(
      filtered,
      preferences.sortField,
      preferences.sortDirection,
      preferences.providerOrder,
    );
  }, [center, data.places, preferences]);
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedId);

  useEffect(() => {
    if (!visiblePlaces.some((place) => place.id === selectedId)) {
      setSelectedId(visiblePlaces[0]?.id ?? null);
    }
  }, [selectedId, visiblePlaces]);

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
        setLocationLabel(
          `Current location (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)})`,
        );
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
    setLocationLabel("香港尖沙咀（演示位置）");
    setGeolocationState("demo");
  };

  const searchManualLocation = async () => {
    const query = manualLocationQuery.trim();
    if (!query) return;
    setManualLocationState("loading");
    setManualLocationMessage("");

    try {
      const response = await fetch(
        `${appPath("/api/geocode")}?q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Address search failed.";
        throw new Error(message);
      }
      const result = payload as GeocodeResult;
      setCenter(result.coordinates);
      setLocationLabel(result.label);
      setGeolocationState("manual");
      setManualLocationState("success");
      setManualLocationMessage(
        result.mode === "demo"
          ? "Matched a deterministic demo area; restaurants remain clearly labeled demo data."
          : "Address resolved by the official Amap service.",
      );
    } catch (error) {
      setManualLocationState("error");
      setManualLocationMessage(
        error instanceof Error ? error.message : "Address search failed.",
      );
    }
  };

  const sourceDescription =
    data.sourceMode === "mixed"
      ? "Amap live + other providers demo"
      : data.sourceMode === "live"
        ? "Amap live"
        : "All providers demo";

  return (
    <section className="explorer" aria-label="Food map explorer">
      <header className="explorerHeader">
        <div>
          <p className="eyebrow">Source: {data.sourceMode}</p>
          <h1>今天吃什么？</h1>
          <p className="intro">
            Compare nearby restaurants across platforms on one map. {sourceDescription}.
          </p>
        </div>
        <p className={`status status--${data.providerStatus.state}`} role="status">
          <span aria-hidden="true" />
          {data.providerStatus.provider}: {data.providerStatus.message}
        </p>
      </header>

      {data.providerStatuses?.length ? (
        <ul className="providerStatuses" aria-label="Provider data status">
          {data.providerStatuses.map((status) => (
            <li
              className={`providerStatus providerStatus--${status.state}`}
              key={`${status.provider}-${status.mode}`}
            >
              <strong>
                {status.provider in PROVIDER_NAMES
                  ? PROVIDER_NAMES[
                      status.provider as keyof typeof PROVIDER_NAMES
                    ]
                  : status.provider}
              </strong>
              <span>{status.mode ?? "unknown"}</span>
              <small>{status.message}</small>
            </li>
          ))}
        </ul>
      ) : null}

      {searchMessage ? (
        <p
          className={`searchNotice searchNotice--${searchState}`}
          role="status"
        >
          {searchMessage}
        </p>
      ) : null}

      <div className="workspace">
        <FilterPanel
          cuisines={cuisines}
          geolocationState={geolocationState}
          locationLabel={locationLabel}
          manualLocationMessage={manualLocationMessage}
          manualLocationQuery={manualLocationQuery}
          manualLocationState={manualLocationState}
          onChange={updatePreferences}
          onManualLocationQueryChange={setManualLocationQuery}
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
          onSearchManualLocation={() => void searchManualLocation()}
          onUseDemoLocation={useDemoLocation}
          preferences={preferences}
          resultCount={visiblePlaces.length}
        />

        <div className="explorerGrid">
          <MapView
            center={center}
            onSelect={setSelectedId}
            places={visiblePlaces}
            selectedId={selectedId}
          />

          <aside className="resultsPanel" aria-label="Restaurant results">
            <div className="sheetHandle" aria-hidden="true" />
            <h2>Nearby restaurants</h2>
            <ol
              className="placeList"
              aria-label={
                data.sourceMode === "demo"
                  ? "Demo restaurants"
                  : "Restaurant results"
              }
            >
              {visiblePlaces.length === 0 ? (
                <li className="emptyResults">
                  No restaurants match this location and filter set. Try a wider
                  radius or another cuisine.
                </li>
              ) : null}
              {visiblePlaces.map((place, index) => {
                const selected = place.id === selectedId;
                const sources = [...(place.sources ?? [])].sort(
                  (left, right) =>
                    preferences.providerOrder.indexOf(left.provider) -
                    preferences.providerOrder.indexOf(right.provider),
                );
                return (
                  <li className="placeItem" key={place.id}>
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
                    {sources.length ? (
                      <div
                        className="sourceLinks"
                        aria-label={`${place.name} provider links`}
                      >
                        {sources.map((source) =>
                          source.url ? (
                            <a
                              data-mode={source.mode}
                              href={source.url}
                              key={`${source.provider}-${source.externalId}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {PROVIDER_NAMES[source.provider]}
                              {source.mode === "demo" ? " demo search" : " map"}
                            </a>
                          ) : (
                            <span
                              data-mode={source.mode}
                              key={`${source.provider}-${source.externalId}`}
                            >
                              {PROVIDER_NAMES[source.provider]} ({source.mode})
                            </span>
                          ),
                        )}
                      </div>
                    ) : null}
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
      </div>
    </section>
  );
}
