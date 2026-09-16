import { PlaceExplorer } from "@/features/places/components/place-explorer";
import { getPlaces } from "@/features/places/server/get-places";

export default function Home() {
  const data = getPlaces("demo");

  return (
    <main>
      <PlaceExplorer {...data} />
    </main>
  );
}
