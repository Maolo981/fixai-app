-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  description TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  vat_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_members table
CREATE TABLE public.company_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, technician_id)
);

-- Add company_id to technicians table
ALTER TABLE public.technicians ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Company owners can manage their company"
ON public.companies FOR ALL
USING (owner_id = auth.uid());

CREATE POLICY "Company members can view their company"
ON public.companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.technicians t ON t.id = cm.technician_id
    WHERE cm.company_id = companies.id AND t.profile_id = auth.uid()
  )
);

-- Company members policies
CREATE POLICY "Company owners and managers can manage members"
ON public.company_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_members.company_id AND c.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.technicians t ON t.id = cm.technician_id
    WHERE cm.company_id = company_members.company_id 
    AND t.profile_id = auth.uid() 
    AND cm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Members can view other members in same company"
ON public.company_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.technicians t ON t.id = cm.technician_id
    WHERE cm.company_id = company_members.company_id AND t.profile_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();