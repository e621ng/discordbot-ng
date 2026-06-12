--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
DROP TABLE messages;

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
CREATE TABLE
  IF NOT EXISTS messages (
    id TEXT PRIMARY KEY ON CONFLICT REPLACE,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    attachments TEXT NOT NULL,
    stickers TEXT NOT NULL,
    content TEXT NOT NULL
  );

CREATE INDEX IF NOT EXISTS index_authors ON messages (author_id);

CREATE INDEX IF NOT EXISTS index_channels ON messages (channel_id);