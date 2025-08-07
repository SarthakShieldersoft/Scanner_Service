const express = require('express');
const { ScanReportDB } = require('../database');
const { getFilesForScanType } = require('../utils/fileUtils');
const { 
    cloneRepository, 
    getRepositoryStructure, 
    processRepositoryAsync, 
    retryFailedFilesAsync 
} = require('../services/repositoryService');

const router = express.Router();

/**
 * Repository scanning endpoint
 * POST /scan-repository
 */
router.post('/', async (req, res) => {
    const { repo_url, branch = 'main', scan_type = 'complete', options = {} } = req.body;

    if (!repo_url) {
        return res.status(400).json({ error: 'Please provide a repository URL.' });
    }

    if (!['complete', 'sbom', 'vulnerability'].includes(scan_type)) {
        return res.status(400).json({ error: 'Invalid scan type. Use: complete, sbom, or vulnerability.' });
    }

    let scanReport = null;
    
    try {
        // Step 1: Clone repository using Playground service
        console.log(`Cloning repository: ${repo_url}`);
        const { repo_id } = await cloneRepository(repo_url, branch);
        console.log(`Repository cloned with ID: ${repo_id}`);

        // Step 2: Get repository structure
        const { structure, total_lines, file_types, languages } = await getRepositoryStructure(repo_id);

        // Step 3: Filter files based on scan type
        const filesToScan = getFilesForScanType(structure, scan_type);
        console.log(`Found ${filesToScan.length} files to scan for scan type: ${scan_type}`);

        // Step 4: Create database record
        scanReport = await ScanReportDB.createScanReport(
            repo_id,
            repo_url,
            branch,
            scan_type,
            { total_lines, file_types, languages, structure },
            filesToScan.length
        );

        console.log(`Created scan report with ID: ${scanReport.report_id}`);

        // Return early with report ID for async processing
        res.json({
            report_id: scanReport.report_id,
            repo_id,
            scan_type,
            status: 'in_progress',
            files_to_scan: filesToScan.length,
            message: 'Scan started. Use the report_id to check progress.'
        });

        // Step 5: Process files asynchronously
        processRepositoryAsync(scanReport.report_id, repo_id, filesToScan, scan_type);

    } catch (error) {
        console.error('Repository scan error:', error);
        
        // Update database with error if record was created
        if (scanReport) {
            await ScanReportDB.updateScanReport(scanReport.report_id, {
                scan_status: 'failed',
                error_log: error.message,
                completed_at: new Date()
            });
        }
        
        if (error.response) {
            return res.status(error.response.status).json({ 
                error: `Playground service error: ${error.response.data}` 
            });
        }
        
        res.status(500).json({ error: 'An error occurred while scanning the repository.' });
    }
});

/**
 * Get scan report status and results
 * GET /scan-report/:reportId
 */
router.get('/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        const report = await ScanReportDB.getScanReport(reportId);
        
        if (!report) {
            return res.status(404).json({ error: 'Scan report not found.' });
        }

        // Extract vulnerability counts from scan results
        const vulnerabilityCount = {
            Low: 0,
            Medium: 0,
            High: 0,
            Critical: 0
        };

        if (report.scan_results) {
            Object.values(report.scan_results).forEach(fileResult => {
                if (fileResult.analysis) {
                    const analysis = fileResult.analysis.toLowerCase();
                    
                    // Count occurrences of severity keywords
                    const criticalMatches = (analysis.match(/critical|severity.*critical|critical.*severity/g) || []).length;
                    const highMatches = (analysis.match(/high.*severity|severity.*high/g) || []).length;
                    const mediumMatches = (analysis.match(/medium.*severity|severity.*medium/g) || []).length;
                    const lowMatches = (analysis.match(/low.*severity|severity.*low/g) || []).length;

                    // Add to counts
                    vulnerabilityCount.Critical += criticalMatches;
                    vulnerabilityCount.High += highMatches;
                    vulnerabilityCount.Medium += mediumMatches;
                    vulnerabilityCount.Low += lowMatches;
                }
            });
        }

        res.json({
            report_id: report.report_id,
            repo_id: report.repo_id,
            repo_url: report.repo_url,
            branch: report.branch,
            scan_type: report.scan_type,
            status: report.scan_status,
            created_at: report.created_at,
            completed_at: report.completed_at,
            progress: {
                total_files: report.total_files,
                processed_files: report.processed_files,
                percentage: report.total_files > 0 ? Math.round((report.processed_files / report.total_files) * 100) : 0
            },
            vulnerability_count: vulnerabilityCount,
            repository_info: report.repository_info,
            scan_results: report.scan_results,
            error_log: report.error_log
        });
    } catch (error) {
        console.error('Error fetching scan report:', error);
        res.status(500).json({ error: 'An error occurred while fetching the scan report.' });
    }
});

/**
 * Get scan report summary with vulnerability counts (Frontend-specific endpoint)
 * GET /scan-report/:reportId/summary
 */
router.get('/:reportId/summary', async (req, res) => {
    try {
        const { reportId } = req.params;
        const report = await ScanReportDB.getScanReport(reportId);
        
        if (!report) {
            return res.status(404).json({ error: 'Scan report not found.' });
        }

        // Extract vulnerability counts from scan results
        const vulnerabilityCount = {
            Low: 0,
            Medium: 0,
            High: 0,
            Critical: 0
        };

        if (report.scan_results) {
            Object.values(report.scan_results).forEach(fileResult => {
                if (fileResult.analysis) {
                    const analysis = fileResult.analysis.toLowerCase();
                    
                    // Count occurrences of severity keywords
                    const criticalMatches = (analysis.match(/critical|severity.*critical|critical.*severity/g) || []).length;
                    const highMatches = (analysis.match(/high.*severity|severity.*high/g) || []).length;
                    const mediumMatches = (analysis.match(/medium.*severity|severity.*medium/g) || []).length;
                    const lowMatches = (analysis.match(/low.*severity|severity.*low/g) || []).length;

                    // Add to counts (each file can contribute multiple vulnerabilities)
                    vulnerabilityCount.Critical += criticalMatches;
                    vulnerabilityCount.High += highMatches;
                    vulnerabilityCount.Medium += mediumMatches;
                    vulnerabilityCount.Low += lowMatches;
                }
            });
        }

        res.json({
            report_id: report.report_id,
            repo_id: report.repo_id,
            repo_url: report.repo_url,
            scan_type: report.scan_type,
            status: report.scan_status,
            created_at: report.created_at,
            completed_at: report.completed_at,
            progress: {
                total_files: report.total_files,
                processed_files: report.processed_files,
                percentage: report.total_files > 0 ? Math.round((report.processed_files / report.total_files) * 100) : 0
            },
            vulnerability_count: vulnerabilityCount
        });
    } catch (error) {
        console.error('Error fetching scan report summary:', error);
        res.status(500).json({ error: 'An error occurred while fetching the scan report summary.' });
    }
});

/**
 * List all scan reports with optional filters
 * GET /scan-reports
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            repo_id: req.query.repo_id,
            scan_type: req.query.scan_type,
            scan_status: req.query.status,
            limit: req.query.limit ? parseInt(req.query.limit) : 50
        };

        const reports = await ScanReportDB.getAllScanReports(filters);
        
        res.json({
            total: reports.length,
            reports: reports.map(report => ({
                report_id: report.report_id,
                repo_id: report.repo_id,
                repo_url: report.repo_url,
                scan_type: report.scan_type,
                status: report.scan_status,
                created_at: report.created_at,
                completed_at: report.completed_at,
                progress: {
                    total_files: report.total_files,
                    processed_files: report.processed_files,
                    percentage: report.total_files > 0 ? Math.round((report.processed_files / report.total_files) * 100) : 0
                }
            }))
        });
    } catch (error) {
        console.error('Error fetching scan reports:', error);
        res.status(500).json({ error: 'An error occurred while fetching scan reports.' });
    }
});

/**
 * Retry failed files in a scan report
 * POST /retry-scan/:reportId
 */
router.post('/retry/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        const report = await ScanReportDB.getScanReport(reportId);
        
        if (!report) {
            return res.status(404).json({ error: 'Scan report not found.' });
        }

        if (report.scan_status !== 'completed') {
            return res.status(400).json({ error: 'Cannot retry scan that is not completed.' });
        }

        // Count failed files
        const failedFiles = [];
        if (report.scan_results) {
            for (const [filePath, result] of Object.entries(report.scan_results)) {
                if (result.error || (typeof result === 'object' && result.error)) {
                    failedFiles.push({
                        path: filePath,
                        classification: result.file_type || 'OTHER'
                    });
                }
            }
        }

        if (failedFiles.length === 0) {
            return res.json({
                message: 'No failed files found to retry.',
                failed_files: 0
            });
        }

        // Update scan status to in_progress for retry
        await ScanReportDB.updateScanReport(reportId, {
            scan_status: 'in_progress',
            error_log: null
        });

        res.json({
            message: `Retrying ${failedFiles.length} failed files.`,
            failed_files: failedFiles.length,
            report_id: reportId
        });

        // Process failed files asynchronously
        retryFailedFilesAsync(reportId, report.repo_id, failedFiles, report.scan_type);

    } catch (error) {
        console.error('Error retrying scan:', error);
        res.status(500).json({ error: 'An error occurred while retrying the scan.' });
    }
});

module.exports = router;
