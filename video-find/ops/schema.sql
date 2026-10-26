-- FrameFind owner-only D1 event sink; no raw video, image, query, URL, IP or email.
CREATE TABLE IF NOT EXISTS framefind_events (
 day TEXT NOT NULL,
 sid_hash TEXT NOT NULL,
 stage TEXT NOT NULL CHECK(stage IN ('visit','video_submitted','item_selected','product_search','merchant_outbound')),
 source TEXT NOT NULL,
 medium TEXT NOT NULL,
 entry TEXT NOT NULL,
 channel TEXT NOT NULL,
 merchant TEXT NOT NULL,
 PRIMARY KEY (day,sid_hash,stage)
);
CREATE INDEX IF NOT EXISTS framefind_daily_stages ON framefind_events(day,source,stage);
-- Retention: schedule a bounded owner-approved cleanup of rows older than 30 days.
