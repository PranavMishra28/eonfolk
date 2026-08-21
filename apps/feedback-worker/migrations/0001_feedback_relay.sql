PRAGMA foreign_keys = ON;

CREATE TABLE feedback_incidents (
  fingerprint TEXT PRIMARY KEY NOT NULL CHECK (length(fingerprint) = 64),
  state TEXT NOT NULL CHECK (state IN ('reserved', 'creating', 'open', 'retryable')),
  issue_number INTEGER,
  lease_token TEXT,
  lease_until_ms INTEGER,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  CHECK ((lease_token IS NULL) = (lease_until_ms IS NULL))
) STRICT;

CREATE TABLE feedback_submissions (
  submission_id TEXT PRIMARY KEY NOT NULL CHECK (
    length(submission_id) = 36
      AND substr(submission_id, 1, 4) = 'sub_'
      AND substr(submission_id, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  fingerprint TEXT NOT NULL REFERENCES feedback_incidents(fingerprint),
  payload_digest TEXT NOT NULL CHECK (length(payload_digest) = 64),
  payload_json TEXT,
  state TEXT NOT NULL CHECK (state IN ('reserved', 'retryable', 'delivered')),
  issue_number INTEGER,
  comment_id INTEGER,
  source_hour_key TEXT NOT NULL CHECK (length(source_hour_key) = 64),
  source_day_key TEXT NOT NULL CHECK (length(source_day_key) = 64),
  hour_bucket INTEGER NOT NULL,
  day_bucket INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
) STRICT;

CREATE TABLE feedback_delivery_lock (
  singleton INTEGER PRIMARY KEY NOT NULL CHECK (singleton = 1),
  lease_token TEXT,
  lease_until_ms INTEGER,
  next_mutation_at_ms INTEGER NOT NULL,
  CHECK ((lease_token IS NULL) = (lease_until_ms IS NULL))
) STRICT;

INSERT INTO feedback_delivery_lock (
  singleton, lease_token, lease_until_ms, next_mutation_at_ms
) VALUES (1, NULL, NULL, 0);

CREATE INDEX feedback_submissions_fingerprint
  ON feedback_submissions(fingerprint);

CREATE TABLE feedback_quota (
  scope TEXT NOT NULL CHECK (scope IN (
    'global-day', 'fingerprint-day', 'source-hour', 'source-day'
  )),
  bucket_key TEXT NOT NULL,
  bucket_number INTEGER NOT NULL,
  accepted_count INTEGER NOT NULL CHECK (accepted_count > 0),
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (scope, bucket_key, bucket_number)
) STRICT;

CREATE TABLE feedback_cleanup (
  singleton INTEGER PRIMARY KEY NOT NULL CHECK (singleton = 1),
  requested_at_ms INTEGER NOT NULL,
  staging_cutoff_ms INTEGER NOT NULL,
  metadata_cutoff_ms INTEGER NOT NULL,
  batch_limit INTEGER NOT NULL CHECK (batch_limit BETWEEN 1 AND 500)
) STRICT;

INSERT INTO feedback_cleanup (
  singleton, requested_at_ms, staging_cutoff_ms, metadata_cutoff_ms, batch_limit
) VALUES (1, 0, 0, 0, 100);

CREATE TRIGGER feedback_reserve_before_insert
BEFORE INSERT ON feedback_submissions
BEGIN
  SELECT CASE WHEN (
    SELECT COALESCE(SUM(accepted_count), 0)
    FROM feedback_quota
    WHERE scope = 'global-day'
      AND bucket_number BETWEEN NEW.day_bucket - 29 AND NEW.day_bucket
  ) >= 1000 THEN RAISE(ABORT, 'quota:global-rolling') END;

  INSERT INTO feedback_quota (
    scope, bucket_key, bucket_number, accepted_count, updated_at_ms
  ) VALUES ('global-day', 'all', NEW.day_bucket, 1, NEW.updated_at_ms)
  ON CONFLICT (scope, bucket_key, bucket_number) DO UPDATE SET
    accepted_count = accepted_count + 1,
    updated_at_ms = excluded.updated_at_ms
  WHERE accepted_count < 100;
  SELECT CASE WHEN changes() = 0
    THEN RAISE(ABORT, 'quota:global-day') END;

  INSERT INTO feedback_quota (
    scope, bucket_key, bucket_number, accepted_count, updated_at_ms
  ) VALUES ('fingerprint-day', NEW.fingerprint, NEW.day_bucket, 1, NEW.updated_at_ms)
  ON CONFLICT (scope, bucket_key, bucket_number) DO UPDATE SET
    accepted_count = accepted_count + 1,
    updated_at_ms = excluded.updated_at_ms
  WHERE accepted_count < 20;
  SELECT CASE WHEN changes() = 0
    THEN RAISE(ABORT, 'quota:fingerprint-day') END;

  INSERT INTO feedback_quota (
    scope, bucket_key, bucket_number, accepted_count, updated_at_ms
  ) VALUES ('source-hour', NEW.source_hour_key, NEW.hour_bucket, 1, NEW.updated_at_ms)
  ON CONFLICT (scope, bucket_key, bucket_number) DO UPDATE SET
    accepted_count = accepted_count + 1,
    updated_at_ms = excluded.updated_at_ms
  WHERE accepted_count < 5;
  SELECT CASE WHEN changes() = 0
    THEN RAISE(ABORT, 'quota:source-hour') END;

  INSERT INTO feedback_quota (
    scope, bucket_key, bucket_number, accepted_count, updated_at_ms
  ) VALUES ('source-day', NEW.source_day_key, NEW.day_bucket, 1, NEW.updated_at_ms)
  ON CONFLICT (scope, bucket_key, bucket_number) DO UPDATE SET
    accepted_count = accepted_count + 1,
    updated_at_ms = excluded.updated_at_ms
  WHERE accepted_count < 10;
  SELECT CASE WHEN changes() = 0
    THEN RAISE(ABORT, 'quota:source-day') END;

  INSERT INTO feedback_incidents (
    fingerprint, state, issue_number, lease_token, lease_until_ms,
    created_at_ms, updated_at_ms
  ) VALUES (
    NEW.fingerprint, 'reserved', NULL, NULL, NULL,
    NEW.created_at_ms, NEW.updated_at_ms
  ) ON CONFLICT (fingerprint) DO NOTHING;
END;

CREATE TRIGGER feedback_delivered_after_update
AFTER UPDATE OF state ON feedback_submissions
WHEN NEW.state = 'delivered'
BEGIN
  UPDATE feedback_incidents SET
    state = 'open', issue_number = NEW.issue_number,
    lease_token = NULL, lease_until_ms = NULL,
    updated_at_ms = NEW.updated_at_ms
  WHERE fingerprint = NEW.fingerprint;
END;

CREATE TRIGGER feedback_retryable_after_update
AFTER UPDATE OF state ON feedback_submissions
WHEN NEW.state = 'retryable'
BEGIN
  UPDATE feedback_incidents SET
    state = CASE WHEN issue_number IS NULL THEN 'retryable' ELSE 'open' END,
    lease_token = NULL, lease_until_ms = NULL,
    updated_at_ms = NEW.updated_at_ms
  WHERE fingerprint = NEW.fingerprint;
END;

CREATE TRIGGER feedback_global_lease_before_update
BEFORE UPDATE OF lease_token ON feedback_incidents
WHEN NEW.lease_token IS NOT NULL
  AND (OLD.lease_token IS NULL OR OLD.lease_token <> NEW.lease_token)
BEGIN
  UPDATE feedback_delivery_lock SET
    lease_token = NEW.lease_token,
    lease_until_ms = NEW.lease_until_ms
  WHERE singleton = 1
    AND (lease_until_ms IS NULL OR lease_until_ms <= NEW.updated_at_ms)
    AND next_mutation_at_ms <= NEW.updated_at_ms;
  SELECT CASE WHEN changes() = 0
    THEN RAISE(ABORT, 'lease:busy') END;
END;

CREATE TRIGGER feedback_global_lease_after_clear
AFTER UPDATE OF lease_token ON feedback_incidents
WHEN OLD.lease_token IS NOT NULL AND NEW.lease_token IS NULL
BEGIN
  UPDATE feedback_delivery_lock SET
    lease_token = NULL, lease_until_ms = NULL,
    next_mutation_at_ms = NEW.updated_at_ms + 1000
  WHERE singleton = 1 AND lease_token = OLD.lease_token;
END;

CREATE TRIGGER feedback_cleanup_before_update
BEFORE UPDATE OF requested_at_ms ON feedback_cleanup
BEGIN
  UPDATE feedback_submissions SET payload_json = NULL
  WHERE submission_id IN (
    SELECT s.submission_id
    FROM feedback_submissions s
    JOIN feedback_incidents i ON i.fingerprint = s.fingerprint
    WHERE s.payload_json IS NOT NULL
      AND s.updated_at_ms < NEW.staging_cutoff_ms
      AND (i.lease_until_ms IS NULL OR i.lease_until_ms <= NEW.requested_at_ms)
    ORDER BY s.updated_at_ms, s.submission_id
    LIMIT NEW.batch_limit
  );

  DELETE FROM feedback_submissions
  WHERE submission_id IN (
    SELECT s.submission_id
    FROM feedback_submissions s
    JOIN feedback_incidents i ON i.fingerprint = s.fingerprint
    WHERE s.updated_at_ms < NEW.metadata_cutoff_ms
      AND (i.lease_until_ms IS NULL OR i.lease_until_ms <= NEW.requested_at_ms)
    ORDER BY s.updated_at_ms, s.submission_id
    LIMIT NEW.batch_limit
  );

  DELETE FROM feedback_incidents
  WHERE fingerprint IN (
    SELECT i.fingerprint
    FROM feedback_incidents i
    WHERE i.updated_at_ms < NEW.metadata_cutoff_ms
      AND (i.lease_until_ms IS NULL OR i.lease_until_ms <= NEW.requested_at_ms)
      AND NOT EXISTS (
        SELECT 1 FROM feedback_submissions s WHERE s.fingerprint = i.fingerprint
      )
    ORDER BY i.updated_at_ms, i.fingerprint
    LIMIT NEW.batch_limit
  );

  DELETE FROM feedback_quota
  WHERE rowid IN (
    SELECT rowid FROM feedback_quota
    WHERE updated_at_ms < NEW.metadata_cutoff_ms
    ORDER BY updated_at_ms, rowid
    LIMIT NEW.batch_limit
  );
END;
