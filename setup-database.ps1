# PowerShell script to setup PostgreSQL database for Scanner Service
# Run this script as Administrator or with appropriate PostgreSQL permissions

Write-Host "Setting up PostgreSQL database for Scanner Service..." -ForegroundColor Green

# Check if PostgreSQL is accessible
try {
    $pgVersion = psql --version
    Write-Host "PostgreSQL found: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL not found in PATH. Please ensure PostgreSQL is installed and accessible." -ForegroundColor Red
    Write-Host "You may need to add PostgreSQL bin directory to your PATH." -ForegroundColor Yellow
    Write-Host "Common location: C:\Program Files\PostgreSQL\[version]\bin" -ForegroundColor Yellow
    exit 1
}

# Get PostgreSQL connection details
$pgHost = Read-Host "Enter PostgreSQL host (default: localhost)"
if ([string]::IsNullOrEmpty($pgHost)) { $pgHost = "localhost" }

$pgPort = Read-Host "Enter PostgreSQL port (default: 5432)"
if ([string]::IsNullOrEmpty($pgPort)) { $pgPort = "5432" }

$pgUser = Read-Host "Enter PostgreSQL superuser (default: postgres)"
if ([string]::IsNullOrEmpty($pgUser)) { $pgUser = "postgres" }

Write-Host "`nAttempting to create database and user..." -ForegroundColor Yellow

# Create the database and user
$setupCommands = @"
CREATE DATABASE scanner_db;
CREATE USER scanner_user WITH PASSWORD 'scanner_password';
GRANT ALL PRIVILEGES ON DATABASE scanner_db TO scanner_user;
ALTER USER scanner_user CREATEDB;
"@

# Execute initial setup
try {
    $setupCommands | psql -h $pgHost -p $pgPort -U $pgUser -d postgres
    Write-Host "✓ Database and user created successfully" -ForegroundColor Green
} catch {
    Write-Host "Error creating database and user. It may already exist." -ForegroundColor Yellow
}

# Connect to the new database and set permissions
$permissionCommands = @"
GRANT ALL ON SCHEMA public TO scanner_user;
GRANT CREATE ON SCHEMA public TO scanner_user;
GRANT USAGE ON SCHEMA public TO scanner_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO scanner_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO scanner_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO scanner_user;
"@

try {
    $permissionCommands | psql -h $pgHost -p $pgPort -U $pgUser -d scanner_db
    Write-Host "✓ Permissions granted successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Error setting permissions: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test the connection with the new user
Write-Host "`nTesting connection with scanner_user..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "scanner_password"
    $testResult = psql -h $pgHost -p $pgPort -U scanner_user -d scanner_db -c "SELECT version();"
    Write-Host "✓ Connection test successful" -ForegroundColor Green
    Remove-Item Env:PGPASSWORD
} catch {
    Write-Host "✗ Connection test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your PostgreSQL configuration." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🎉 Database setup completed successfully!" -ForegroundColor Green
Write-Host "You can now start the Scanner service with: npm start" -ForegroundColor Cyan

# Update .env file if it exists
if (Test-Path ".env") {
    Write-Host "`nUpdating .env file with database configuration..." -ForegroundColor Yellow
    
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace "DB_HOST=.*", "DB_HOST=$pgHost"
    $envContent = $envContent -replace "DB_PORT=.*", "DB_PORT=$pgPort"
    $envContent = $envContent -replace "DB_NAME=.*", "DB_NAME=scanner_db"
    $envContent = $envContent -replace "DB_USER=.*", "DB_USER=scanner_user"
    $envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=scanner_password"
    
    Set-Content ".env" $envContent
    Write-Host "✓ .env file updated" -ForegroundColor Green
} else {
    Write-Host "`nPlease create a .env file with the following database configuration:" -ForegroundColor Yellow
    Write-Host "DB_HOST=$pgHost" -ForegroundColor Cyan
    Write-Host "DB_PORT=$pgPort" -ForegroundColor Cyan
    Write-Host "DB_NAME=scanner_db" -ForegroundColor Cyan
    Write-Host "DB_USER=scanner_user" -ForegroundColor Cyan
    Write-Host "DB_PASSWORD=scanner_password" -ForegroundColor Cyan
}
