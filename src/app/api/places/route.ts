import { NextRequest, NextResponse } from "next/server";

import {
  getPlaces,
  isSourceMode,
  MAX_RADIUS_METERS,
} from "@/features/places/server/get-places";

export async function GET(request: NextRequest) {
  const requestedSource = request.nextUrl.searchParams.get("source");

  if (requestedSource !== null && !isSourceMode(requestedSource)) {
    return NextResponse.json(
      { error: 'Invalid source mode. Use "auto", "demo", or "live".' },
      { status: 400 },
    );
  }

  const numberParam = (name: string): number | undefined => {
    const value = request.nextUrl.searchParams.get(name);
    return value === null ? undefined : Number(value);
  };
  const latitude = numberParam("lat");
  const longitude = numberParam("lng");
  const radiusMeters = numberParam("radius");
  const limit = numberParam("limit");
  const minRating = numberParam("minRating");
  const maxPriceLevel = numberParam("maxPrice");

  if (
    [latitude, longitude, radiusMeters, limit, minRating, maxPriceLevel].some(
      (value) => value !== undefined && !Number.isFinite(value),
    ) ||
    (latitude === undefined) !== (longitude === undefined) ||
    (radiusMeters !== undefined &&
      (radiusMeters <= 0 || radiusMeters > MAX_RADIUS_METERS)) ||
    (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) ||
    (minRating !== undefined && (minRating < 0 || minRating > 5)) ||
    (maxPriceLevel !== undefined &&
      (!Number.isInteger(maxPriceLevel) ||
        maxPriceLevel < 1 ||
        maxPriceLevel > 4))
  ) {
    return NextResponse.json(
      { error: "Invalid place search parameters." },
      { status: 400 },
    );
  }

  try {
    const category =
      request.nextUrl.searchParams.get("category")?.trim() || undefined;
    if (category && category.length > 60) {
      return NextResponse.json(
        { error: "Invalid place search parameters." },
        { status: 400 },
      );
    }

    const result = await getPlaces(requestedSource ?? "auto", {
      center:
        latitude !== undefined && longitude !== undefined
          ? { latitude, longitude }
          : undefined,
      radiusMeters,
      limit,
      category,
      minRating,
      maxPriceLevel: maxPriceLevel as 1 | 2 | 3 | 4 | undefined,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json(
        { error: "Invalid place search parameters." },
        { status: 400 },
      );
    }
    throw error;
  }
}
