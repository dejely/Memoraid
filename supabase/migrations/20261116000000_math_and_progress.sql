begin;
alter table public.cards add column grading_mode text not null default 'self_review' check (grading_mode in ('self_review','numeric','expression'));
alter table public.cards add column numeric_tolerance double precision not null default 0.001 check (numeric_tolerance >= 0 and numeric_tolerance < 'Infinity'::double precision);
alter table public.test_questions add column grading_method text not null default 'self_review' check (grading_method in ('self_review','automatic'));
update public.test_questions set grading_method = 'automatic' where question_type <> 'written';
-- Retain earned progress after cards/decks are deleted; owner deletion still cascades.
create table public.review_events (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  card_id text not null,
  deck_id text not null,
  result text not null check(result in ('easy','hard','correct','incorrect')),
  happened_at timestamptz not null,
  study_date date not null,
  timezone text not null,
  was_due boolean not null,
  was_weak boolean not null,
  grading_method text not null check(grading_method in ('self_review','automatic')),
  primary key(user_id,id)
);
create index review_events_owner_card_day on public.review_events(user_id,card_id,study_date,happened_at);
alter table public.review_events enable row level security;
alter table public.review_events force row level security;
create policy review_events_owner_all on public.review_events for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.review_events from anon;
grant select,insert,update,delete on public.review_events to authenticated;

-- Schedule and progress event commit together. Per-card lock serializes concurrent reviews.
create function public.record_study_review(p_id text,p_card_id text,p_deck_id text,p_result text,p_day date,p_timezone text,p_method text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  prior public.review_stats%rowtype;
  stamp timestamptz := now();
  ease double precision; easy integer; hard integer; delay_hours integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_result not in ('easy','hard','correct','incorrect') or p_method not in ('automatic','self_review') then raise exception 'Invalid review'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || ':' || p_card_id,0));
  if exists(select 1 from public.review_events where user_id=auth.uid() and id=p_id) then return; end if;
  if not exists(select 1 from public.cards where user_id=auth.uid() and id=p_card_id and deck_id=p_deck_id) then raise exception 'Card unavailable'; end if;
  -- Validate timezone and derive date on server, preserving uploaded historical dates separately.
  p_day := (stamp at time zone p_timezone)::date;
  select * into prior from public.review_stats where user_id=auth.uid() and card_id=p_card_id;
  ease := coalesce(prior.ease_score,2.5);
  easy := coalesce(prior.easy_count,0) + case when p_result='easy' then 1 else 0 end;
  hard := coalesce(prior.hard_count,0) + case when p_result in ('hard','incorrect') then 1 else 0 end;
  if p_result='easy' then ease := least(5,ease+0.35); delay_hours := greatest(24,round((easy+1)*18*ease)::integer);
  elsif p_result='correct' then ease := least(5,ease+0.2); delay_hours := greatest(18,round(24*ease)::integer);
  elsif p_result='hard' then ease := greatest(1.3,ease-0.4); delay_hours := 8;
  else ease := greatest(1.2,ease-0.55); delay_hours := 4; end if;
  insert into public.review_stats(user_id,card_id,deck_id,ease_score,easy_count,hard_count,last_reviewed_at,due_at,last_result)
  values(auth.uid(),p_card_id,p_deck_id,ease,easy,hard,stamp,stamp+pg_catalog.make_interval(hours=>delay_hours),p_result)
  on conflict(user_id,card_id) do update set ease_score=excluded.ease_score,easy_count=excluded.easy_count,hard_count=excluded.hard_count,last_reviewed_at=excluded.last_reviewed_at,due_at=excluded.due_at,last_result=excluded.last_result;
  insert into public.review_events(user_id,id,card_id,deck_id,result,happened_at,study_date,timezone,was_due,was_weak,grading_method)
  values(auth.uid(),p_id,p_card_id,p_deck_id,p_result,stamp,p_day,p_timezone,coalesce(prior.due_at<=stamp,false),coalesce(prior.last_result in ('hard','incorrect'),false),p_method);
end;
$$;
revoke all on function public.record_study_review(text,text,text,text,date,text,text) from public,anon;
grant execute on function public.record_study_review(text,text,text,text,date,text,text) to authenticated;
commit;
