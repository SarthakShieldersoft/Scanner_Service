-- Database setup script for Scanner Service
-- Run this script to create the database and user

-- Connect as postgres superuser and run:
CREATE DATABASE scanner_db;
CREATE USER scanner_user WITH PASSWORD 'scanner_password';
GRANT ALL PRIVILEGES ON DATABASE scanner_db TO scanner_user;

-- Connect to scanner_db as postgres superuser and run:
\c scanner_db;
GRANT ALL ON SCHEMA public TO scanner_user;
GRANT CREATE ON SCHEMA public TO scanner_user;
GRANT USAGE ON SCHEMA public TO scanner_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO scanner_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO scanner_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO scanner_user;
ALTER USER scanner_user CREATEDB;
