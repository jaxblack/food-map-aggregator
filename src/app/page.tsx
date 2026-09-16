import { PlaceExplorer } from "@/features/places/components/place-explorer";
import { getPlaces } from "@/features/places/server/get-places";

export default async function Home() {
  const data = await getPlaces("demo");

  return (
    <main>
      <PlaceExplorer {...data} />
    </main>
  );
}
