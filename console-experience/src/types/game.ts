export interface Game {
  id: string;
  title: string;
  path: string;
  image: string | null;
  last_played: number | null;
}
