#!/usr/bin/env node

/**
 * Test script for Scanner Service
 * Tests the new repository scanning endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const PLAYGROUND_URL = 'http://localhost:8000';

// Test configuration
const TEST_REPO = 'octocat/Hello-World';
const SCAN_TYPES = ['complete', 'sbom', 'vulnerability'];

async function testHealthChecks() {
    console.log('🔍 Testing health checks...\n');
    
    try {
        // Test Scanner service
        const scannerResponse = await axios.get(`${BASE_URL}/scan-reports?limit=1`);
        console.log('✅ Scanner service is running');
    } catch (error) {
        console.log('❌ Scanner service is not running');
        return false;
    }

    try {
        // Test Playground service
        const playgroundResponse = await axios.get(`${PLAYGROUND_URL}/health`);
        console.log('✅ Playground service is running');
        console.log('📊 Playground metrics:', {
            status: playgroundResponse.data.status,
            uptime: `${Math.round(playgroundResponse.data.uptime)}s`,
            memory_usage: `${Math.round(playgroundResponse.data.memory_usage.percent)}%`,
            cpu_usage: `${playgroundResponse.data.cpu_usage}%`
        });
    } catch (error) {
        console.log('❌ Playground service is not running');
        return false;
    }

    console.log();
    return true;
}

async function testRepositoryScanning() {
    console.log('🚀 Testing repository scanning...\n');

    for (const scanType of SCAN_TYPES) {
        try {
            console.log(`📝 Starting ${scanType} scan of ${TEST_REPO}...`);
            
            const scanResponse = await axios.post(`${BASE_URL}/scan-repository`, {
                repo_url: TEST_REPO,
                scan_type: scanType,
                branch: 'master' // Hello-World uses master branch
            });

            const { report_id, repo_id, files_to_scan } = scanResponse.data;
            
            console.log(`📋 Scan started:`);
            console.log(`   Report ID: ${report_id}`);
            console.log(`   Repo ID: ${repo_id}`);
            console.log(`   Files to scan: ${files_to_scan}`);
            console.log(`   Status: ${scanResponse.data.status}`);

            // Wait a moment then check progress
            console.log('⏳ Waiting 5 seconds before checking progress...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            const progressResponse = await axios.get(`${BASE_URL}/scan-report/${report_id}`);
            const progress = progressResponse.data;

            console.log(`📊 Progress update:`);
            console.log(`   Status: ${progress.status}`);
            console.log(`   Progress: ${progress.progress.processed_files}/${progress.progress.total_files} (${progress.progress.percentage}%)`);
            
            if (progress.status === 'completed') {
                console.log(`✅ ${scanType} scan completed successfully`);
                console.log(`🔍 Found analysis for ${Object.keys(progress.scan_results).length} files`);
            } else {
                console.log(`⏸️  ${scanType} scan still in progress`);
            }

            console.log();
            
        } catch (error) {
            console.log(`❌ Error testing ${scanType} scan:`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data:`, error.response.data);
            } else {
                console.log(`   Message: ${error.message}`);
            }
            console.log();
        }
    }
}

async function testListReports() {
    console.log('📋 Testing report listing...\n');

    try {
        const response = await axios.get(`${BASE_URL}/scan-reports?limit=5`);
        const { total, reports } = response.data;

        console.log(`📊 Found ${total} scan reports (showing last 5):`);
        
        if (reports.length === 0) {
            console.log('   No reports found');
        } else {
            reports.forEach((report, index) => {
                console.log(`   ${index + 1}. ${report.report_id}`);
                console.log(`      Repo: ${report.repo_url}`);
                console.log(`      Type: ${report.scan_type}`);
                console.log(`      Status: ${report.status}`);
                console.log(`      Created: ${new Date(report.created_at).toLocaleString()}`);
                console.log(`      Progress: ${report.progress.percentage}%`);
                console.log();
            });
        }
    } catch (error) {
        console.log('❌ Error listing reports:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Message: ${error.message}`);
        }
    }
}

async function testLegacyEndpoint() {
    console.log('🔄 Testing legacy code scanning endpoint...\n');

    try {
        const testCode = `
const express = require('express');
const app = express();

app.get('/user', (req, res) => {
    const userId = req.query.id;
    const query = "SELECT * FROM users WHERE id = " + userId; // SQL Injection vulnerability
    // ... rest of the code
    res.send(query);
});
        `.trim();

        const response = await axios.post(`${BASE_URL}/scan`, {
            code: testCode,
            dependencies: {
                "express": "4.17.1",
                "lodash": "4.17.20"
            }
        });

        console.log('✅ Legacy endpoint working');
        console.log('🔍 Analysis preview:', response.data.analysis.substring(0, 200) + '...');
        console.log();
        
    } catch (error) {
        console.log('❌ Error testing legacy endpoint:', error.response?.data || error.message);
        console.log();
    }
}

async function runTests() {
    console.log('🧪 Scanner Service Test Suite\n');
    console.log('='.repeat(50));

    const servicesUp = await testHealthChecks();
    
    if (!servicesUp) {
        console.log('❌ Cannot proceed with tests - services are not running');
        console.log('\nPlease ensure:');
        console.log('1. Scanner service is running on port 3000');
        console.log('2. Playground service is running on port 8000');
        console.log('3. PostgreSQL database is accessible');
        return;
    }

    await testLegacyEndpoint();
    await testRepositoryScanning();
    await testListReports();

    console.log('🎉 Test suite completed!');
    console.log('\nNext steps:');
    console.log('1. Check the database for stored reports');
    console.log('2. Monitor logs for any issues');
    console.log('3. Test with your own repositories');
}

// Handle command line arguments
if (process.argv.includes('--health-only')) {
    testHealthChecks();
} else if (process.argv.includes('--repo-only')) {
    testRepositoryScanning();
} else if (process.argv.includes('--legacy-only')) {
    testLegacyEndpoint();
} else {
    runTests();
}
