ALTER TABLE public.members ADD COLUMN parent_id uuid REFERENCES public.members(id) ON DELETE SET NULL;
CREATE INDEX members_parent_id_idx ON public.members(parent_id);