export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Lets guest mode work (and the build pass) before a Supabase project is connected. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const GUEST_COOKIE = "bookshelf_guest";

/** Routes that need either a signed-in user or an active guest session. */
export const APP_ROUTES = ["/library", "/shelves", "/books", "/search", "/discover", "/stats", "/year-in-review", "/settings"];
