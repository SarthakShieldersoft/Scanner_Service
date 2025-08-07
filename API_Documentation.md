# 📚 Scanner Service API Documentation

## 🔧 Base Configuration
- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **Port**: 3000 (configurable via PORT environment variable)
- **Service**: Scanner Service v1.0

---

## 📋 API Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/scan` | Direct code scanning |
| POST | `/scan-repository` | Start repository scan |
| GET | `/scan-report/{report_id}` | Get detailed scan report |
| GET | `/scan-report/{report_id}/summary` | Get scan report summary (frontend-specific) ⭐ |
| GET | `/scan-reports` | List all scan reports |
| POST | `/retry-scan/{report_id}` | Retry failed scan |

---

## 🎯 **NEW: Frontend-Specific Endpoint**

### **Get Scan Report Summary** ⭐
**Endpoint**: `GET /scan-report/{report_id}/summary`  
**Description**: Get scan report summary with vulnerability counts (optimized for frontend)

#### **Request**
```bash
curl.exe -X GET "http://localhost:3000/scan-report/20250731062238_ebe945fe_COMPLETE_6b2ae3ac/summary"
```

#### **Response** (Exactly matches your requested format)
```json
{
  "report_id": "20250731062238_ebe945fe_COMPLETE_6b2ae3ac",
  "repo_id": "ebe945fe-8874-48cc-8c8f-57e1dcfa0ea5",
  "repo_url": "https://github.com/SarthakShieldersoft/TestVWA.git",
  "scan_type": "complete",
  "status": "completed",
  "created_at": "2025-07-31T06:22:38.114Z",
  "completed_at": "2025-07-31T07:01:51.269Z",
  "progress": {
    "total_files": 36,
    "processed_files": 36,
    "percentage": 100
  },
  "vulnerability_count": {
    "Low": 21,
    "Medium": 22,
    "High": 17,
    "Critical": 65
  }
}
```

## 🔧 Base Configuration
- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **Port**: 3000 (configurable via PORT environment variable)
- **Service**: Scanner Service v1.0

---

## 📋 API Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/scan` | Direct code scanning |
| POST | `/scan-repository` | Start repository scan |
| GET | `/scan-report/{report_id}` | Get specific scan report |
| GET | `/scan-reports` | List all scan reports |
| POST | `/retry-scan/{report_id}` | Retry failed scan |

---

## 🔍 Detailed Endpoint Documentation

### 1. Health Check

**Endpoint**: `GET /health`  
**Description**: Check if the service is running and database is connected

#### Request
```bash
curl.exe -X GET "http://localhost:3000/health"
```

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2025-07-31T07:30:00.000Z",
  "database": "connected",
  "service": "Scanner Service v1.0"
}
```

---

### 2. Direct Code Scanning

**Endpoint**: `POST /scan`  
**Description**: Analyze code snippet and dependencies directly

#### Request
```bash
curl.exe -X POST "http://localhost:3000/scan" ^
  -H "Content-Type: application/json" ^
  -d "{\"code\":\"function login(user, pass) { eval('SELECT * FROM users WHERE username=' + user); }\",\"dependencies\":{\"express\":\"4.18.0\",\"lodash\":\"4.17.20\"}}"
```

#### Request Body
```json
{
  "code": "function login(user, pass) { eval('SELECT * FROM users WHERE username=' + user); }",
  "dependencies": {
    "express": "4.18.0",
    "lodash": "4.17.20"
  }
}
```

#### Response
```json
{
  "analysis": {
    "vulnerabilities": [
      {
        "type": "Code Injection",
        "severity": "CRITICAL",
        "line": 1,
        "description": "Use of eval() function with user input creates code injection vulnerability",
        "recommendation": "Use parameterized queries instead of eval()"
      },
      {
        "type": "SQL Injection",
        "severity": "CRITICAL", 
        "line": 1,
        "description": "Direct string concatenation in SQL query",
        "recommendation": "Use prepared statements or parameterized queries"
      }
    ],
    "dependency_issues": [
      {
        "package": "lodash",
        "version": "4.17.20",
        "severity": "HIGH",
        "vulnerability": "Prototype pollution vulnerability",
        "recommendation": "Update to version 4.17.21 or higher"
      }
    ],
    "summary": {
      "total_vulnerabilities": 2,
      "critical": 2,
      "high": 1,
      "medium": 0,
      "low": 0
    }
  },
  "timestamp": "2025-07-31T07:30:00.000Z"
}
```

---

### 3. Start Repository Scan

**Endpoint**: `POST /scan-repository`  
**Description**: Start scanning a Git repository

#### Request
```bash
curl.exe -X POST "http://localhost:3000/scan-repository" ^
  -H "Content-Type: application/json" ^
  -d "{\"repo_url\":\"https://github.com/SarthakShieldersoft/TestVWA.git\",\"scan_type\":\"vulnerability\",\"branch\":\"main\"}"
```

#### Request Body
```json
{
  "repo_url": "https://github.com/SarthakShieldersoft/TestVWA.git",
  "scan_type": "vulnerability",
  "branch": "main"
}
```

#### Scan Types
- **`complete`** - Scan all files (SBOM, CODE, CONFIG, OTHER)
- **`vulnerability`** - Scan only source code files for security vulnerabilities
- **`sbom`** - Scan only dependency files (package.json, pom.xml, etc.)

#### Response
```json
{
  "report_id": "20250731062238_ebe945fe_VULNERABILITY_6b2ae3ac",
  "repo_id": "ebe945fe-8874-48cc-8c8f-57e1dcfa0ea5",
  "scan_type": "vulnerability",
  "status": "in_progress",
  "files_to_scan": 18,
  "message": "Scan started. Use the report_id to check progress."
}
```

---

### 4. Get Scan Report

**Endpoint**: `GET /scan-report/{report_id}`  
**Description**: Get detailed scan report with progress and results

#### Request
```bash
curl.exe -X GET "http://localhost:3000/scan-report/20250731062238_ebe945fe_VULNERABILITY_6b2ae3ac"
```

#### Response (In Progress)
```json
{
  "report_id": "20250731062238_ebe945fe_VULNERABILITY_6b2ae3ac",
  "repo_id": "ebe945fe-8874-48cc-8c8f-57e1dcfa0ea5",
  "repository_url": "https://github.com/SarthakShieldersoft/TestVWA.git",
  "scan_type": "vulnerability",
  "status": "in_progress",
  "progress": {
    "total_files": 18,
    "processed_files": 12,
    "percentage": 67,
    "current_file": "src/main/java/com/testvwa/controller/UserController.java"
  },
  "created_at": "2025-07-31T06:22:38.000Z",
  "updated_at": "2025-07-31T06:45:12.000Z"
}
```

#### Response (Completed)
```json
{
  "report_id": "20250731062238_ebe945fe_VULNERABILITY_6b2ae3ac",
  "repo_id": "ebe945fe-8874-48cc-8c8f-57e1dcfa0ea5",
  "repository_url": "https://github.com/SarthakShieldersoft/TestVWA.git",
  "scan_type": "vulnerability",
  "status": "completed",
  "progress": {
    "total_files": 18,
    "processed_files": 18,
    "percentage": 100
  },
  "summary": {
    "total_vulnerabilities": 45,
    "critical": 12,
    "high": 8,
    "medium": 15,
    "low": 10,
    "files_with_issues": 15,
    "clean_files": 3
  },
  "vulnerabilities": [
    {
      "file": "src/main/java/com/testvwa/controller/UserController.java",
      "severity": "CRITICAL",
      "type": "SQL Injection",
      "line": 45,
      "description": "Direct SQL query construction with user input",
      "code_snippet": "String sql = \"SELECT * FROM users WHERE id = \" + userId;",
      "recommendation": "Use parameterized queries or prepared statements",
      "cwe": "CWE-89"
    },
    {
      "file": "src/main/java/com/testvwa/controller/UserController.java",
      "severity": "HIGH",
      "type": "Cross-Site Scripting (XSS)",
      "line": 67,
      "description": "User input directly rendered without sanitization",
      "code_snippet": "model.addAttribute(\"message\", userMessage);",
      "recommendation": "Sanitize user input before rendering",
      "cwe": "CWE-79"
    }
  ],
  "file_analysis": [
    {
      "file_path": "src/main/java/com/testvwa/controller/UserController.java",
      "file_type": "CODE",
      "lines_of_code": 156,
      "vulnerabilities_count": 8,
      "severity_breakdown": {
        "critical": 3,
        "high": 2,
        "medium": 2,
        "low": 1
      },
      "analysis_summary": "Multiple injection vulnerabilities and authentication bypasses detected"
    }
  ],
  "repository_info": {
    "total_files": 36,
    "lines_of_code": 3791,
    "languages": {
      "Java": "72.21%",
      "CSS": "14.26%", 
      "XML": "11.93%",
      "PowerShell": "1.61%"
    }
  },
  "scan_duration": "00:18:25",
  "created_at": "2025-07-31T06:22:38.000Z",
  "completed_at": "2025-07-31T06:41:03.000Z"
}
```

---

### 5. List All Scan Reports

**Endpoint**: `GET /scan-reports`  
**Description**: Get list of all scan reports with pagination

#### Request
```bash
curl.exe -X GET "http://localhost:3000/scan-reports?page=1&limit=10&status=completed"
```

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)
- `status` (optional): Filter by status (`in_progress`, `completed`, `failed`)
- `scan_type` (optional): Filter by scan type (`complete`, `vulnerability`, `sbom`)

#### Response
```json
{
  "reports": [
    {
      "report_id": "20250731062238_ebe945fe_COMPLETE_6b2ae3ac",
      "repository_url": "https://github.com/SarthakShieldersoft/TestVWA.git",
      "scan_type": "complete",
      "status": "completed",
      "total_files": 36,
      "vulnerabilities_found": 67,
      "created_at": "2025-07-31T06:22:38.000Z",
      "completed_at": "2025-07-31T07:01:51.000Z",
      "scan_duration": "00:39:13"
    },
    {
      "report_id": "20250731054457_40981087_VULNERABILITY_3591e10e",
      "repository_url": "https://github.com/SarthakShieldersoft/TestVWA.git", 
      "scan_type": "vulnerability",
      "status": "completed",
      "total_files": 18,
      "vulnerabilities_found": 45,
      "created_at": "2025-07-31T05:44:57.000Z",
      "completed_at": "2025-07-31T05:50:23.000Z",
      "scan_duration": "00:05:26"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 2,
    "total_reports": 13,
    "has_next": true,
    "has_previous": false
  }
}
```

---

### 6. Retry Failed Scan

**Endpoint**: `POST /retry-scan/{report_id}`  
**Description**: Retry a failed scan from where it left off

#### Request
```bash
curl.exe -X POST "http://localhost:3000/retry-scan/20250731062238_ebe945fe_VULNERABILITY_6b2ae3ac"
```

#### Response
```json
{
  "report_id": "20250731062238_ebe945fe_VULNERABILITY_6b2ae3ac",
  "status": "retrying",
  "message": "Scan retry initiated. Files will be reprocessed from last successful point.",
  "files_remaining": 6,
  "estimated_time": "5-10 minutes"
}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid scan type. Use: complete, sbom, or vulnerability.",
  "code": "INVALID_SCAN_TYPE"
}
```

### 404 Not Found
```json
{
  "error": "Scan report not found",
  "code": "REPORT_NOT_FOUND",
  "report_id": "invalid_report_id"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error occurred during scanning",
  "code": "INTERNAL_ERROR",
  "message": "Database connection failed"
}
```

---

## 📊 Reference Data

### Status Codes
| Status | Description |
|--------|-------------|
| `in_progress` | Scan is currently running |
| `completed` | Scan finished successfully |
| `failed` | Scan encountered errors |
| `retrying` | Scan is being retried |

### Severity Levels
| Severity | Description |
|----------|-------------|
| `CRITICAL` | Immediate security risk requiring urgent attention |
| `HIGH` | Significant security risk |
| `MEDIUM` | Moderate security concern |
| `LOW` | Minor security issue or best practice violation |

### File Classifications
| Type | Description | Examples |
|------|-------------|----------|
| `SBOM` | Software Bill of Materials | package.json, pom.xml, requirements.txt |
| `CODE` | Source code files | .js, .java, .py, .cs, .php |
| `CONFIG` | Configuration files | .env, web.xml, config.json |
| `OTHER` | Documentation and other files | .md, .txt, .yml |

---

## 💡 Frontend Integration Examples

### Real-time Progress Monitoring
```javascript
// Poll scan progress every 5 seconds
async function monitorScan(reportId) {
    const interval = setInterval(async () => {
        const response = await fetch(`/scan-report/${reportId}`);
        const report = await response.json();
        
        updateProgressBar(report.progress.percentage);
        displayCurrentFile(report.progress.current_file);
        
        if (report.status === 'completed') {
            clearInterval(interval);
            displayResults(report);
        } else if (report.status === 'failed') {
            clearInterval(interval);
            showError('Scan failed');
        }
    }, 5000);
}
```

### Dashboard Summary
```javascript
// Get recent scans for dashboard
async function getDashboardData() {
    const response = await fetch('/scan-reports?limit=5&status=completed');
    const data = await response.json();
    return data.reports;
}
```

### Start New Scan
```javascript
// Start repository scan
async function startRepositoryScan(repoUrl, scanType = 'vulnerability') {
    const response = await fetch('/scan-repository', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            repo_url: repoUrl,
            scan_type: scanType,
            branch: 'main'
        })
    });
    
    if (response.ok) {
        const result = await response.json();
        monitorScan(result.report_id);
        return result;
    } else {
        throw new Error('Failed to start scan');
    }
}
```

### Vulnerability Data Processing
```javascript
// Process vulnerabilities for display
function processVulnerabilities(vulnerabilities) {
    const severityCount = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
    };
    
    const fileGroups = {};
    
    vulnerabilities.forEach(vuln => {
        severityCount[vuln.severity]++;
        
        if (!fileGroups[vuln.file]) {
            fileGroups[vuln.file] = [];
        }
        fileGroups[vuln.file].push(vuln);
    });
    
    return { severityCount, fileGroups };
}
```

---

## 🔧 Service Architecture

### Modular Structure
```
src/
├── index.js                    # Main entry point (30 lines)
├── config/constants.js         # Configuration constants
├── routes/
│   ├── health.js              # Health check endpoint
│   ├── scan.js                # Direct scanning
│   └── repository.js          # Repository operations
├── services/
│   ├── analysisService.js     # AI analysis logic
│   └── repositoryService.js   # Repository processing
├── utils/fileUtils.js         # File classification utilities
└── database.js               # PostgreSQL operations
```

### Key Features
- **Modular Architecture**: Clean separation of concerns
- **Real-time Progress**: Live scan progress tracking
- **Rate Limiting**: TPM management for API calls
- **Error Handling**: Comprehensive error handling and retry logic
- **Database Integration**: PostgreSQL for persistent storage
- **Multiple Scan Types**: Complete, vulnerability, and SBOM scanning
- **File Classification**: Automatic file type detection
- **Scalable Design**: Easy to extend and maintain

---

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Copy .env.example to .env and update values
   GEMINI_API_KEY=your_google_ai_api_key
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=scanner_db
   DB_USER=scanner_user
   DB_PASSWORD=scanner_password
   ```

3. **Start Service**
   ```bash
   npm start
   ```

4. **Test Health Check**
   ```bash
   curl.exe -X GET "http://localhost:3000/health"
   ```

---

## 📞 Support

For technical support or questions about the Scanner Service API, please refer to the source code or contact the development team.

**Service Version**: 1.0  
**Last Updated**: July 31, 2025  
**Documentation Version**: 1.0