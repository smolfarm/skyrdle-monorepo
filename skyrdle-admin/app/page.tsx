type GameStats = {
  gameNumber: number;
  word: string;
  gamesWon: number;
  gamesLost: number;
  avgScore: number;
};

async function fetchGameStats(): Promise<GameStats[]> {
  const res = await fetch(`/api/games/stats`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch game stats");
  }

  return res.json();
}

export default async function Home() {
  let games: GameStats[] = [];
  let error: string | null = null;

  try {
    games = await fetchGameStats();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6 md:p-10">
        <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Skyrdle Admin</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Overview of all games and their performance.
            </p>
          </div>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Games
            </h2>
          </div>

          {error ? (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
              Failed to load game stats: {error}
            </div>
          ) : games.length === 0 ? (
            <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
              No game stats available yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-t border-zinc-200 text-sm dark:border-zinc-800">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Game #</th>
                    <th className="px-4 py-2 text-left font-medium">Word</th>
                    <th className="px-4 py-2 text-right font-medium">Games Won</th>
                    <th className="px-4 py-2 text-right font-medium">Games Lost</th>
                    <th className="px-4 py-2 text-right font-medium">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr
                      key={game.gameNumber}
                      className="border-t border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      <td className="whitespace-nowrap px-4 py-2 align-middle text-sm font-medium">
                        {game.gameNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 align-middle text-sm font-mono uppercase tracking-wide">
                        {game.word}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right align-middle text-sm">
                        {game.gamesWon}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right align-middle text-sm">
                        {game.gamesLost}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right align-middle text-sm">
                        {game.avgScore.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
