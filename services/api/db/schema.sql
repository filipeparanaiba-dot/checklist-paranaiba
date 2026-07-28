PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'manager', 'admin')),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_memberships (
  user_id TEXT NOT NULL REFERENCES users(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  PRIMARY KEY (user_id, store_id)
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  registered_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS checklist_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS checklist_template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES checklist_templates(id),
  version INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE (template_id, version)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  template_version_id TEXT NOT NULL REFERENCES checklist_template_versions(id),
  position INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('boolean', 'number', 'text', 'choice')),
  required INTEGER NOT NULL DEFAULT 1,
  unit TEXT,
  options_json TEXT,
  help TEXT,
  evaluation_rule_json TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  UNIQUE (template_version_id, position)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  template_version_id TEXT NOT NULL REFERENCES checklist_template_versions(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  operator_id TEXT NOT NULL REFERENCES users(id),
  due_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('assigned', 'in_progress', 'submitted', 'revoked')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id),
  operator_id TEXT NOT NULL REFERENCES users(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  template_version_id TEXT NOT NULL REFERENCES checklist_template_versions(id),
  device_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  protocol TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS answers (
  execution_id TEXT NOT NULL REFERENCES executions(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  value_json TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (execution_id, question_id)
);

CREATE TABLE IF NOT EXISTS evaluations (
  execution_id TEXT PRIMARY KEY REFERENCES executions(id),
  score REAL NOT NULL,
  conform_count INTEGER NOT NULL,
  nonconform_count INTEGER NOT NULL,
  evaluated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_items (
  execution_id TEXT NOT NULL REFERENCES executions(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  conform INTEGER NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (execution_id, question_id)
);

CREATE TABLE IF NOT EXISTS action_plans (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  store_id TEXT NOT NULL REFERENCES stores(id),
  title TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('open', 'completed')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  user_id TEXT NOT NULL REFERENCES users(id),
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  store_id TEXT,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  details_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS assignments_operator_state_idx
  ON assignments(operator_id, state, due_at);
CREATE INDEX IF NOT EXISTS executions_store_received_idx
  ON executions(store_id, received_at DESC);
CREATE INDEX IF NOT EXISTS action_plans_store_state_idx
  ON action_plans(store_id, state);
CREATE INDEX IF NOT EXISTS audit_events_resource_idx
  ON audit_events(resource_type, resource_id, occurred_at);
