CREATE TABLE IF NOT EXISTS sessions (
	session_id TEXT PRIMARY KEY,
	first_seen TEXT NOT NULL DEFAULT (datetime('now')),
	last_seen TEXT NOT NULL DEFAULT (datetime('now')),
	referrer TEXT NOT NULL DEFAULT '',
	device TEXT NOT NULL DEFAULT 'Unknown',
	country TEXT NOT NULL DEFAULT '',
	region TEXT NOT NULL DEFAULT '',
	city TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE TABLE IF NOT EXISTS events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	session_id TEXT NOT NULL,
	event_name TEXT NOT NULL,
	target TEXT NOT NULL DEFAULT '',
	page TEXT NOT NULL DEFAULT '/',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_sessions_first_seen ON sessions(first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
	visitor_hash TEXT PRIMARY KEY,
	failures INTEGER NOT NULL DEFAULT 0,
	window_started TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;
