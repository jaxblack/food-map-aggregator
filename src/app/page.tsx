import { PlaceExplorer } from "@/features/places/components/place-explorer";
import { getPlaces } from "@/features/places/server/get-places";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getPlaces("auto");

  return (
    <main>
      <PlaceExplorer {...data} />
    </main>
  );
}
