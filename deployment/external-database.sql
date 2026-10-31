-- Run once in your external project SQL editor.
-- Creates isolated bakri_* tables only; never alters existing tables or data.
-- No private data, example relatives, or votes are included.
CREATE TABLE public.bakri_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  father_name text,
  relation text,
  photo_url text,
  phone text,
  notes text,
  is_elder boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  parent_id uuid REFERENCES public.bakri_members(id) ON DELETE SET NULL
);
GRANT ALL ON public.bakri_members TO service_role;
ALTER TABLE public.bakri_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX bakri_members_parent_id_idx ON public.bakri_members(parent_id);

CREATE TABLE public.bakri_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bakri_candidates TO service_role;
ALTER TABLE public.bakri_candidates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bakri_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.bakri_candidates(id) ON DELETE CASCADE,
  voter_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bakri_votes TO service_role;
ALTER TABLE public.bakri_votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bakri_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
GRANT ALL ON public.bakri_settings TO service_role;
ALTER TABLE public.bakri_settings ENABLE ROW LEVEL SECURITY;

-- All browser roles intentionally have no access. Server functions authorize
-- admin changes before using the service-role client. An empty settings table
-- means voting is open; administration can explicitly close it.