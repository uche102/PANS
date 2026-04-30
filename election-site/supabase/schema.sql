create extension if not exists pgcrypto;

create table if not exists voters (
  reg_no text primary key,
  name text not null,
  phone_number text,
  email text not null,
  level text,
  created_at timestamptz not null default now()
);

create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  reg_no text not null references voters(reg_no) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

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

alter table voters enable row level security;
alter table otp_codes enable row level security;
alter table posts enable row level security;
alter table candidates enable row level security;
alter table votes enable row level security;
