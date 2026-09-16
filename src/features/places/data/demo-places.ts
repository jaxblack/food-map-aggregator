import type { Place } from "@/features/places/model/types";

export const DEMO_PLACES: readonly Place[] = [
  {
    id: "harbor-noodles",
    name: "Harbor Noodles",
    cuisine: "Noodles",
    neighborhood: "North Quay",
    priceLevel: 2,
    rating: 4.7,
    coordinates: { latitude: 22.3005, longitude: 114.1722 },
  },
  {
    id: "garden-table",
    name: "Garden Table",
    cuisine: "Vegetarian",
    neighborhood: "Jade Market",
    priceLevel: 2,
    rating: 4.5,
    coordinates: { latitude: 22.2977, longitude: 114.177 },
  },
  {
    id: "ember-kitchen",
    name: "Ember Kitchen",
    cuisine: "Grill",
    neighborhood: "Lantern Hill",
    priceLevel: 3,
    rating: 4.8,
    coordinates: { latitude: 22.3032, longitude: 114.1812 },
  },
] as const;
