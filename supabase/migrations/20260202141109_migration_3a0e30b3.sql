ALTER TABLE sidekick_projects
ADD COLUMN IF NOT EXISTS rd_challenges text,
ADD COLUMN IF NOT EXISTS innovations text,
ADD COLUMN IF NOT EXISTS technical_uncertainties text,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS total_budget numeric(14, 2),
ADD COLUMN IF NOT EXISTS rd_budget numeric(14, 2),
ADD COLUMN IF NOT EXISTS team_members text;