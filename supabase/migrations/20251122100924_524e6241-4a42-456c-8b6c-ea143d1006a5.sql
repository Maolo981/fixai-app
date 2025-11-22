-- Rimuovi la policy che causa ricorsione infinita
DROP POLICY IF EXISTS "Users can view technicians for their jobs" ON technicians;