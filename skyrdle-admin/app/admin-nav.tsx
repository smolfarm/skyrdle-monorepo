"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  ChartPieIcon,
  Cog6ToothIcon,
  HomeIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";

const navLinks = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/games", label: "Games", icon: RectangleGroupIcon },
  { href: "/words", label: "Add Words", icon: ChartPieIcon },
];

export default function AdminNav() {
  const pathname = usePathname();

  const activeHref = useMemo(() => {
    if (!pathname) return "/";
    const match = navLinks.find((link) =>
      pathname === "/" ? link.href === "/" : pathname.startsWith(link.href)
    );
    return match?.href ?? "/";
  }, [pathname]);

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md">
          <span className="text-lg font-semibold">SA</span>
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
            Skyrdle
          </div>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Admin</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4 text-sm">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition ${
                isActive
                  ? "bg-sky-100 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-50 dark:ring-sky-800"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 px-6 py-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Logged in as <span className="font-semibold text-zinc-700 dark:text-zinc-200">Admin</span>
      </div>
    </aside>
  );
}
