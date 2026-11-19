"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GuestRepository } from "@/lib/data/guest-repository";
import { useLibrary } from "@/lib/store/library-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GUEST_COOKIE } from "@/lib/supabase/config";

export function AccountMenu() {
  const mode = useLibrary((s) => s.mode);
  const router = useRouter();

  if (mode === "guest") {
    return (
      <Link
        href="/sign-up"
        className="ml-1 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent-hover"
      >
        Sign up
      </Link>
    );
  }

  if (mode !== "account") return <span aria-hidden className="size-10 rounded-full bg-bg-tertiary" />;

  return (
    <button
      type="button"
      onClick={async () => {
        await getSupabaseBrowserClient()?.auth.signOut();
        document.cookie = `${GUEST_COOKIE}=; Max-Age=0; path=/`;
        GuestRepository.clear();
        router.replace("/");
        router.refresh();
      }}
      className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
    >
      <UserRound aria-hidden size={18} className="sm:hidden" />
      <LogOut aria-hidden size={18} className="hidden sm:block" />
      Sign out
    </button>
  );
}
