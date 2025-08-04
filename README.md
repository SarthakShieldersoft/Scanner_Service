# Scanner Service

A comprehensive security analysis service that scans code repositories for vulnerabilities, outdated dependencies, and security issues using Google's Gemini AI.

## Features

### 🔍 **Three Scan Types**
1. **Complete Scan**: Analyzes entire repository including code, dependencies, and configuration files
2. **SBOM Scan**: Focuses on Software Bill of Materials - dependency files and package vulnerabilities
3. **Vulnerability Scan**: Targets code-level security issues and logic vulnerabilities

### 🚀 **Key Capabilities**
- **Repository Integration**: Clones and analyzes GitHub repositories automatically
- **Rate Limiting**: Smart token management for Gemini API TPM limits
- **Chunked Processing**: Handles large files by breaking them into manageable chunks
- **Async Processing**: Non-blocking repository analysis with progress tracking
- **Database Storage**: PostgreSQL integration for scan reports and progress tracking
- **Resume Support**: Can resume interrupted scans from the last processed chunk

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Gemini API key
- Playground service running on localhost:8000

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up PostgreSQL database**
```sql
-- Run setup_database.sql as postgres superuser
psql -U postgres -f setup_database.sql
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the service**
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### 1. Repository Scanning
```bash
POST /scan-repository
```

**Request:**
```json
{
  "repo_url": "owner/repo-name",
  "branch": "main",
  "scan_type": "complete|sbom|vulnerability",
  "options": {
    "include_tests": false,
    "max_file_size": 1048576
  }
}
```

**Response:**
```json
{
  "report_id": "20250730_143022_a1b2c3d4_COMPLETE_1a2b3c4d",
  "repo_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "scan_type": "complete",
  "status": "in_progress",
  "files_to_scan": 25,
  "message": "Scan started. Use the report_id to check progress."
}
```

### 2. Get Scan Report
```bash
GET /scan-report/:reportId
```

### 3. List Scan Reports
```bash
GET /scan-reports?repo_id=xxx&scan_type=complete&status=completed&limit=20
```

### 4. Direct Code Scanning (Legacy)
```bash
POST /scan
```

## Scan Types Explained

### 🔍 Complete Scan
- Analyzes all code files, dependency files, and configuration files
- Provides comprehensive security overview
- Best for: Full security audits

### 📦 SBOM Scan
- Focuses on Software Bill of Materials
- Analyzes dependencies for known vulnerabilities
- Checks for outdated packages

### ⚠️ Vulnerability Scan
- Targets application logic and code-level security issues
- Looks for injection vulnerabilities, authentication flaws, etc.
- Excludes dependency analysis

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `PORT` | Server port | 3000 |
| `PLAYGROUND_URL` | Playground service URL | http://localhost:8000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | scanner_db |
| `DB_USER` | Database user | scanner_user |
| `DB_PASSWORD` | Database password | scanner_password |

## Docker

To build and run this service as a Docker container:

1.  **Build the image:**
    ```bash
    docker build -t scanner-service .
    ```

2.  **Run the container:**
    ```bash
    docker run -p 3000:3000 -e GEMINI_API_KEY=YOUR_API_KEY scanner-service
    ```
