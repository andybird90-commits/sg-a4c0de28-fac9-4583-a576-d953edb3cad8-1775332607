-- Add number of directors and employees to prospects table for Companies House data
ALTER TABLE prospects
ADD COLUMN number_of_directors integer NULL,
ADD COLUMN number_of_employees integer NULL;

COMMENT ON COLUMN prospects.number_of_directors IS 'Number of company directors from Companies House';
COMMENT ON COLUMN prospects.number_of_employees IS 'Number of employees (approximate)';