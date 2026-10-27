-- Run once on a NEW, empty PostgreSQL project for your self-hosted copy.
-- No private data, example relatives, or votes are included.
CREATE TABLE public.members (
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
  parent_id uuid REFERENCES public.members(id) ON DELETE SET NULL
);
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE INDEX members_parent_id_idx ON public.members(parent_id);

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  voter_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- All browser roles intentionally have no access. Server functions authorize
-- admin changes before using the service-role client. An empty settings table
-- means voting is open; administration can explicitly close it.