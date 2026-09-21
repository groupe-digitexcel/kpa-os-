-- KPA-OS — Super Admin foundation
-- Additive migration for existing Supabase installations.
-- Super Admin is the highest application role and is intended for manual
-- creation of school staff accounts and role administration.

alter type user_role add value if not exists 'super_admin';

-- The existing staff policies use the current role helper. Super Admin must
-- be able to perform the same staff-management operations as the Director.
drop policy if exists "staff_director_insert" on staff;
drop policy if exists "staff_director_update" on staff;

create policy "staff_admin_insert" on staff for insert
  with check (current_staff_role() in ('super_admin','director'));

create policy "staff_admin_update" on staff for update
  using (current_staff_role() in ('super_admin','director'));

-- Make the role helper explicitly understand the new role through the enum.
-- No data migration is performed: existing staff keep their current roles.
