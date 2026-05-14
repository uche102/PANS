create extension if not exists pgcrypto;

create table if not exists voters (
  reg_no text primary key,
  name text not null,
  phone_number text,
  email text not null,
  level text,
  created_at timestamptz not null default now()
);

alter table voters add column if not exists otp_claimed_at timestamptz;
alter table voters add column if not exists otp_verified_at timestamptz;
alter table voters add column if not exists ballot_submitted_at timestamptz;

create index if not exists voters_otp_claimed_at_idx on voters (otp_claimed_at);
create index if not exists voters_ballot_submitted_at_idx on voters (ballot_submitted_at);

create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  reg_no text not null references voters(reg_no) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists otp_codes_reg_no_idx on otp_codes (reg_no);
create index if not exists otp_codes_created_at_idx on otp_codes (created_at desc);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  name text not null,
  tagline text,
  image_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  reg_no text not null references voters(reg_no) on delete restrict,
  post_id uuid not null references posts(id) on delete restrict,
  candidate_id uuid not null references candidates(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (reg_no, post_id)
);

create index if not exists votes_reg_no_idx on votes (reg_no);
create index if not exists votes_post_id_idx on votes (post_id);
create index if not exists votes_candidate_id_idx on votes (candidate_id);
create index if not exists votes_created_at_idx on votes (created_at desc);
create index if not exists candidates_post_id_idx on candidates (post_id);
create index if not exists posts_display_order_idx on posts (display_order);

create or replace view voters_with_vote_status as
select
  v.reg_no,
  v.name,
  v.phone_number,
  v.email,
  v.level,
  exists(select 1 from votes where votes.reg_no = v.reg_no) as has_voted,
  min(votes.created_at) as voted_at
from voters v
left join votes on votes.reg_no = v.reg_no
group by v.reg_no, v.name, v.phone_number, v.email, v.level;

create or replace view election_results as
select
  p.id as post_id,
  p.title as post_title,
  p.display_order as post_order,
  c.id as candidate_id,
  c.name as candidate_name,
  c.display_order as candidate_order,
  count(v.id) as vote_count
from posts p
join candidates c on c.post_id = p.id
left join votes v on v.candidate_id = c.id and v.post_id = p.id
where p.is_active = true and c.is_active = true
group by p.id, p.title, p.display_order, c.id, c.name, c.display_order;

-- Clear existing data (careful with order due to foreign keys)
truncate table votes cascade;
truncate table otp_codes cascade;
truncate table voters cascade;

alter table voters enable row level security;
alter table otp_codes enable row level security;
alter table posts enable row level security;
alter table candidates enable row level security;
alter table votes enable row level security;
