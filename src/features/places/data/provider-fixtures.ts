import type { ProviderId } from "@/features/places/model/types";
import type { ProviderPlace } from "@/features/places/server/provider";

export const PROVIDER_FIXTURES: Readonly<
  Record<ProviderId, readonly ProviderPlace[]>
> = {
  amap: [
    {
      externalId: "harbor-noodles",
      name: "Harbor Noodles",
      cuisine: "Noodles",
      neighborhood: "North Quay",
      priceLevel: 2,
      rating: 4.7,
      coordinates: { latitude: 22.3005, longitude: 114.1722 },
    },
  ],
  meituan: [
    {
      externalId: "garden-table",
      name: "Garden Table",
      cuisine: "Vegetarian",
      neighborhood: "Jade Market",
      priceLevel: 2,
      rating: 4.5,
      coordinates: { latitude: 22.2977, longitude: 114.177 },
    },
  ],
  eleme: [
    {
      externalId: "ember-kitchen",
      name: "Ember Kitchen",
      cuisine: "Grill",
      neighborhood: "Lantern Hill",
      priceLevel: 3,
      rating: 4.8,
      coordinates: { latitude: 22.3032, longitude: 114.1812 },
    },
  ],
  douyin: [
    {
      externalId: "harbor-noodles-copy",
      name: " Harbor  Noodles ",
      cuisine: "Noodles",
      neighborhood: "North Quay",
      priceLevel: 2,
      rating: 4.6,
      coordinates: { latitude: 22.30052, longitude: 114.17222 },
    },
  ],
};
