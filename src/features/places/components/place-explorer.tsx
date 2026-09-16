"use client";

import { useState } from "react";

import type {
  Place,
  ProviderStatus,
  SourceMode,
} from "@/features/places/model/types";

interface PlaceExplorerProps {
  places: Place[];
  providerStatus: ProviderStatus;
  sourceMode: SourceMode;
}

const PIN_POSITIONS = [
  { left: "18%", top: "27%" },
  { left: "47%", top: "59%" },
  { left: "76%", top: "31%" },
] as const;

export function PlaceExplorer({
  places,
  providerStatus,
  sourceMode,
}: PlaceExplorerProps) {
  const [selectedId, setSelectedId] = useState(places[0]?.id ?? null);
  const selectedPlace = places.find((place) => place.id === selectedId);

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

      <div className="explorerGrid">
        <div className="map" aria-label="Demo map">
          <div className="mapRoad mapRoad--horizontal" />
          <div className="mapRoad mapRoad--vertical" />
          {places.map((place, index) => {
            const selected = place.id === selectedId;
            return (
              <button
                aria-label={`Show ${place.name}`}
                aria-pressed={selected}
                className="pin"
                key={place.id}
                onClick={() => setSelectedId(place.id)}
                style={PIN_POSITIONS[index % PIN_POSITIONS.length]}
                type="button"
              >
                {index + 1}
              </button>
            );
          })}
          {selectedPlace ? (
            <div className="mapCallout" aria-live="polite">
              <strong>{selectedPlace.name}</strong>
              <span>{selectedPlace.neighborhood}</span>
            </div>
          ) : null}
        </div>

        <ol className="placeList" aria-label="Demo restaurants">
          {places.map((place, index) => {
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
                    ★ {place.rating} · {"$".repeat(place.priceLevel)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
