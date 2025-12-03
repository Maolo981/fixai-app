-- Add address_document_url column to profiles table for storing address verification documents
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_document_url text;

-- Create storage bucket for identity/address documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for identity-documents bucket
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);