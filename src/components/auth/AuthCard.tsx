import Link from "next/link";
import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "../ui/Logo";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-5 py-10">
      <Logo />
      <main className="mt-10 w-full max-w-sm">
        <h1 className="text-center text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-text-secondary">{subtitle}</p>}
        <div className="mt-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          {isSupabaseConfigured ? (
            children
          ) : (
            <div role="status" className="text-sm text-text-secondary">
              <p className="font-medium text-text-primary">Accounts aren&apos;t switched on in this deployment yet.</p>
              <p className="mt-2">You can still explore everything with the sample library.</p>
              <a
                href="/guest"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent font-semibold text-bg-primary hover:bg-accent-hover"
              >
                Try as guest
              </a>
            </div>
          )}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div>}
        <p className="mt-4 text-center text-sm">
          <a href="/guest" className="text-text-tertiary underline underline-offset-2 hover:text-text-primary">
            Just looking? Try the sample library
          </a>
        </p>
      </main>
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover">
      {children}
    </Link>
  );
}
