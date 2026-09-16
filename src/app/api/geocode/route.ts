import { NextRequest, NextResponse } from "next/server";

import {
  GeocodeError,
  geocodeLocation,
} from "@/features/places/server/geocode";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const result = await geocodeLocation(query);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof GeocodeError) {
      const status =
        error.code === "invalid_query"
          ? 400
          : error.code === "not_found"
            ? 404
            : 502;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    throw error;
  }
}
