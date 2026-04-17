import AnimePage from "@/components/anime-page";
import { animeWhaData } from "@/data/anime-wha";

export default function WhaPage() {
  return (
    <main>
      <AnimePage animeData={animeWhaData} animeSlug="wha" />
    </main>
  );
}
