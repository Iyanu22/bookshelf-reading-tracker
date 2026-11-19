"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { GuestRepository } from "@/lib/data/guest-repository";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { useLibrary } from "@/lib/store/library-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GUEST_COOKIE } from "@/lib/supabase/config";

const hasGuestCookie = () => document.cookie.split("; ").some((c) => c === `${GUEST_COOKIE}=1`);

/** Chooses the persistence backend once per session and loads the library. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const init = useLibrary((s) => s.init);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data.user) {
          await init(new SupabaseRepository(supabase, data.user.id));
          return;
        }
      }
      if (hasGuestCookie()) {
        await init(new GuestRepository());
        return;
      }
      router.replace("/sign-in");
    })();
    return () => {
      cancelled = true;
    };
  }, [init, router]);

  return children;
}
