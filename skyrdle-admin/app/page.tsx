import { fetchGameStats, type GameStats } from "./lib/admin-data";

function getCurrentGameNumber(): number {
  const epochEastern = new Date("2025-06-13T00:00:00-05:00");
  const nowEastern = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const diffDays = Math.floor(
    (nowEastern.getTime() - epochEastern.getTime()) / 86400000
  );
  return diffDays + 1;
}

export default async function Home() {
  let games: GameStats[] = []
  let error: string | null = null

  try {
    games = await fetchGameStats();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    error = message;
  }

  const totalGames = games.length;
  const totalWins = games.reduce((sum, g) => sum + g.gamesWon, 0);
  const totalLosses = games.reduce((sum, g) => sum + g.gamesLost, 0);
  const currentGameNumber = getCurrentGameNumber();
  const remainingUnplayed = games.filter((g) => {
    const totalPlays = (g.gamesWon ?? 0) + (g.gamesLost ?? 0);
    return totalPlays === 0 && g.gameNumber > currentGameNumber;
  }).length;
  const avgScoreOverall =
    games.length === 0
      ? 0
      : games.reduce((sum, g) => sum + g.avgScore, 0) / games.length;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6 md:p-10">
        <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-400">
              Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Operational overview and quick health checks.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStat
            label="Games published"
            value={totalGames}
            helper="games live"
          />
          <DashboardStat
            label="Total wins"
            value={totalWins}
            helper={`${totalLosses} losses`}
          />
          <DashboardStat
            label="Avg score"
            value={avgScoreOverall.toFixed(2)}
            helper="across all games"
          />
          <DashboardStat
            label="Remaining unplayed"
            value={remainingUnplayed}
            helper="games with zero plays"
            tone="primary"
          />
        </section>

        {error && (
          <section className="rounded-lg border border-red-200 bg-white shadow-sm dark:border-red-900 dark:bg-zinc-950">
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
              Failed to load game stats: {error}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

type DashboardStatProps = {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "primary";
};

function DashboardStat({ label, value, helper, tone = "default" }: DashboardStatProps) {
  const toneClasses =
    tone === "primary"
      ? "border-sky-200 bg-sky-50 text-sky-900 shadow-sm dark:border-sky-900/50 dark:bg-sky-900/30 dark:text-sky-100"
      : "border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";

  return (
    <div
      className={`rounded-lg border p-4 transition hover:-translate-y-[1px] hover:shadow-md ${toneClasses}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <div className="mt-2 text-3xl font-semibold leading-tight">{value}</div>
      {helper && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{helper}</p>
      )}
    </div>
  );
}
