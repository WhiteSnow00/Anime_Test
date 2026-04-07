import AnimePage from "@/components/anime-page";
import { animeData } from "@/data/anime";
// import { animeWhaData } from "@/data/anime-wha";

export default function WhaPage() {
  return (
    <main>
      {/* Tạm dùng config của index để test, đổi sang animeWhaData khi có data thật */}
      <AnimePage animeData={animeData} />
    </main>
  );
}
