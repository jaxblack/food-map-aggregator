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
    sourceProviders: ["amap", "douyin"],
    sources: [
      {
        provider: "amap",
        mode: "demo",
        externalId: "harbor-noodles",
        url: "https://www.amap.com/search?query=Harbor%20Noodles",
      },
      {
        provider: "douyin",
        mode: "demo",
        externalId: "harbor-noodles-copy",
        url: "https://www.douyin.com/search/Harbor%20Noodles",
      },
    ],
  },
  {
    id: "garden-table",
    name: "Garden Table",
    cuisine: "Vegetarian",
    neighborhood: "Jade Market",
    priceLevel: 2,
    rating: 4.5,
    coordinates: { latitude: 22.2977, longitude: 114.177 },
    sourceProviders: ["meituan"],
    sources: [
      {
        provider: "meituan",
        mode: "demo",
        externalId: "garden-table",
        url: "https://www.meituan.com/s/?w=Garden%20Table",
      },
    ],
  },
  {
    id: "ember-kitchen",
    name: "Ember Kitchen",
    cuisine: "Grill",
    neighborhood: "Lantern Hill",
    priceLevel: 3,
    rating: 4.8,
    coordinates: { latitude: 22.3032, longitude: 114.1812 },
    sourceProviders: ["eleme"],
    sources: [
      {
        provider: "eleme",
        mode: "demo",
        externalId: "ember-kitchen",
        url: "https://www.ele.me/",
      },
    ],
  },
] as const;
