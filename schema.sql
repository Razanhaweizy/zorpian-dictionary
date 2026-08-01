create table if not exists users (
  id serial primary key,
  username text not null,
  password_hash text not null,
  is_editor boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists users_username_lower_idx on users (lower(username));

create table if not exists words (
  id serial primary key,
  word text not null,
  meaning text not null,
  type text,
  added_by text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists words_word_lower_idx on words (lower(word));

insert into words (word, meaning, type, added_by) values
  ('sowen', 'a quiet joy felt only in the presence of rain', 'noun', 'system'),
  ('krevash', 'to argue with someone you love, gently', 'verb', 'system'),
  ('ammuir', 'the last light before a room goes fully dark', 'noun', 'system')
on conflict do nothing;
