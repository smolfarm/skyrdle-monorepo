export type GameStats = {
  gameNumber: number;
  word: string;
  gamesWon: number;
  gamesLost: number;
  avgScore: number;
};

export type Suggestion = {
  word: string;
};

const baseUrl = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || "http://localhost:3000";

export async function fetchGameStats(limit?: number): Promise<GameStats[]> {
  const url = new URL("/api/games/stats", baseUrl);
  if (limit) {
    url.searchParams.set("limit", String(limit));
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch game stats");
  }
  return res.json();
}

export async function fetchSuggestions(limit = 100): Promise<Suggestion[]> {
  const url = new URL("/api/games/suggestions", baseUrl);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch suggestions");
  }
  return res.json();
}

export async function scheduleSuggestedWord(word: string) {
  const res = await fetch(new URL("/api/games/schedule", baseUrl).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data?.error || "Failed to schedule word";
    throw new Error(message);
  }

  return res.json() as Promise<{ gameNumber: number; word: string }>;
}
