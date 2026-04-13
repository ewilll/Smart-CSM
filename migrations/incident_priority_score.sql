-- Priority work queue: numeric score for dispatcher ordering (higher = more urgent).
-- Application computes score on insert; existing rows get a sensible default.

ALTER TABLE public.incidents
    ADD COLUMN IF NOT EXISTS priority_score INTEGER NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.incidents.priority_score IS '1–10 work-queue priority (higher first). Computed from type, severity, keywords, nearby recurrence.';

CREATE INDEX IF NOT EXISTS idx_incidents_priority_active
    ON public.incidents (priority_score DESC, created_at ASC)
    WHERE status NOT IN ('Resolved', 'Declined');
