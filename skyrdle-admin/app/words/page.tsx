import { fetchSuggestions, type Suggestion } from "../lib/admin-data";
import WordsClient from "./WordsClient";

function formatError(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

export const metadata = {
  title: "Words | Skyrdle Admin",
};

export default async function WordsPage() {
  let suggestions: Suggestion[] = [];
  let error: string | null = null;

  try {
    suggestions = await fetchSuggestions();
  } catch (e) {
    error = formatError(e);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-400">
            Words
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Allowed, not yet scheduled</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Remaining backlog to assign to future games.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                Suggested Words
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Allowed words not yet used as games.
              </p>
            </div>
            <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
              {suggestions.length} remaining
            </div>
          </div>

          {error ? (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
              Failed to load suggestions: {error}
            </div>
          ) : (
            <WordsClient initialSuggestions={suggestions} />
          )}
        </section>
      </main>
    </div>
  );
}

