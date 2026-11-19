"use client";

import { BarChart3, BookCheck, Bookmark, BookOpen, Compass, Library, Plus, Star, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useShelfCounts, useSortedShelves } from "@/lib/store/hooks";
import { useLibrary } from "@/lib/store/library-store";
import type { Shelf } from "@/lib/types";

export function shelfIcon(shelf: Pick<Shelf, "kind" | "name">): LucideIcon {
  if (shelf.kind === "reading") return BookOpen;
  if (shelf.kind === "want") return Bookmark;
  if (shelf.kind === "read") return BookCheck;
  return /favou?rite/i.test(shelf.name) ? Star : Library;
}

function NavItem({
  href,
  icon: Icon,
  label,
  count,
  active,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  count?: number;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] transition-colors ${
          active
            ? "bg-accent-subtle font-medium text-accent before:absolute before:inset-y-1.5 before:-left-4 before:w-[3px] before:rounded-r before:bg-accent"
            : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
        }`}
      >
        <Icon aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className="text-sm text-text-tertiary tabular-nums">
            {count}
            <span className="sr-only"> books</span>
          </span>
        )}
      </Link>
    </li>
  );
}

function NewShelfForm() {
  const createShelf = useLibrary((s) => s.createShelf);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-[0.9375rem] text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
      >
        <Plus aria-hidden size={18} strokeWidth={1.75} />
        New shelf
      </button>
    );
  }
  return (
    <form
      className="px-1"
      onSubmit={async (e) => {
        e.preventDefault();
        const shelf = await createShelf(name);
        if (shelf) {
          setName("");
          setOpen(false);
        }
      }}
    >
      <label htmlFor="new-shelf" className="sr-only">
        New shelf name
      </label>
      <input
        id="new-shelf"
        autoFocus
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        onBlur={() => !name && setOpen(false)}
        placeholder="e.g. Book Club 2026"
        className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
    </form>
  );
}

/** Shelf list with counts — the primary navigation, shared by sidebar and mobile sheet. */
export function ShelfNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const shelves = useSortedShelves();
  const counts = useShelfCounts();
  const total = useLibrary((s) => s.entries.length);
  const ready = useLibrary((s) => s.status === "ready");

  return (
    <div>
      <p id="shelves-heading" className="px-3 text-xs font-semibold tracking-wider text-text-tertiary uppercase">
        Library
      </p>
      <ul aria-labelledby="shelves-heading" className="mt-2 space-y-0.5">
        <NavItem
          href="/library"
          icon={Library}
          label="Overview"
          active={pathname === "/library"}
          onNavigate={onNavigate}
        />
        <NavItem
          href="/discover"
          icon={Compass}
          label="Discover"
          active={pathname === "/discover"}
          onNavigate={onNavigate}
        />
        <NavItem
          href="/stats"
          icon={BarChart3}
          label="Stats"
          active={pathname === "/stats"}
          onNavigate={onNavigate}
        />
        <NavItem
          href="/shelves/all"
          icon={BookOpen}
          label="All Books"
          count={ready ? total : undefined}
          active={pathname === "/shelves/all"}
          onNavigate={onNavigate}
        />
      </ul>
      <p className="mt-6 px-3 text-xs font-semibold tracking-wider text-text-tertiary uppercase">Shelves</p>
      {!ready ? (
        <ul aria-hidden className="mt-2 space-y-2 px-3">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-7 animate-pulse rounded bg-bg-tertiary" />
          ))}
        </ul>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {shelves.map((s) => (
            <NavItem
              key={s.id}
              href={`/shelves/${s.id}`}
              icon={shelfIcon(s)}
              label={s.name}
              count={counts[s.id] ?? 0}
              active={pathname === `/shelves/${s.id}`}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
      <div className="mt-1">
        <NewShelfForm />
      </div>
    </div>
  );
}
