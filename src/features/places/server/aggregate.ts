import type {
  Place,
  PlacesQuery,
  ProviderId,
  ProviderStatus,
} from "@/features/places/model/types";
import { distanceMeters, isValidCoordinates } from "./geo";
import type { PlaceProviderAdapter, ProviderPlace } from "./provider";

const DUPLICATE_DISTANCE_METERS = 50;

interface RankedPlace extends Place {
  providerPriority: number;
  sequence: number;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizedName(value: string): string {
  return normalizeText(value).toLocaleLowerCase("en");
}

function normalizePlace(
  place: ProviderPlace,
  provider: ProviderId,
  providerPriority: number,
  center: PlacesQuery["center"],
  sequence: number,
): RankedPlace | null {
  const name = normalizeText(place.name);
  const cuisine = normalizeText(place.cuisine);
  const neighborhood = normalizeText(place.neighborhood);

  if (
    !name ||
    !cuisine ||
    !neighborhood ||
    !isValidCoordinates(place.coordinates) ||
    !Number.isFinite(place.rating) ||
    place.rating < 0 ||
    place.rating > 5
  ) {
    return null;
  }

  return {
    id: `${provider}-${place.externalId}`,
    name,
    cuisine,
    neighborhood,
    priceLevel: place.priceLevel,
    rating: place.rating,
    coordinates: place.coordinates,
    sourceProviders: [provider],
    distanceMeters: Math.round(distanceMeters(center, place.coordinates)),
    providerPriority,
    sequence,
  };
}

function matchesFilters(place: RankedPlace, query: PlacesQuery): boolean {
  if ((place.distanceMeters ?? Infinity) > query.radiusMeters) {
    return false;
  }
  if (
    query.category &&
    !place.cuisine.toLocaleLowerCase("en").includes(
      query.category.toLocaleLowerCase("en"),
    )
  ) {
    return false;
  }
  if (query.maxPriceLevel && place.priceLevel > query.maxPriceLevel) {
    return false;
  }
  return query.minRating === undefined || place.rating >= query.minRating;
}

function deduplicate(places: RankedPlace[]): RankedPlace[] {
  const unique: RankedPlace[] = [];

  for (const place of places) {
    const duplicate = unique.find(
      (candidate) =>
        normalizedName(candidate.name) === normalizedName(place.name) &&
        distanceMeters(candidate.coordinates, place.coordinates) <=
          DUPLICATE_DISTANCE_METERS,
    );

    if (!duplicate) {
      unique.push(place);
      continue;
    }

    duplicate.sourceProviders = [
      ...(duplicate.sourceProviders ?? []),
      ...(place.sourceProviders ?? []),
    ];
  }

  return unique;
}

export async function aggregatePlaces(
  adapters: readonly PlaceProviderAdapter[],
  query: PlacesQuery,
): Promise<{ places: Place[]; statuses: ProviderStatus[] }> {
  const orderedAdapters = [...adapters].sort(
    (left, right) => left.priority - right.priority,
  );
  const results = await Promise.all(
    orderedAdapters.map(async (adapter) => ({
      adapter,
      result: await adapter.search(query),
    })),
  );
  let sequence = 0;
  const places = results
    .flatMap(({ adapter, result }) =>
      result.places.map((place) =>
        normalizePlace(
          place,
          adapter.id,
          adapter.priority,
          query.center,
          sequence++,
        ),
      ),
    )
    .filter((place): place is RankedPlace => place !== null)
    .filter((place) => matchesFilters(place, query))
    .sort(
      (left, right) =>
        left.providerPriority - right.providerPriority ||
        (left.distanceMeters ?? 0) - (right.distanceMeters ?? 0) ||
        left.sequence - right.sequence,
    );

  return {
    places: deduplicate(places)
      .slice(0, query.limit)
      .map(({ providerPriority: _priority, sequence: _sequence, ...place }) => place),
    statuses: results.map(({ result }) => result.status),
  };
}
