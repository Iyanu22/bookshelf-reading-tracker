"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useLibrary } from "@/lib/store/library-store";

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert };

/** One persistent polite live region, so every notification is announced exactly once. */
export function Toaster() {
  const toasts = useLibrary((s) => s.toasts);
  const dismiss = useLibrary((s) => s.dismissToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-md animate-fade-in items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-lg"
            >
              <Icon
                aria-hidden
                size={18}
                className={`mt-0.5 shrink-0 ${t.tone === "error" ? "text-error" : t.tone === "success" ? "text-success" : "text-accent"}`}
              />
              <p className="flex-1 text-text-primary">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-m-2 grid size-9 place-items-center rounded text-text-tertiary hover:text-text-primary"
              >
                <X aria-hidden size={16} />
              </button>
            </div>
          );
        })}
    </div>
  );
}
