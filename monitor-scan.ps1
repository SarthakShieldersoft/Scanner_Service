# Monitor scan progress script
param(
    [string]$ReportId = "20250731062238_ebe945fe_COMPLETE_6b2ae3ac",
    [int]$CheckIntervalSeconds = 30
)

$baseUrl = "http://localhost:3000"
$reportUrl = "$baseUrl/scan-report/$ReportId"

Write-Host "Monitoring scan progress for Report ID: $ReportId" -ForegroundColor Cyan
Write-Host "Checking every $CheckIntervalSeconds seconds..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

while ($true) {
    try {
        $report = Invoke-RestMethod -Uri $reportUrl -Method GET
        
        $currentTime = Get-Date
        $elapsed = $currentTime - $startTime
        $percentage = $report.progress.percentage
        $processed = $report.progress.processed_files
        $total = $report.progress.total_files
        $status = $report.status
        
        # Show progress
        $progressBar = "#" * [math]::Floor($percentage / 5) + "-" * (20 - [math]::Floor($percentage / 5))
        
        Write-Host "$(Get-Date -Format 'HH:mm:ss') | Status: $status | Progress: [$progressBar] $percentage% ($processed/$total files) | Elapsed: $($elapsed.ToString('hh\:mm\:ss'))"
        
        # Check if status changed
        if ($status -eq "completed") {
            Write-Host ""
            Write-Host "Scan completed successfully!" -ForegroundColor Green
            Write-Host "Getting full report..." -ForegroundColor Cyan
            
            # Get full report
            $global:fullReport = Invoke-RestMethod -Uri $reportUrl -Method GET
            
            Write-Host ""
            Write-Host "SCAN SUMMARY:" -ForegroundColor Cyan
            Write-Host "Repository: $($global:fullReport.repo_url)" -ForegroundColor White
            Write-Host "Scan Type: $($global:fullReport.scan_type.ToUpper())" -ForegroundColor White
            Write-Host "Files Analyzed: $($global:fullReport.progress.total_files)" -ForegroundColor White
            Write-Host "Duration: $($elapsed.ToString('hh\:mm\:ss'))" -ForegroundColor White
            Write-Host "Completed At: $($global:fullReport.completed_at)" -ForegroundColor White
            
            if ($global:fullReport.scan_results) {
                $vulnerabilityCount = $global:fullReport.scan_results.PSObject.Properties.Count
                Write-Host "Files with Issues: $vulnerabilityCount" -ForegroundColor Yellow
                
                Write-Host ""
                Write-Host "FILES WITH SECURITY ISSUES:" -ForegroundColor Red
                
                foreach ($file in $global:fullReport.scan_results.PSObject.Properties) {
                    Write-Host "File: $($file.Name)" -ForegroundColor Yellow
                    
                    # Extract severity indicators from analysis
                    $analysis = $file.Value.analysis
                    if ($analysis -match "Critical|CRITICAL") {
                        Write-Host "   Contains CRITICAL vulnerabilities" -ForegroundColor Red
                    } elseif ($analysis -match "High|HIGH") {
                        Write-Host "   Contains HIGH severity issues" -ForegroundColor Red
                    } elseif ($analysis -match "Medium|MEDIUM") {
                        Write-Host "   Contains MEDIUM severity issues" -ForegroundColor Yellow
                    } else {
                        Write-Host "   Security analysis completed" -ForegroundColor Cyan
                    }
                }
            }
            
            Write-Host ""
            Write-Host "Full report saved to variable fullReport" -ForegroundColor Green
            Write-Host "You can also view it at: $reportUrl" -ForegroundColor Green
            
            break
        } elseif ($status -eq "failed") {
            Write-Host ""
            Write-Host "Scan failed!" -ForegroundColor Red
            if ($report.error_log) {
                Write-Host "Error: $($report.error_log)" -ForegroundColor Red
            }
            break
        }
        
        Start-Sleep -Seconds $CheckIntervalSeconds
        
    } catch {
        Write-Host ""
        Write-Host "Error checking progress: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Retrying in $CheckIntervalSeconds seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds $CheckIntervalSeconds
    }
}

Write-Host ""
Write-Host "Monitoring completed!" -ForegroundColor Green
