-- Add executable_name column to games table
-- This column stores the main executable filename (e.g., "SkyrimSE.exe")
-- Used by overlay auto-injector for process detection

ALTER TABLE games ADD COLUMN executable_name TEXT;
