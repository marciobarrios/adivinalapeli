import { GameApp } from "@/components/game/game-app";
import catalogData from "@/data/movies.generated.json";
import type { MovieCatalog } from "@/lib/types";

const catalog = catalogData as MovieCatalog;

export default function Home() {
  return <GameApp movies={catalog.movies} />;
}
