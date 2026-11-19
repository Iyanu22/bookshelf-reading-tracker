"use client";

import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLibrary } from "@/lib/store/library-store";

const DISMISS_KEY = "bookshelf-guest-banner-dismissed";

/** A gentle, dismissible note — never covers book content or gates features. */
export function GuestBanner() {
  const mode = useLibrary((s) => s.mode);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (mode !== "guest" || dismissed) return null;

  return (
    <div className="border-b border-border-subtle bg-accent-subtle px-4 py-2.5 sm:px-6 lg:px-10">
      <div className="flex items-center gap-3 text-sm">
        <Sparkles aria-hidden size={16} className="shrink-0 text-accent" />
        <p className="flex-1 text-text-secondary">
          You&apos;re exploring a sample library. Changes last until you close this tab —{" "}
          <Link href="/sign-up" className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover">
            create a free account
          </Link>{" "}
          to keep your own shelves, progress and notes.
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          className="grid size-9 shrink-0 place-items-center rounded text-text-tertiary hover:text-text-primary"
        >
          <X aria-hidden size={16} />
        </button>
      </div>
    </div>
  );
}
