-- Web Push subscriptions: one row per (user, device/browser). Used to
-- notify team members about inbound customer messages when the app is
-- closed — including iOS Home-Screen web apps (iOS 16.4+), which cannot
-- show in-page Notification() alerts at all.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  failed_at timestamptz
);

create index if not exists idx_push_subscriptions_account
  on public.push_subscriptions(account_id)
  where failed_at is null;

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage their own push subscriptions" on public.push_subscriptions;
create policy "Users manage their own push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
