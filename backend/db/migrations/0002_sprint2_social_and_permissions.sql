-- mission permissions, friends and posts for sprint 2
-- user roles (admin / member) already came in with 0001

-- the owner is always missions.owner_id, this table is for everyone else
CREATE TYPE mission_role AS ENUM ('editor', 'viewer');

CREATE TABLE mission_members (
  mission_id INTEGER NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role       mission_role NOT NULL DEFAULT 'viewer',
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, user_id)
);

CREATE INDEX mission_members_user_idx ON mission_members (user_id);

-- a request is 'pending' until the addressee accepts it, declining deletes the row
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');

CREATE TABLE friendships (
  id           SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status       friendship_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at  TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id)
);

-- one row per pair, whoever sent the request
CREATE UNIQUE INDEX friendships_pair_unique
  ON friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
CREATE INDEX friendships_addressee_idx ON friendships (addressee_id);

-- 'update' is a text post from the user, 'milestone' is posted by the API
CREATE TYPE post_kind AS ENUM ('update', 'milestone');

CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  author_id  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind       post_kind NOT NULL DEFAULT 'update',
  body       VARCHAR(500) NOT NULL CHECK (length(trim(body)) > 0),
  mission_id INTEGER REFERENCES missions (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- the feed reads newest first per author
CREATE INDEX posts_author_created_idx ON posts (author_id, created_at DESC);
