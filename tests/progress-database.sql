-- Run after both migrations against an isolated database with Supabase auth roles.
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.decks(id,title) values ('d','Statistics');
insert into public.cards(id,deck_id,term,definition) values ('c','d','Half','0.5');
insert into public.review_stats(card_id,deck_id,due_at,last_result) values ('c','d',now()-interval '1 day','hard');
select public.record_study_review('event1','c','d','correct','2000-01-01','Asia/Manila','automatic');
select public.record_study_review('event1','c','d','easy','2000-01-01','Asia/Manila','automatic');
do $$ begin
  if (select count(*) from public.review_events) <> 1 then raise exception 'Duplicate event'; end if;
  if (select easy_count from public.review_stats where card_id='c') <> 0 then raise exception 'Duplicate scheduling'; end if;
  if not (select was_due and was_weak from public.review_events) then raise exception 'Missing eligibility'; end if;
  if (select study_date from public.review_events) <> (now() at time zone 'Asia/Manila')::date then raise exception 'Incorrect study date'; end if;
  if (select grading_mode from public.cards where id='c') <> 'self_review' then raise exception 'Default changed'; end if;
  begin
    perform public.record_study_review('bad','missing','d','easy',current_date,'Asia/Manila','automatic');
    raise exception 'Expected missing card rejection';
  exception when raise_exception then
    if sqlerrm = 'Expected missing card rejection' then raise; end if;
  end;
  if exists(select 1 from public.review_events where id='bad') then raise exception 'Partial event committed'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
  if exists(select 1 from public.review_events) or exists(select 1 from public.cards) then raise exception 'Cross-account read'; end if;
  begin
    insert into public.review_events(user_id,id,card_id,deck_id,result,happened_at,study_date,timezone,was_due,was_weak,grading_method)
    values('11111111-1111-4111-8111-111111111111','foreign','c','d','easy',now(),current_date,'UTC',false,false,'automatic');
    raise exception 'Cross-account insert allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.decks(id,title) values ('d','Other account');
insert into public.cards(id,deck_id,term,definition) values ('c','d','Other','1');
select public.record_study_review('event1','c','d','easy',current_date,'UTC','self_review');
do $$ begin if (select count(*) from public.review_events) <> 1 then raise exception 'Owner ID isolation failed'; end if; end $$;
reset role;
select 'Database checks passed' as result;
