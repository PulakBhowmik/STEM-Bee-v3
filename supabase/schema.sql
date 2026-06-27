create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'contest-audio') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'contest-audio',
      'contest-audio',
      false,
      52428800,
      array['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3']
    );
  end if;
end $$;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'running', 'ended')),
  created_by uuid references admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contests_valid_window check (end_at > start_at)
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  team_code text not null unique,
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists team_sessions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  session_hash text not null unique,
  active boolean not null default true,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  serial integer not null,
  word text,
  answer_options text[] not null default '{}',
  audio_storage_path text not null,
  audio_file_name text not null,
  hint text,
  points integer not null default 1 check (points > 0),
  created_at timestamptz not null default now(),
  unique (contest_id, serial)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  submitted_answer text not null,
  is_correct boolean not null,
  points_awarded integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique (contest_id, team_id, question_id)
);

create table if not exists team_scores (
  contest_id uuid not null references contests(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  score integer not null default 0,
  correct_count integer not null default 0,
  submitted_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (contest_id, team_id)
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid references contests(id) on delete cascade,
  actor_type text not null check (actor_type in ('admin', 'team', 'system')),
  actor_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists questions_contest_serial_idx on questions (contest_id, serial);
create index if not exists submissions_team_idx on submissions (contest_id, team_id);
create index if not exists team_scores_contest_score_idx on team_scores (contest_id, score desc, updated_at asc);
create index if not exists team_sessions_hash_active_idx on team_sessions (session_hash, active);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contests_touch_updated_at on contests;
create trigger contests_touch_updated_at
before update on contests
for each row execute function touch_updated_at();

create or replace function submit_spelling_answer(
  p_session_hash text,
  p_question_id uuid,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session team_sessions%rowtype;
  v_contest contests%rowtype;
  v_question questions%rowtype;
  v_trimmed text;
  v_correct boolean;
  v_points integer;
  v_submission submissions%rowtype;
begin
  select *
  into v_session
  from team_sessions
  where session_hash = p_session_hash and active = true
  limit 1;

  if not found then
    raise exception 'Invalid or expired team session' using errcode = '28000';
  end if;

  update team_sessions
  set last_seen_at = now()
  where id = v_session.id;

  select *
  into v_contest
  from contests
  where id = v_session.contest_id
  for update;

  if not found then
    raise exception 'Contest not found' using errcode = '22023';
  end if;

  if v_contest.status = 'ended' or now() >= v_contest.end_at then
    raise exception 'Contest has ended' using errcode = '22023';
  end if;

  if v_contest.status <> 'running' and not (
    v_contest.status = 'scheduled'
    and now() >= v_contest.start_at
    and now() < v_contest.end_at
  ) then
    raise exception 'Contest is not open' using errcode = '22023';
  end if;

  select *
  into v_question
  from questions
  where id = p_question_id and contest_id = v_session.contest_id
  for update;

  if not found then
    raise exception 'Question not found' using errcode = '22023';
  end if;

  v_trimmed := trim(p_answer);
  if char_length(v_trimmed) = 0 then
    raise exception 'Answer cannot be empty' using errcode = '22023';
  end if;

  v_correct := v_trimmed = any(v_question.answer_options);
  v_points := case when v_correct then v_question.points else 0 end;

  insert into submissions (
    contest_id,
    team_id,
    question_id,
    submitted_answer,
    is_correct,
    points_awarded
  )
  values (
    v_session.contest_id,
    v_session.team_id,
    p_question_id,
    v_trimmed,
    v_correct,
    v_points
  )
  on conflict (contest_id, team_id, question_id) do nothing
  returning * into v_submission;

  if found then
    insert into team_scores (contest_id, team_id, score, correct_count, submitted_count)
    values (
      v_session.contest_id,
      v_session.team_id,
      v_points,
      case when v_correct then 1 else 0 end,
      1
    )
    on conflict (contest_id, team_id)
    do update set
      score = team_scores.score + excluded.score,
      correct_count = team_scores.correct_count + excluded.correct_count,
      submitted_count = team_scores.submitted_count + 1,
      updated_at = now();

    insert into audit_events (contest_id, actor_type, actor_id, event_type, payload)
    values (
      v_session.contest_id,
      'team',
      v_session.team_id,
      'answer_submitted',
      jsonb_build_object(
        'question_id', p_question_id,
        'is_correct', v_correct,
        'points_awarded', v_points
      )
    );

    return jsonb_build_object(
      'accepted', true,
      'alreadySubmitted', false,
      'isCorrect', v_correct,
      'pointsAwarded', v_points
    );
  end if;

  select *
  into v_submission
  from submissions
  where contest_id = v_session.contest_id
    and team_id = v_session.team_id
    and question_id = p_question_id;

  return jsonb_build_object(
    'accepted', true,
    'alreadySubmitted', true,
    'isCorrect', v_submission.is_correct,
    'pointsAwarded', v_submission.points_awarded
  );
end;
$$;
