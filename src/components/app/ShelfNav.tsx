"use client";

import { ArrowDown, ArrowUp, BarChart3, BookCheck, Bookmark, BookOpen, Check, Compass, Library, Plus, Star, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
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
  // The input unmounts on close; when the reader closed it from the keyboard (Escape or
  // Enter), put focus back on the trigger instead of dropping it to <body>.
  const refocusTrigger = useRef(false);
  const close = (refocus: boolean) => {
    refocusTrigger.current = refocus;
    setName("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        ref={(el) => {
          if (el && refocusTrigger.current) {
            refocusTrigger.current = false;
            el.focus();
          }
        }}
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
        if (shelf) close(true);
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
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault(); // don't also close the mobile shelves sheet around us
          close(true);
        }}
        // Leaving an empty field by click/Tab: focus already went where the reader chose.
        onBlur={() => !name && close(false)}
        placeholder="e.g. Book Club 2026"
        className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
    </form>
  );
}

/**
 * Reorder mode: explicit move-up / move-down buttons rather than drag-and-drop,
 * so it works the same with a mouse, a keyboard, a screen reader or a thumb.
 */
function ReorderList() {
  const shelves = useSortedShelves();
  const reorderShelves = useLibrary((s) => s.reorderShelves);
  const [announcement, setAnnouncement] = useState("");

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= shelves.length) return;
    const ids = shelves.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderShelves(ids);
    setAnnouncement(`${shelves[index].name} moved to position ${target + 1} of ${shelves.length}.`);
  };

  const btn =
    "grid size-10 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30 lg:size-7";

  return (
    <>
      <ol aria-label="Reorder shelves" className="mt-2 space-y-0.5">
        {shelves.map((s, i) => {
          const Icon = shelfIcon(s);
          return (
            <li key={s.id} className="flex min-h-11 items-center gap-2 rounded-md bg-bg-tertiary/50 pr-0.5 pl-3 text-[0.9375rem]">
              <Icon aria-hidden size={18} strokeWidth={1.75} className="shrink-0 text-text-tertiary" />
              <span className="min-w-0 flex-1 truncate" title={s.name}>
                {s.name}
              </span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${s.name} up`} className={btn}>
                <ArrowUp aria-hidden size={16} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === shelves.length - 1}
                aria-label={`Move ${s.name} down`}
                className={btn}
              >
                <ArrowDown aria-hidden size={16} />
              </button>
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

/** Shelf list with counts — the primary navigation, shared by sidebar and mobile sheet. */
export function ShelfNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const shelves = useSortedShelves();
  const counts = useShelfCounts();
  const total = useLibrary((s) => s.entries.length);
  const ready = useLibrary((s) => s.status === "ready");
  const [reordering, setReordering] = useState(false);

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
      <div className="mt-6 flex items-center justify-between pr-1 pl-3">
        <p className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Shelves</p>
        {ready && shelves.length > 1 && (
          <button
            type="button"
            onClick={() => setReordering((r) => !r)}
            aria-pressed={reordering}
            className="inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-medium text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary"
          >
            {reordering ? (
              <>
                <Check aria-hidden size={14} /> Done
              </>
            ) : (
              "Reorder"
            )}
          </button>
        )}
      </div>
      {!ready ? (
        <ul aria-hidden className="mt-2 space-y-2 px-3">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-7 animate-pulse rounded bg-bg-tertiary" />
          ))}
        </ul>
      ) : reordering ? (
        <ReorderList />
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
      {!reordering && (
        <div className="mt-1">
          <NewShelfForm />
        </div>
      )}
    </div>
  );
}
