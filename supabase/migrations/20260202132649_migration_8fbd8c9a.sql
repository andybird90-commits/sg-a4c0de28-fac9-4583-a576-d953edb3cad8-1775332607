ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS incorporation_date date;

COMMENT ON COLUMN organisations.incorporation_date IS 'Date of incorporation from Companies House';