/**
 * Game source platforms
 */
export type GameSource = 'Steam' | 'Epic' | 'Xbox' | 'Manual';

/**
 * Game metadata
 */
export interface Game {
  id: string;
  raw_id: string;
  title: string;
  path: string;
  image: string | null;
  hero_image: string | null;
  logo: string | null;
  last_played: number | null;
  source: GameSource;
}
