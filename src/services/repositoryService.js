const axios = require('axios');
const { ScanReportDB } = require('../database');
const { 
    MAX_TOKENS_PER_REQUEST, 
    REQUEST_DELAY, 
    MAX_TPM, 
    TPM_RESET_INTERVAL, 
    TPM_SAFETY_MARGIN 
} = require('../config/constants');
const { estimateTokens, sortFilesByPriority } = require('../utils/fileUtils');
const { analyzeSingleFile, processFileInChunksWithTPM } = require('./analysisService');

const PLAYGROUND_BASE_URL = process.env.PLAYGROUND_URL || 'http://localhost:8000';

/**
 * Process repository files with rate limiting and database updates
 * @param {string} reportId - Database report ID
 * @param {string} repoId - Repository ID from playground service
 * @param {Array} files - Array of files to process
 * @param {string} scanType - Type of scan being performed
 * @returns {Object} Processing results
 */
async function processFilesWithRateLimit(reportId, repoId, files, scanType) {
    const results = {};
    let tokensUsedThisMinute = 0;
    let lastResetTime = Date.now();
    let processedCount = 0;
    const effectiveTPMLimit = MAX_TPM * TPM_SAFETY_MARGIN; // Use 80% of TPM limit
    
    // Sort files by priority (SBOM files first, then by size - smaller first for faster processing)
    const sortedFiles = sortFilesByPriority(files);

    console.log(`🚀 Starting TPM-aware processing: ${sortedFiles.length} files, TPM limit: ${effectiveTPMLimit}`);

    for (const file of sortedFiles) {
        try {
            console.log(`Processing file: ${file.path} (${file.classification})`);
            
            // Create file progress record
            await ScanReportDB.createFileProgress(reportId, file.path, file.classification);
            
            // Get file content from Playground
            const fileResponse = await axios.get(`${PLAYGROUND_BASE_URL}/file?repo_id=${repoId}&path=${encodeURIComponent(file.path)}`);
            
            // Handle different response formats from Playground service
            let content;
            if (typeof fileResponse.data === 'string') {
                content = fileResponse.data;
            } else if (fileResponse.data && typeof fileResponse.data.content === 'string') {
                content = fileResponse.data.content;
            } else if (fileResponse.data && fileResponse.data.data) {
                content = typeof fileResponse.data.data === 'string' ? fileResponse.data.data : JSON.stringify(fileResponse.data.data);
            } else {
                content = JSON.stringify(fileResponse.data);
            }

            if (!content || typeof content !== 'string' || content.trim().length === 0) {
                results[file.path] = { error: 'Empty file or could not retrieve content' };
                await ScanReportDB.updateFileProgress(reportId, file.path, {
                    file_status: 'failed',
                    file_analysis: { error: 'Empty file or could not retrieve content' }
                });
                processedCount++;
                continue;
            }

            // Update file progress to in_progress
            await ScanReportDB.updateFileProgress(reportId, file.path, {
                file_status: 'in_progress'
            });

            // Estimate tokens for this file
            const estimatedTokens = estimateTokens(content);
            
            // Smart TPM management
            const currentTime = Date.now();
            const timeElapsed = currentTime - lastResetTime;
            
            // Reset token count if minute has passed
            if (timeElapsed >= TPM_RESET_INTERVAL) {
                console.log(`🔄 TPM Reset: Used ${tokensUsedThisMinute} tokens in last minute`);
                tokensUsedThisMinute = 0;
                lastResetTime = currentTime;
            }
            
            // Check if adding this file would exceed TPM limit
            if (tokensUsedThisMinute + estimatedTokens > effectiveTPMLimit) {
                const timeToWait = TPM_RESET_INTERVAL - timeElapsed;
                console.log(`⏳ TPM Limit Reached: ${tokensUsedThisMinute}/${effectiveTPMLimit} tokens used. Waiting ${Math.round(timeToWait/1000)}s for reset...`);
                
                await new Promise(resolve => setTimeout(resolve, timeToWait));
                tokensUsedThisMinute = 0;
                lastResetTime = Date.now();
                console.log(`✅ TPM Reset Complete: Ready to process ${file.path}`);
            }
            
            // Check if we need to chunk the file
            if (estimatedTokens > MAX_TOKENS_PER_REQUEST) {
                console.log(`📄 Large file ${file.path} (${estimatedTokens} tokens), processing in chunks`);
                const chunks = require('../utils/fileUtils').chunkContent(content);
                
                await ScanReportDB.updateFileProgress(reportId, file.path, {
                    total_chunks: chunks.length
                });
                
                results[file.path] = await processFileInChunksWithTPM(reportId, content, file, scanType, tokensUsedThisMinute, lastResetTime);
            } else {
                // Process single file
                console.log(`🔍 Analyzing ${file.path} (${estimatedTokens} tokens, ${tokensUsedThisMinute}/${effectiveTPMLimit} TPM used)`);
                results[file.path] = await analyzeSingleFile(content, file, scanType);
                tokensUsedThisMinute += estimatedTokens;
            }

            // Check if analysis was successful or failed
            const analysisResult = results[file.path];
            if (analysisResult.error) {
                console.log(`❌ Failed to analyze ${file.path}: ${analysisResult.error}`);
                await ScanReportDB.updateFileProgress(reportId, file.path, {
                    file_status: 'failed',
                    file_analysis: analysisResult
                });
            } else {
                console.log(`✅ Successfully analyzed ${file.path}`);
                await ScanReportDB.updateFileProgress(reportId, file.path, {
                    file_status: 'completed',
                    processed_chunks: 1,
                    file_analysis: analysisResult
                });
            }

            processedCount++;
            
            // Update overall progress
            await ScanReportDB.updateScanReport(reportId, {
                processed_files: processedCount
            });

            // Small delay between files to be respectful
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));

        } catch (error) {
            console.error(`Error processing file ${file.path}:`, error);
            results[file.path] = { error: error.message };
            
            await ScanReportDB.updateFileProgress(reportId, file.path, {
                file_status: 'failed',
                file_analysis: { error: error.message }
            });
            
            processedCount++;
            await ScanReportDB.updateScanReport(reportId, {
                processed_files: processedCount
            });
        }
    }

    console.log(`🎯 Processing complete: ${processedCount}/${files.length} files processed`);
    return results;
}

/**
 * Process repository asynchronously
 * @param {string} reportId - Database report ID
 * @param {string} repoId - Repository ID from playground service
 * @param {Array} files - Files to process
 * @param {string} scanType - Type of scan
 */
async function processRepositoryAsync(reportId, repoId, files, scanType) {
    try {
        console.log(`Starting async processing for report: ${reportId}`);
        
        if (files.length === 0) {
            await ScanReportDB.completeScanReport(reportId, {
                message: 'No files found matching the scan criteria.'
            }, 0, 'completed');
            return;
        }

        const results = await processFilesWithRateLimit(reportId, repoId, files, scanType);
        
        await ScanReportDB.completeScanReport(reportId, results, files.length, 'completed');
        console.log(`Completed processing for report: ${reportId}`);
        
    } catch (error) {
        console.error(`Error in async processing for report ${reportId}:`, error);
        await ScanReportDB.updateScanReport(reportId, {
            scan_status: 'failed',
            error_log: error.message,
            completed_at: new Date()
        });
    }
}

/**
 * Retry failed files asynchronously
 * @param {string} reportId - Database report ID
 * @param {string} repoId - Repository ID
 * @param {Array} failedFiles - Failed files to retry
 * @param {string} scanType - Type of scan
 */
async function retryFailedFilesAsync(reportId, repoId, failedFiles, scanType) {
    try {
        console.log(`🔄 Retrying ${failedFiles.length} failed files for report: ${reportId}`);
        
        const results = await processFilesWithRateLimit(reportId, repoId, failedFiles, scanType);
        
        // Get current scan results and update with retry results
        const currentReport = await ScanReportDB.getScanReport(reportId);
        const updatedResults = { ...currentReport.scan_results, ...results };
        
        await ScanReportDB.updateScanReport(reportId, {
            scan_results: updatedResults,
            scan_status: 'completed',
            completed_at: new Date()
        });
        
        console.log(`✅ Completed retry processing for report: ${reportId}`);
        
    } catch (error) {
        console.error(`❌ Error in retry processing for report ${reportId}:`, error);
        await ScanReportDB.updateScanReport(reportId, {
            scan_status: 'failed',
            error_log: error.message,
            completed_at: new Date()
        });
    }
}

/**
 * Clone repository using playground service
 * @param {string} repoUrl - Repository URL
 * @param {string} branch - Repository branch
 * @returns {Object} Clone response with repo_id
 */
async function cloneRepository(repoUrl, branch) {
    const response = await axios.post(`${PLAYGROUND_BASE_URL}/clone`, {
        repo_url: repoUrl,
        branch
    });
    return response.data;
}

/**
 * Get repository structure from playground service
 * @param {string} repoId - Repository ID
 * @returns {Object} Repository structure and metadata
 */
async function getRepositoryStructure(repoId) {
    const response = await axios.get(`${PLAYGROUND_BASE_URL}/generate?repo_id=${repoId}`);
    return response.data;
}

module.exports = {
    processFilesWithRateLimit,
    processRepositoryAsync,
    retryFailedFilesAsync,
    cloneRepository,
    getRepositoryStructure
};
