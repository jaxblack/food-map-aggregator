import type {
  Coordinates,
  GeocodeResult,
} from "@/features/places/model/types";

interface DemoLocation extends GeocodeResult {
  aliases: readonly string[];
}

export const DEFAULT_CENTER: Coordinates = {
  latitude: 22.3005,
  longitude: 114.1722,
};

export const DEMO_LOCATIONS: readonly DemoLocation[] = [
  {
    label: "香港尖沙咀",
    coordinates: DEFAULT_CENTER,
    mode: "demo",
    provider: "built-in-demo",
    aliases: ["香港", "尖沙咀", "hong kong", "tsim sha tsui"],
  },
  {
    label: "北京国贸",
    coordinates: { latitude: 39.9097, longitude: 116.4581 },
    mode: "demo",
    provider: "built-in-demo",
    aliases: ["北京", "国贸", "beijing", "guomao"],
  },
  {
    label: "上海人民广场",
    coordinates: { latitude: 31.2304, longitude: 121.4737 },
    mode: "demo",
    provider: "built-in-demo",
    aliases: ["上海", "人民广场", "shanghai"],
  },
  {
    label: "深圳市民中心",
    coordinates: { latitude: 22.5431, longitude: 114.0579 },
    mode: "demo",
    provider: "built-in-demo",
    aliases: ["深圳", "市民中心", "shenzhen"],
  },
] as const;

export const DEMO_LOCATION_LABELS = DEMO_LOCATIONS.map(
  ({ label }) => label,
);

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function findDemoLocation(query: string): GeocodeResult | null {
  const target = normalized(query);
  if (!target) return null;

  const match = DEMO_LOCATIONS.find(({ label, aliases }) =>
    [label, ...aliases].some((candidate) => {
      const value = normalized(candidate);
      return value.includes(target) || target.includes(value);
    }),
  );
  if (!match) return null;

  return {
    label: `${match.label}（演示位置）`,
    coordinates: match.coordinates,
    mode: match.mode,
    provider: match.provider,
  };
}
