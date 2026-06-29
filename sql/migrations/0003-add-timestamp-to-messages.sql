--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
DELETE FROM messages;
ALTER TABLE messages ADD id_hash TEXT NOT NULL;
ALTER TABLE messages ADD timestamp datetime NOT NULL DEFAULT (datetime ('now', 'localtime'));
CREATE INDEX IF NOT EXISTS index_id_hash ON messages (id_hash);

ALTER TABLE discord_names ADD discord_id_hash TEXT NOT NULL;
ALTER TABLE discord_names ADD discord_username_hash TEXT NOT NULL;
CREATE INDEX IF NOT EXISTS index_discord_id_hash ON discord_names (discord_id_hash);

ALTER TABLE ticket_phrases ADD user_id_hash TEXT NOT NULL;
CREATE INDEX IF NOT EXISTS index_user_id_hash ON ticket_phrases (user_id_hash);

ALTER TABLE notes ADD user_id_hash TEXT NOT NULL;
CREATE INDEX IF NOT EXISTS index_user_id_hash ON notes (user_id_hash);

ALTER TABLE bans ADD user_id_hash TEXT NOT NULL;
CREATE INDEX IF NOT EXISTS index_user_id_hash ON bans (user_id_hash);

ALTER TABLE github_user_mapping ADD discord_id_hash TEXT NOT NULL;
CREATE INDEX IF NOT EXISTS index_discord_id_hash ON github_user_mapping (discord_id_hash);

ALTER TABLE private_help_tickets ADD user_id_hash TEXT NOT NULL;
CREATE INDEX IF NOT EXISTS index_user_id_hash ON private_help_tickets (user_id_hash);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
ALTER TABLE messages DROP COLUMN id_hash;
ALTER TABLE messages DROP COLUMN timestamp;

ALTER TABLE discord_names DROP COLUMN discord_id_hash;
ALTER TABLE discord_names DROP COLUMN discord_username_hash;

ALTER TABLE ticket_phrases DROP COLUMN user_id_hash;

ALTER TABLE notes DROP COLUMN user_id_hash;

ALTER TABLE bans DROP COLUMN user_id_hash;

ALTER TABLE github_user_mapping DROP COLUMN discord_id_hash;

ALTER TABLE private_help_tickets DROP COLUMN user_id_hash;

