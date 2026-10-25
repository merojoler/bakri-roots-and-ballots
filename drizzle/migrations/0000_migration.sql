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
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

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
INSERT INTO public.settings(key, value) VALUES ('voting_open','true');

INSERT INTO public.members(full_name, father_name, relation, notes, is_elder, status) VALUES
('الحاج محمود البكري','عبد الله البكري','الجد الأكبر','مؤسس العائلة وصاحب السيرة الطيبة، عُرف بالكرم والحكمة.',true,'approved'),
('الحاج أحمد محمود البكري','محمود البكري','العم الأكبر','كبير العائلة ومرجعها في الإصلاح بين الناس.',true,'approved'),
('الحاجة فاطمة البكري','محمود البكري','العمة','أم العائلة وراعية صلة الأرحام.',true,'approved');

INSERT INTO public.candidates(name, bio) VALUES
('أبو خالد البكري','خبرة طويلة في شؤون العائلة والإصلاح.'),
('أبو محمد البكري','يسعى لتعزيز التواصل بين الأجيال وخدمة أبناء العائلة.');