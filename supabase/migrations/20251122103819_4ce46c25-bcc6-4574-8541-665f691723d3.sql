-- Tabella per tracciare notifiche inviate (evita duplicati)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  notification_type TEXT NOT NULL,
  reference_id UUID,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  UNIQUE(user_id, notification_type, reference_id)
);

-- Indici per performance
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Tabella per tracking GPS tecnici
CREATE TABLE IF NOT EXISTS technician_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES technicians(id) NOT NULL,
  job_id UUID REFERENCES jobs(id),
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  heading NUMERIC(5, 2),
  speed NUMERIC(5, 2),
  accuracy NUMERIC(6, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per query geografiche
CREATE INDEX idx_technician_locations_technician_job ON technician_locations(technician_id, job_id);
CREATE INDEX idx_technician_locations_updated ON technician_locations(updated_at DESC);

-- Tabella per offerte speciali
CREATE TABLE IF NOT EXISTS special_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_percentage INTEGER,
  discount_amount NUMERIC(10, 2),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  target_inactive_days INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per tracciare utenti che hanno ricevuto offerte
CREATE TABLE IF NOT EXISTS user_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  offer_id UUID REFERENCES special_offers NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT false,
  used BOOLEAN DEFAULT false,
  UNIQUE(user_id, offer_id)
);

-- RLS Policies
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_offers ENABLE ROW LEVEL SECURITY;

-- Notification logs policies
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

-- Technician locations policies
CREATE POLICY "Users can view technician location for their jobs"
  ON technician_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = technician_locations.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can update own location"
  ON technician_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.id = technician_locations.technician_id 
      AND technicians.profile_id = auth.uid()
    )
  );

-- Special offers policies
CREATE POLICY "Everyone can view active offers"
  ON special_offers FOR SELECT
  USING (active = true AND NOW() BETWEEN valid_from AND valid_until);

-- User offers policies
CREATE POLICY "Users can view own offers"
  ON user_offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own offers"
  ON user_offers FOR UPDATE
  USING (auth.uid() = user_id);

-- Funzione per calcolare distanza tra due punti (utile per "tecnico in arrivo")
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 NUMERIC, lon1 NUMERIC,
  lat2 NUMERIC, lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  earth_radius NUMERIC := 6371000; -- metri
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Abilita realtime per technician_locations
ALTER PUBLICATION supabase_realtime ADD TABLE technician_locations;