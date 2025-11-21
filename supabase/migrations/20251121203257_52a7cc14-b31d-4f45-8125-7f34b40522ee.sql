-- Aggiungi campo image_url alla tabella chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN image_url TEXT;

-- Crea bucket per le foto della chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Crea policy per permettere agli utenti di caricare le proprie foto
CREATE POLICY "Users can upload chat images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Crea policy per permettere a tutti di vedere le foto della chat
CREATE POLICY "Anyone can view chat images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-images');