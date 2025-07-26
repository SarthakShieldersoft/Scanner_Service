# Test script for the Code Scanner Service

# Test 1: Security vulnerability in code
Write-Host "=== Test 1: Security Vulnerability Analysis ===" -ForegroundColor Green
$response1 = Invoke-RestMethod -Uri "http://localhost:3000/scan" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"code": "const user = req.query.user; eval(user);"}'
Write-Host "Analysis:" -ForegroundColor Yellow
Write-Host $response1.analysis
Write-Host ""

# Test 2: Dependency analysis
Write-Host "=== Test 2: Dependency Analysis ===" -ForegroundColor Green
$response2 = Invoke-RestMethod -Uri "http://localhost:3000/scan" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"dependencies": {"express": "4.17.1", "lodash": "4.17.20"}}'
Write-Host "Analysis:" -ForegroundColor Yellow
Write-Host $response2.analysis
Write-Host ""

# Test 3: Combined analysis
Write-Host "=== Test 3: Combined Code and Dependency Analysis ===" -ForegroundColor Green
$response3 = Invoke-RestMethod -Uri "http://localhost:3000/scan" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"code": "const sql = \"SELECT * FROM users WHERE id = \" + userId;", "dependencies": {"mysql": "2.18.1"}}'
Write-Host "Analysis:" -ForegroundColor Yellow
Write-Host $response3.analysis
Write-Host ""

# Test 4: Error handling - empty request
Write-Host "=== Test 4: Error Handling ===" -ForegroundColor Green
try {
    $response4 = Invoke-RestMethod -Uri "http://localhost:3000/scan" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{}'
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host $response4
} catch {
    Write-Host "Error Response (expected):" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
