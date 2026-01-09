import { fetchSuggestions, type Suggestion } from "../lib/admin-data";

export const metadata = {
  title: "Words | Skyrdle Admin",
};

export default async function WordsPage() {
  let suggestions: Suggestion[] = [];
  let error: string | null = null;

  try {
    suggestions = await fetchSuggestions();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    error = message;
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
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
              No suggestions found. All allowed words may already be games.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-t border-zinc-200 text-sm dark:border-zinc-800">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">#</th>
                    <th className="px-4 py-2 text-left font-medium">Word</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((suggestion, index) => (
                    <tr
                      key={`${suggestion.word}-${index}`}
                      className="border-t border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      <td className="whitespace-nowrap px-4 py-2 align-middle text-sm font-medium">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 align-middle text-sm font-mono uppercase tracking-wide">
                        {suggestion.word}
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
