CREATE TABLE IF NOT EXISTS academy_certificates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  certificate_id text NOT NULL UNIQUE,
  verification_code text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE academy_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates"
ON academy_certificates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own certificates"
ON academy_certificates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS academy_module_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  module_id text NOT NULL,
  quiz_passed boolean NOT NULL DEFAULT false,
  last_score integer,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

ALTER TABLE academy_module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own module progress"
ON academy_module_progress
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);