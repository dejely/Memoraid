begin;

-- Memoraid keeps its existing client-generated text IDs so native SQLite data
-- can be uploaded without rewriting relationships. Pairing every ID with the
-- authenticated user also allows two accounts to safely contain the same local
-- ID while preventing cross-account foreign-key references.

create table public.decks (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  description text not null default '',
  tags_json jsonb not null default '[]'::jsonb,
  source_type text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_studied_at timestamptz,

  constraint decks_pkey primary key (user_id, id),
  constraint decks_id_not_blank check (btrim(id) <> ''),
  constraint decks_title_not_blank check (btrim(title) <> ''),
  constraint decks_tags_are_array check (jsonb_typeof(tags_json) = 'array'),
  constraint decks_source_type_valid check (source_type in ('manual', 'imported'))
);

create table public.cards (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  id text not null,
  deck_id text not null,
  term text not null,
  definition text not null,
  example text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cards_pkey primary key (user_id, id),
  constraint cards_user_deck_card_key unique (user_id, deck_id, id),
  constraint cards_deck_fkey foreign key (user_id, deck_id)
    references public.decks (user_id, id) on delete cascade,
  constraint cards_id_not_blank check (btrim(id) <> ''),
  constraint cards_deck_id_not_blank check (btrim(deck_id) <> ''),
  constraint cards_term_not_blank check (btrim(term) <> ''),
  constraint cards_definition_not_blank check (btrim(definition) <> ''),
  constraint cards_sort_order_nonnegative check (sort_order >= 0)
);

create table public.sessions (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  id text not null,
  deck_id text not null,
  mode text not null default 'flashcard',
  current_index integer not null default 0,
  order_json jsonb not null default '[]'::jsonb,
  shuffle_enabled boolean not null default false,
  easy_count integer not null default 0,
  hard_count integer not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint sessions_pkey primary key (user_id, id),
  constraint sessions_deck_mode_key unique (user_id, deck_id, mode),
  constraint sessions_deck_fkey foreign key (user_id, deck_id)
    references public.decks (user_id, id) on delete cascade,
  constraint sessions_id_not_blank check (btrim(id) <> ''),
  constraint sessions_deck_id_not_blank check (btrim(deck_id) <> ''),
  constraint sessions_mode_valid check (mode = 'flashcard'),
  constraint sessions_current_index_nonnegative check (current_index >= 0),
  constraint sessions_order_is_array check (jsonb_typeof(order_json) = 'array'),
  constraint sessions_easy_count_nonnegative check (easy_count >= 0),
  constraint sessions_hard_count_nonnegative check (hard_count >= 0),
  constraint sessions_completed_after_start check (
    completed_at is null or completed_at >= started_at
  )
);

create table public.review_stats (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  card_id text not null,
  deck_id text not null,
  ease_score double precision not null default 2.5,
  easy_count integer not null default 0,
  hard_count integer not null default 0,
  last_reviewed_at timestamptz,
  due_at timestamptz,
  last_result text,

  constraint review_stats_pkey primary key (user_id, card_id),
  constraint review_stats_card_fkey foreign key (user_id, deck_id, card_id)
    references public.cards (user_id, deck_id, id) on delete cascade,
  constraint review_stats_card_id_not_blank check (btrim(card_id) <> ''),
  constraint review_stats_deck_id_not_blank check (btrim(deck_id) <> ''),
  constraint review_stats_ease_score_valid check (ease_score between 1.0 and 5.0),
  constraint review_stats_easy_count_nonnegative check (easy_count >= 0),
  constraint review_stats_hard_count_nonnegative check (hard_count >= 0),
  constraint review_stats_last_result_valid check (
    last_result in ('easy', 'hard', 'correct', 'incorrect')
  )
);

create table public.test_attempts (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  id text not null,
  deck_id text not null,
  deck_title text not null,
  total_questions integer not null,
  correct_answers integer not null,
  objective_correct integer not null,
  objective_total integer not null,
  written_count integer not null default 0,
  score_percent double precision not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  weak_card_count integer not null default 0,

  constraint test_attempts_pkey primary key (user_id, id),
  constraint test_attempts_deck_fkey foreign key (user_id, deck_id)
    references public.decks (user_id, id) on delete cascade,
  constraint test_attempts_id_not_blank check (btrim(id) <> ''),
  constraint test_attempts_deck_id_not_blank check (btrim(deck_id) <> ''),
  constraint test_attempts_deck_title_not_blank check (btrim(deck_title) <> ''),
  constraint test_attempts_total_nonnegative check (total_questions >= 0),
  constraint test_attempts_correct_valid check (
    correct_answers >= 0 and correct_answers <= total_questions
  ),
  constraint test_attempts_objective_valid check (
    objective_correct >= 0
    and objective_total >= 0
    and objective_correct <= objective_total
    and objective_correct <= correct_answers
  ),
  constraint test_attempts_written_count_nonnegative check (written_count >= 0),
  constraint test_attempts_question_totals_match check (
    objective_total + written_count = total_questions
  ),
  constraint test_attempts_score_valid check (score_percent between 0 and 100),
  constraint test_attempts_weak_card_count_valid check (
    weak_card_count >= 0 and weak_card_count <= total_questions
  ),
  constraint test_attempts_finished_after_start check (finished_at >= started_at)
);

create table public.test_questions (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  id text not null,
  attempt_id text not null,
  card_id text not null,
  question_type text not null,
  prompt text not null,
  correct_answer text not null,
  selected_answer text,
  options_json jsonb,
  is_correct boolean,
  explanation text,
  created_at timestamptz not null default now(),

  constraint test_questions_pkey primary key (user_id, id),
  constraint test_questions_attempt_fkey foreign key (user_id, attempt_id)
    references public.test_attempts (user_id, id) on delete cascade,
  constraint test_questions_id_not_blank check (btrim(id) <> ''),
  constraint test_questions_attempt_id_not_blank check (btrim(attempt_id) <> ''),
  constraint test_questions_card_id_not_blank check (btrim(card_id) <> ''),
  constraint test_questions_type_valid check (
    question_type in ('multiple_choice', 'true_false', 'written')
  ),
  constraint test_questions_prompt_not_blank check (btrim(prompt) <> ''),
  constraint test_questions_correct_answer_not_blank check (btrim(correct_answer) <> ''),
  constraint test_questions_options_are_array check (
    options_json is null or jsonb_typeof(options_json) = 'array'
  ),
  constraint test_questions_options_match_type check (
    (question_type = 'written' and options_json is null)
    or (question_type in ('multiple_choice', 'true_false') and options_json is not null)
  )
);

-- Query and cascade-delete indexes. Primary and unique constraints already
-- cover owner-scoped ID lookups and one active session per deck/mode.
create index decks_user_updated_idx
  on public.decks (user_id, updated_at desc);

create index cards_user_deck_order_idx
  on public.cards (user_id, deck_id, sort_order, created_at);

create index review_stats_user_deck_due_idx
  on public.review_stats (user_id, deck_id, due_at)
  where due_at is not null;

create index sessions_user_updated_idx
  on public.sessions (user_id, updated_at desc);

create index test_attempts_user_finished_idx
  on public.test_attempts (user_id, finished_at desc);

create index test_attempts_user_deck_idx
  on public.test_attempts (user_id, deck_id);

create index test_questions_user_attempt_created_idx
  on public.test_questions (user_id, attempt_id, created_at);

-- Web writes should receive a server-authoritative modification timestamp.
-- Inserts retain supplied timestamps so the one-time native upload preserves
-- the original SQLite history.
create function public.set_memoraid_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger decks_set_updated_at
before update on public.decks
for each row execute function public.set_memoraid_updated_at();

create trigger cards_set_updated_at
before update on public.cards
for each row execute function public.set_memoraid_updated_at();

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_memoraid_updated_at();

-- RLS is deliberately owner-only on every table. Child rows also carry the
-- owner key in their foreign keys, so valid data cannot cross user boundaries
-- even when written through a privileged backend.
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.sessions enable row level security;
alter table public.review_stats enable row level security;
alter table public.test_attempts enable row level security;
alter table public.test_questions enable row level security;

alter table public.decks force row level security;
alter table public.cards force row level security;
alter table public.sessions force row level security;
alter table public.review_stats force row level security;
alter table public.test_attempts force row level security;
alter table public.test_questions force row level security;

create policy decks_owner_all on public.decks
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy cards_owner_all on public.cards
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy sessions_owner_all on public.sessions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy review_stats_owner_all on public.review_stats
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy test_attempts_owner_all on public.test_attempts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy test_questions_owner_all on public.test_questions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.decks from anon;
revoke all on table public.cards from anon;
revoke all on table public.sessions from anon;
revoke all on table public.review_stats from anon;
revoke all on table public.test_attempts from anon;
revoke all on table public.test_questions from anon;

grant select, insert, update, delete on table public.decks to authenticated;
grant select, insert, update, delete on table public.cards to authenticated;
grant select, insert, update, delete on table public.sessions to authenticated;
grant select, insert, update, delete on table public.review_stats to authenticated;
grant select, insert, update, delete on table public.test_attempts to authenticated;
grant select, insert, update, delete on table public.test_questions to authenticated;

commit;
