-- Aggiungi colonna avatar_url alla tabella technicians
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS avatar_url TEXT;