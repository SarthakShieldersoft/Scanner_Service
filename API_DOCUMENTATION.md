# Code Scanner Service API Documentation

## Overview
The Code Scanner Service is a containerized Node.js application that uses Google's Gemini AI to analyze code snippets and dependency files for potential security vulnerabilities and outdated packages.

**Base URL:** `http://localhost:3000`
**Content-Type:** `application/json`

---

## Endpoints

### POST /scan

Analyzes code snippets and/or dependency files for security vulnerabilities and outdated packages.

#### Request

**HTTP Method:** `POST`
**Endpoint:** `/scan`
**Content-Type:** `application/json`

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | No* | Code snippet to analyze for security vulnerabilities |
| `dependencies` | object | No* | Package.json style dependencies object to analyze for outdated packages |

*At least one of `code` or `dependencies` must be provided.

#### Request Examples

**1. Code Analysis Only:**
```bash
curl.exe -X POST -H "Content-Type: application/json" \
-d '{\"code\": \"const user = req.query.user; eval(user);\"}' \
http://localhost:3000/scan
```

**2. Dependencies Analysis Only:**
```bash
curl.exe -X POST -H "Content-Type: application/json" \
-d '{\"dependencies\": {\"express\": \"4.17.1\", \"lodash\": \"4.17.20\", \"jquery\": \"3.4.1\"}}' \
http://localhost:3000/scan
```

**3. Combined Analysis:**
```bash
curl.exe -X POST -H "Content-Type: application/json" \
-d '{\"code\": \"const sql = \\\"SELECT * FROM users WHERE id = \\\" + userId;\", \"dependencies\": {\"mysql\": \"2.18.1\"}}' \
http://localhost:3000/scan
```

#### Response Examples

**Success Response (200 OK):**
```json
{
  "analysis": "The code snippet `const user = req.query.user; eval(user);` contains a critical security vulnerability: **Remote Code Execution (RCE).**\n\n**Vulnerability Type:**\n* Remote Code Execution (RCE)\n\n**Severity:** Critical\n\n**Description:**\n\nThe code directly uses the `eval()` function on the `user` parameter, which comes from the `req.query` object. This object typically contains data submitted by a user through a GET request (e.g., in a URL). By using `eval()`, the server executes the user-supplied input as JavaScript code. A malicious actor could craft a specially designed `user` query parameter containing arbitrary JavaScript code, enabling them to execute that code on the server with the privileges of the Node.js process..."
}
```

**Error Response - Missing Required Data (400 Bad Request):**
```json
{
  "error": "Please provide code or dependencies to scan."
}
```

**Error Response - Server Error (500 Internal Server Error):**
```json
{
  "error": "An error occurred while analyzing the code."
}
```

---

## Error Handling

### Invalid JSON Request
**Request:**
```bash
curl.exe -X POST -H "Content-Type: application/json" -d 'invalid json' http://localhost:3000/scan
```

**Response (400 Bad Request):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>SyntaxError: Unexpected token 'i', "invalid json" is not valid JSON</pre>
</body>
</html>
```

### Non-existent Endpoints
**Request:**
```bash
curl.exe -X GET http://localhost:3000/health
```

**Response (404 Not Found):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /health</pre>
</body>
</html>
```

---

## Analysis Output Format

The service provides detailed security analysis including:

### For Code Analysis:
- **Vulnerability Type:** (e.g., SQL Injection, Remote Code Execution, XSS)
- **Severity:** Critical, High, Medium, Low
- **Description:** Detailed explanation of the vulnerability
- **Remediation:** Step-by-step instructions to fix the issue
- **Code Examples:** Secure code alternatives

### For Dependencies Analysis:
- **Package Name:** Name of the outdated package
- **Current Version:** Version specified in the request
- **Recommended Version:** Latest stable version available
- **Vulnerability Risk:** Assessment of security risk level
- **Update Commands:** Specific npm/yarn commands to update

### Combined Analysis:
When both code and dependencies are provided, the service analyzes both and provides a comprehensive report covering all identified issues.

---

## Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success - Analysis completed successfully |
| 400 | Bad Request - Invalid JSON or missing required parameters |
| 500 | Internal Server Error - Error during analysis processing |
| 404 | Not Found - Endpoint does not exist |

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production deployments.

---

## Authentication

Currently, no authentication is required. The service uses the Gemini API key configured via environment variables.

---

## Examples of Detected Vulnerabilities

### 1. Remote Code Execution (RCE)
**Code:** `const user = req.query.user; eval(user);`
**Risk:** Critical - Allows arbitrary code execution

### 2. SQL Injection
**Code:** `const sql = "SELECT * FROM users WHERE id = " + userId;`
**Risk:** Critical - Allows database manipulation

### 3. Outdated Dependencies
**Dependencies:** `{"express": "4.17.1", "jquery": "3.4.1"}`
**Risk:** Medium-High - Known vulnerabilities in older versions

---

## Docker Usage

**Build:**
```bash
docker build -t code-scanner-service .
```

**Run:**
```bash
docker run -p 3000:3000 -e GEMINI_API_KEY=YOUR_API_KEY code-scanner-service
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI analysis |
| `PORT` | No | Port number (default: 3000) |

---

## Testing Script

A PowerShell testing script is available at `test-service.ps1` for comprehensive endpoint testing:

```powershell
.\test-service.ps1
```

This script tests all major scenarios including success cases, error handling, and edge cases.
