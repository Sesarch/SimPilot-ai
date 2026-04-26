-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base documents (one row per uploaded PDF)
CREATE TABLE IF NOT EXISTS public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_label TEXT NOT NULL,            -- e.g. "AIM", "PHAK", "Cessna 172 POH"
  file_path TEXT NOT NULL,               -- path inside kb-files bucket
  pages INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | ready | error
  error_message TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_documents_status ON public.kb_documents(status);

-- Knowledge base chunks (searchable text + 384-dim semantic vector)
CREATE TABLE IF NOT EXISTS public.kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  source_label TEXT NOT NULL,
  page INTEGER,
  section TEXT,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON public.kb_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding ON public.kb_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Match function (returns top N chunks by cosine similarity)
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector(384),
  match_count INT DEFAULT 6,
  similarity_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  source_label TEXT,
  page INTEGER,
  section TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id,
    c.document_id,
    c.source_label,
    c.page,
    c.section,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks c
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- updated_at trigger
CREATE TRIGGER kb_documents_set_updated_at
BEFORE UPDATE ON public.kb_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage kb_documents"
  ON public.kb_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read kb_documents"
  ON public.kb_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage kb_chunks"
  ON public.kb_chunks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read kb_chunks"
  ON public.kb_chunks FOR SELECT TO authenticated
  USING (true);

-- Private storage bucket for KB source PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('kb-files', 'kb-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read kb-files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kb-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload kb-files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kb-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update kb-files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kb-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete kb-files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kb-files' AND public.has_role(auth.uid(), 'admin'));