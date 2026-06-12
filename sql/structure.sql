CREATE TABLE
  IF NOT EXISTS discord_names (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    discord_id TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    added_on datetime NOT NULL DEFAULT (datetime ('now', 'localtime'))
  );

CREATE TABLE
  IF NOT EXISTS settings (
    guild_id TEXT PRIMARY KEY,
    general_chat_id TEXT,
    new_member_channel_id TEXT,
    tickets_channel_id TEXT,
    event_logs_channel_id TEXT,
    discord_logs_channel_id TEXT,
    audit_logs_channel_id TEXT,
    voice_logs_channel_id TEXT,
    admin_role_id TEXT,
    private_help_role_id TEXT,
    devwatch_role_id TEXT,
    staff_categories TEXT,
    safe_channels TEXT,
    link_skip_channels TEXT,
    github_release_channel TEXT,
    moderator_channel_id TEXT,
    private_help_channel_id TEXT
  );

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

CREATE TABLE
  IF NOT EXISTS tickets (id INTEGER PRIMARY KEY, message_id TEXT NOT NULL);

CREATE TABLE
  IF NOT EXISTS ticket_phrases (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    phrase TEXT NOT NULL
  );

CREATE TABLE
  IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    reason TEXT,
    mod_id TEXT,
    timestamp datetime NOT NULL DEFAULT (datetime ('now', 'localtime'))
  );

CREATE INDEX IF NOT EXISTS index_user_ids ON notes (user_id);

CREATE TABLE
  IF NOT EXISTS note_edits (
    id INTEGER PRIMARY KEY,
    note_id INTEGER,
    mod_id TEXT,
    previous_reason TEXT,
    timestamp datetime NOT NULL DEFAULT (datetime ('now', 'localtime')),
    FOREIGN KEY (note_id) REFERENCES notes (id)
  );

CREATE TABLE
  IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    expires INTEGER,
    expires_at datetime,
    full_ban INTEGER
  );

CREATE TABLE
  IF NOT EXISTS github_user_mapping (
    id INTEGER PRIMARY KEY,
    discord_id TEXT,
    github_username TEXT
  );

CREATE TABLE
  IF NOT EXISTS knowledgebase (
    id INTEGER PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL
  );

CREATE TABLE
  IF NOT EXISTS private_help_tickets (
    id INTEGER PRIMARY KEY,
    thread_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status INTEGER NOT NULL,
    timestamp datetime NOT NULL DEFAULT (datetime ('now', 'localtime'))
  );

CREATE INDEX IF NOT EXISTS index_timestamp ON private_help_tickets (timestamp);