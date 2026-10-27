-- users, missions and tasks for sprint 1

CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(32) NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Zebo_Dev" and "zebo_dev" count as the same username
CREATE UNIQUE INDEX users_username_unique ON users (lower(username));

CREATE TABLE missions (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       VARCHAR(120) NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX missions_owner_idx ON missions (owner_id);

CREATE TABLE tasks (
  id          SERIAL PRIMARY KEY,
  mission_id  INTEGER NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
  title       VARCHAR(120) NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  status      task_status NOT NULL DEFAULT 'TODO',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tasks_mission_idx ON tasks (mission_id);

-- tokens that were logged out before they expired
CREATE TABLE revoked_tokens (
  jti        UUID PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
