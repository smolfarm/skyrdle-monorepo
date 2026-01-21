import { fetchGameStats, type GameStats } from "../lib/admin-data";

export const metadata = {
  title: "Games | Skyrdle Admin",
};

export default async function GamesPage() {
  let games: GameStats[] = [];
  let error: string | null = null;

  try {
    games = await fetchGameStats();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    error = message;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-400">
            Games
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Game performance</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Per-game outcomes and average score.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                Games
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Performance by game number and word.
              </p>
            </div>
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
