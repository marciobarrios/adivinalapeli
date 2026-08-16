export type ThemeId =
  | "mix"
  | "family"
  | "disney"
  | "80s"
  | "90s"
  | "2000s"
  | "2010s"
  | "2020s"
  | "animation";

export type MovieSource = "tmdb" | "fallback";

export interface Movie {
  id: number;
  title: string;
  originalTitle: string;
  year: number;
  runtime: number | null;
  genres: string[];
  posterPath: string | null;
  emoji: string;
  themes: ThemeId[];
  tmdbUrl: string;
  source: MovieSource;
}

export interface MovieCatalog {
  version: 2;
  generatedAt: string | null;
  refreshAfter: string | null;
  source: "tmdb" | "fallback" | "mixed";
  movies: Movie[];
}

export interface GameTheme {
  id: ThemeId;
  name: string;
  description: string;
  emoji: string;
}
