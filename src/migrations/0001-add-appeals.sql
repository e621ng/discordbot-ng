--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
ALTER TABLE settings ADD appeals_channel_id TEXT;

CREATE TABLE appeals (
  id INTEGER PRIMARY KEY,
  message_id TEXT NOT NULL
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
ALTER TABLE settings DROP COLUMN appeals_channel_id;

DROP TABLE appeals;