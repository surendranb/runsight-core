-- Add city, state, and country columns to the runs table
ALTER TABLE public.runs
ADD COLUMN city TEXT NULL,
ADD COLUMN state TEXT NULL,
ADD COLUMN country TEXT NULL;
