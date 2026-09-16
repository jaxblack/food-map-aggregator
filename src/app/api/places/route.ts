import { NextRequest, NextResponse } from "next/server";

import {
  getPlaces,
  isSourceMode,
} from "@/features/places/server/get-places";

export function GET(request: NextRequest) {
  const requestedSource = request.nextUrl.searchParams.get("source");

  if (requestedSource !== null && !isSourceMode(requestedSource)) {
    return NextResponse.json(
      { error: 'Invalid source mode. Use "demo" or "live".' },
      { status: 400 },
    );
  }

  return NextResponse.json(getPlaces(requestedSource ?? "demo"));
}
