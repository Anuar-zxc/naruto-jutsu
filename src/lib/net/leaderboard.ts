/**
 * Online leaderboard client. The server keeps the best score per nickname per
 * board (see app/api/leaderboard). Everything fails soft: no network → empty list.
 */
export interface LbEntry {
  nick: string;
  score: number;
  hero: string;
}
export interface LbBoard {
  board: string;
  entries: LbEntry[];
  /** false when the server has no database attached (scores live only in memory). */
  persistent: boolean;
}

const URL_ = "/api/leaderboard";

export async function fetchBoard(board: string): Promise<LbBoard> {
  try {
    const r = await fetch(`${URL_}?board=${encodeURIComponent(board)}`, { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const j = (await r.json()) as Partial<LbBoard>;
    return { board, entries: Array.isArray(j.entries) ? j.entries : [], persistent: !!j.persistent };
  } catch {
    return { board, entries: [], persistent: false };
  }
}

export async function submitScore(board: string, nick: string, score: number, hero: string): Promise<boolean> {
  if (typeof fetch === "undefined" || !nick || !(score > 0)) return false;
  try {
    const r = await fetch(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ board, nick, score: Math.floor(score), hero }) });
    return r.ok;
  } catch {
    return false;
  }
}
