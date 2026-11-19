"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { GuestRepository } from "@/lib/data/guest-repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GUEST_COOKIE } from "@/lib/supabase/config";

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  hint,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete: string;
  hint?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1.5 h-11 w-full rounded-md border border-border bg-bg-primary px-3 focus:border-accent focus:outline-none"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-tertiary">
          {hint}
        </p>
      )}
    </div>
  );
}

function Form({
  onSubmit,
  submitLabel,
  children,
}: {
  onSubmit: (data: FormData) => Promise<string | null>;
  submitLabel: string;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const message = await onSubmit(new FormData(e.currentTarget)).catch(() => "Something interrupted the request. Check your connection and try again.");
    setError(message);
    setPending(false);
  }

  return (
    <form onSubmit={handle} className="space-y-5" noValidate={false}>
      {children}
      {error && (
        <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-60"
      >
        {pending && <Loader2 aria-hidden size={16} className="animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}

/** Maps Supabase auth errors to specific, human messages. */
function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Check for typos, or reset your password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link we sent.";
  if (m.includes("already registered")) return "An account with this email already exists. Try signing in instead.";
  if (m.includes("password should be")) return "Choose a password with at least 8 characters.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  return message;
}

function leaveGuestMode() {
  document.cookie = `${GUEST_COOKIE}=; Max-Age=0; path=/`;
  GuestRepository.clear();
}

export function SignInForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  return (
    <Form
      submitLabel="Sign in"
      onSubmit={async (fd) => {
        const supabase = getSupabaseBrowserClient()!;
        const { error } = await supabase.auth.signInWithPassword({
          email: String(fd.get("email")),
          password: String(fd.get("password")),
        });
        if (error) return friendly(error.message);
        leaveGuestMode();
        router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/library");
        router.refresh();
        return null;
      }}
    >
      <Field id="email" label="Email" type="email" autoComplete="email" />
      <Field id="password" label="Password" type="password" autoComplete="current-password" />
      <p className="-mt-2 text-right text-sm">
        <Link href="/reset-password" className="text-text-secondary underline underline-offset-2 hover:text-accent">
          Forgot password?
        </Link>
      </p>
    </Form>
  );
}

export function SignUpForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const router = useRouter();
  if (sentTo) {
    return (
      <div role="status">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-2 text-sm text-text-secondary">
          We sent a confirmation link to <strong>{sentTo}</strong>. Open it to finish creating your library.
        </p>
      </div>
    );
  }
  return (
    <Form
      submitLabel="Create account"
      onSubmit={async (fd) => {
        const email = String(fd.get("email"));
        const supabase = getSupabaseBrowserClient()!;
        const { data, error } = await supabase.auth.signUp({
          email,
          password: String(fd.get("password")),
          options: { emailRedirectTo: `${location.origin}/auth/confirm?next=/library` },
        });
        if (error) return friendly(error.message);
        if (data.session) {
          leaveGuestMode();
          router.replace("/library");
          router.refresh();
        } else setSentTo(email);
        return null;
      }}
    >
      <Field id="email" label="Email" type="email" autoComplete="email" />
      <Field id="password" label="Password" type="password" autoComplete="new-password" minLength={8} hint="At least 8 characters." />
    </Form>
  );
}

export function ResetPasswordForm() {
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <p role="status" className="text-sm text-text-secondary">
        If an account exists for that email, a reset link is on its way. The link expires in one hour.
      </p>
    );
  }
  return (
    <Form
      submitLabel="Send reset link"
      onSubmit={async (fd) => {
        const supabase = getSupabaseBrowserClient()!;
        const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), {
          redirectTo: `${location.origin}/auth/confirm?next=/update-password`,
        });
        if (error) return friendly(error.message);
        setSent(true);
        return null;
      }}
    >
      <Field id="email" label="Email" type="email" autoComplete="email" />
    </Form>
  );
}

export function UpdatePasswordForm() {
  const router = useRouter();
  return (
    <Form
      submitLabel="Save new password"
      onSubmit={async (fd) => {
        const supabase = getSupabaseBrowserClient()!;
        const { error } = await supabase.auth.updateUser({ password: String(fd.get("password")) });
        if (error) return friendly(error.message);
        router.replace("/library");
        return null;
      }}
    >
      <Field id="password" label="New password" type="password" autoComplete="new-password" minLength={8} hint="At least 8 characters." />
    </Form>
  );
}
