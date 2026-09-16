"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";

import type { Place } from "@/features/places/model/types";

interface MapViewProps {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const PIN_POSITIONS = [
  { left: "18%", top: "27%" },
  { left: "47%", top: "59%" },
  { left: "76%", top: "31%" },
] as const;

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "openStreetMap",
      type: "raster",
      source: "openStreetMap",
    },
  ],
};

function StaticMap({
  places,
  selectedId,
  onSelect,
}: MapViewProps) {
  const selectedPlace = places.find((place) => place.id === selectedId);

  return (
    <div className="map map--fallback" aria-label="Fallback restaurant map">
      <div className="mapRoad mapRoad--horizontal" />
      <div className="mapRoad mapRoad--vertical" />
      {places.map((place, index) => (
        <button
          aria-label={`Show ${place.name}`}
          aria-pressed={place.id === selectedId}
          className="pin"
          key={place.id}
          onClick={() => onSelect(place.id)}
          style={PIN_POSITIONS[index % PIN_POSITIONS.length]}
          type="button"
        >
          <span>{index + 1}</span>
        </button>
      ))}
      {selectedPlace ? (
        <div className="mapCallout" aria-live="polite">
          <strong>{selectedPlace.name}</strong>
          <span>{selectedPlace.neighborhood}</span>
        </div>
      ) : null}
      <a
        className="mapAttribution"
        href="https://www.openstreetmap.org/copyright"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}

export function MapView({ places, selectedId, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    if (
      !containerRef.current ||
      typeof window.WebGLRenderingContext === "undefined"
    ) {
      setMapState("error");
      return;
    }

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: places[0]
          ? [places[0].coordinates.longitude, places[0].coordinates.latitude]
          : [114.1694, 22.3193],
        zoom: 13,
        attributionControl: false,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }));
    } catch {
      setMapState("error");
      return;
    }

    mapRef.current = map;
    map.once("load", () => setMapState("ready"));
    map.once("error", () => setMapState("error"));
    const markers = new Map<string, Marker>();
    markersRef.current = markers;

    for (const [index, place] of places.entries()) {
      const markerButton = document.createElement("button");
      markerButton.type = "button";
      markerButton.className = "mapMarker";
      markerButton.textContent = String(index + 1);
      markerButton.setAttribute("aria-label", `Show ${place.name}`);
      markerButton.setAttribute("aria-pressed", "false");
      markerButton.addEventListener("click", () => onSelect(place.id));

      const marker = new maplibregl.Marker({
        element: markerButton,
        anchor: "bottom",
      })
        .setLngLat([place.coordinates.longitude, place.coordinates.latitude])
        .addTo(map);
      markers.set(place.id, marker);
    }

    return () => {
      markers.clear();
      mapRef.current = null;
      map.remove();
    };
  }, [onSelect, places]);

  useEffect(() => {
    for (const [placeId, marker] of markersRef.current) {
      marker
        .getElement()
        .setAttribute("aria-pressed", String(placeId === selectedId));
    }
    const selectedPlace = places.find((place) => place.id === selectedId);
    if (selectedPlace && mapRef.current) {
      mapRef.current.easeTo({
        center: [
          selectedPlace.coordinates.longitude,
          selectedPlace.coordinates.latitude,
        ],
        duration: 350,
      });
    }
  }, [places, selectedId]);

  if (mapState === "error") {
    return (
      <>
        <p className="mapStatus" role="status">
          Interactive map unavailable. Showing the accessible fallback map.
        </p>
        <StaticMap
          onSelect={onSelect}
          places={places}
          selectedId={selectedId}
        />
      </>
    );
  }

  return (
    <div className="mapFrame">
      <div
        aria-label="Interactive restaurant map"
        className="map"
        ref={containerRef}
      />
      <p className="srStatus" role="status">
        {mapState === "ready" ? "Interactive map ready." : "Map loading."}
      </p>
    </div>
  );
}
