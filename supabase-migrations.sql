-- Create MembershipVisits table to store visit records
CREATE TABLE IF NOT EXISTS public."MembershipVisits" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "membershipId" uuid NOT NULL,
  date date NOT NULL,
  "staffName" text NOT NULL,
  "purchasedLocation" text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT MembershipVisits_pkey PRIMARY KEY (id),
  CONSTRAINT MembershipVisits_membershipId_fkey FOREIGN KEY ("membershipId") 
    REFERENCES public."Memberships"(id) 
    ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index on membershipId for faster queries
CREATE INDEX IF NOT EXISTS idx_membership_visits_membership_id ON public."MembershipVisits"("membershipId");

-- Create Memberships table to store membership information
CREATE TABLE IF NOT EXISTS public."Memberships" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  "totalVisits" integer NOT NULL DEFAULT 0,
  "remainingVisits" integer NOT NULL DEFAULT 5,
  "maxVisits" integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Memberships_pkey PRIMARY KEY (id),
  CONSTRAINT Memberships_userId_fkey FOREIGN KEY ("userId") 
    REFERENCES public."Users"(id) 
    ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index on userId for faster queries
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public."Memberships"("userId");

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at on Memberships table
CREATE TRIGGER update_memberships_updated_at 
  BEFORE UPDATE ON public."Memberships"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE public."MembershipVisits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Memberships" ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your security needs)
-- For MembershipVisits
CREATE POLICY "Allow all operations on MembershipVisits" ON public."MembershipVisits"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- For Memberships
CREATE POLICY "Allow all operations on Memberships" ON public."Memberships"
  FOR ALL
  USING (true)
  WITH CHECK (true);

