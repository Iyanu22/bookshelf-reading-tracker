-- Bookshelf schema
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- Design notes
-- * `books` is a shared, normalized catalog keyed by `key` (OL work id → ISBN-13
--   → normalized title+author). Many users can own the same book row.
-- * `library_entries` is the user's copy: shelf, dates, rating, notes, progress.
--   unique(user_id, book_id) is the hard guarantee against duplicate additions.
-- * Personal genre tags live on the entry (`genres`), falling back to the
--   catalog's genres, so one user's tagging never changes another's.
-- * `progress_events` keeps history so stats can show pace over time.
-- * Deleting a custom shelf moves its books to "Want to Read" (see delete_shelf).

create extension if not exists pgcrypto;

-- ───────────────────────────── catalog ─────────────────────────────
create table public.books (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  authors text[] not null default '{}',
  cover_url text,
  page_count int check (page_count is null or page_count > 0),
  published_year int,
  isbn10 text,
  isbn13 text,
  publisher text,
  description text,
  genres text[] not null default '{}',
  open_library_id text,
  created_at timestamptz not null default now()
);
create index books_isbn13_idx on public.books (isbn13) where isbn13 is not null;

-- ───────────────────────────── shelves ─────────────────────────────
create table public.shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('want', 'reading', 'read', 'custom')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create unique index shelves_user_name_idx on public.shelves (user_id, lower(name));
-- Exactly one of each default shelf per user.
create unique index shelves_user_default_idx on public.shelves (user_id, kind) where kind <> 'custom';

-- ───────────────────────────── library ─────────────────────────────
create table public.library_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id),
  shelf_id uuid not null references public.shelves (id) on delete restrict,
  added_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  rating smallint check (rating between 1 and 5),
  notes text not null default '',
  genres text[],
  current_page int check (current_page is null or current_page >= 0),
  progress_percent smallint check (progress_percent between 0 and 100),
  progress_updated_at timestamptz,
  unique (user_id, book_id)
);
create index library_entries_shelf_idx on public.library_entries (user_id, shelf_id);
create index library_entries_finished_idx on public.library_entries (user_id, finished_at) where finished_at is not null;
create index library_entries_genres_idx on public.library_entries using gin (genres);

create table public.progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_id uuid not null references public.library_entries (id) on delete cascade,
  at timestamptz not null default now(),
  pages_read int,
  percent smallint not null check (percent between 0 and 100)
);
create index progress_events_user_at_idx on public.progress_events (user_id, at);

create table public.reading_goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  year int not null,
  target int not null check (target > 0),
  primary key (user_id, year)
);

create table public.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_shelf_id uuid references public.shelves (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── row-level security ─────────────────────────
alter table public.books enable row level security;
alter table public.shelves enable row level security;
alter table public.library_entries enable row level security;
alter table public.progress_events enable row level security;
alter table public.reading_goals enable row level security;
alter table public.preferences enable row level security;

-- Catalog: readable and insertable by any signed-in user; never edited in place.
create policy "books are readable" on public.books for select to authenticated using (true);
create policy "books are insertable" on public.books for insert to authenticated with check (true);

create policy "own shelves" on public.shelves for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own entries" on public.library_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own progress" on public.progress_events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own goals" on public.reading_goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own preferences" on public.preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Default shelves can't be renamed into something else or deleted.
create policy "custom shelves only are deletable" on public.shelves as restrictive for delete to authenticated
  using (kind = 'custom');

-- ───────────────────────────── functions ─────────────────────────────

-- Every new account starts with the three default shelves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.shelves (user_id, name, kind, position) values
    (new.id, 'Currently Reading', 'reading', 0),
    (new.id, 'Want to Read', 'want', 1),
    (new.id, 'Read', 'read', 2);
  insert into public.preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically move a custom shelf's books to a fallback shelf, then delete it.
create or replace function public.delete_shelf(p_shelf_id uuid, p_fallback_shelf_id uuid)
returns void
language plpgsql
security invoker set search_path = ''
as $$
begin
  update public.library_entries
     set shelf_id = p_fallback_shelf_id
   where shelf_id = p_shelf_id and user_id = (select auth.uid());
  delete from public.shelves
   where id = p_shelf_id and user_id = (select auth.uid()) and kind = 'custom';
end;
$$;
