-- Thread-listing queries filter on `sender_id = $1 OR recipient_id = $1`; recipient_id already
-- has an index from the Phase 1 migration, sender_id didn't.
CREATE INDEX idx_messages_sender_id ON messages (sender_id);
