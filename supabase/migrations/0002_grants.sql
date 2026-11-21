-- Table privileges for signed-in users.
--
-- Newer Supabase projects no longer grant the API roles access to new tables
-- automatically, so without this every request fails with "permission denied"
-- before row-level security is even consulted. RLS policies (0001) still decide
-- *which rows* a user can touch; these grants only decide *which operations*
-- the role may attempt. Signed-out visitors (anon) get nothing: guest mode never
-- talks to the database. Safe to re-run.

grant usage on schema public to authenticated;

-- Shared catalog: read and add, never edit or delete.
grant select, insert on public.books to authenticated;

grant select, insert, update, delete on
  public.shelves,
  public.library_entries,
  public.progress_events,
  public.reading_goals,
  public.preferences
to authenticated;

grant execute on function public.delete_shelf(uuid, uuid) to authenticated;
revoke execute on function public.delete_shelf(uuid, uuid) from anon, public;
