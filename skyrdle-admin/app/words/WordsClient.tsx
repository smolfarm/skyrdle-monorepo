"use client";

import { useEffect, useState } from "react";
import { scheduleSuggestedWord, type Suggestion } from "../lib/admin-data";

function formatError(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

export default function WordsClient({ initialSuggestions }: { initialSuggestions: Suggestion[] }) {
  const [items, setItems] = useState(initialSuggestions);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingWord, setLoadingWord] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleSchedule(word: string) {
    setLoadingWord(word);
    try {
      await scheduleSuggestedWord(word);
      setItems((prev) => prev.filter((item) => item.word !== word));
      setToast({ type: "success", message: `Scheduled ${word.toUpperCase()}` });
    } catch (e) {
      setToast({ type: "error", message: formatError(e) });
    } finally {
      setLoadingWord(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
        No suggestions found. All allowed words may already be games.
        <Toast toast={toast} />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full border-t border-zinc-200 text-sm dark:border-zinc-800">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 text-left font-medium">#</th>
              <th className="px-4 py-2 text-left font-medium">Word</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((suggestion, index) => (
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
                <td className="whitespace-nowrap px-4 py-2 text-right align-middle text-sm">
                  <button
                    onClick={() => handleSchedule(suggestion.word)}
                    disabled={loadingWord === suggestion.word}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-black ${
                      loadingWord === suggestion.word
                        ? "cursor-not-allowed bg-sky-300 dark:bg-sky-700"
                        : "bg-sky-600 hover:bg-sky-500 focus:ring-sky-500"
                    }`}
                  >
                    {loadingWord === suggestion.word ? "Scheduling..." : "Schedule"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Toast toast={toast} />
    </>
  );
}

function Toast({ toast }: { toast: { type: "success" | "error"; message: string } | null }) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div
      className={`fixed right-4 top-4 z-50 min-w-[240px] max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-100"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-100"
      }`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}
