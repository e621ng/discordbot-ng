--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
ALTER TABLE settings ADD honeypot_channel_id TEXT;
ALTER TABLE settings ADD honeypot_role_ids TEXT;

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
ALTER TABLE settings DROP COLUMN honeypot_channel_id;
ALTER TABLE settings DROP COLUMN honeypot_role_ids;
