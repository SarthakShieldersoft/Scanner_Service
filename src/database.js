const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const pool = new Pool({
    user: process.env.DB_USER || 'scanner_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'scanner_db',
    password: process.env.DB_PASSWORD || 'scanner_password',
    port: process.env.DB_PORT || 5432,
});

// Initialize database tables
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        // Create scan_reports table
        await client.query(`
            CREATE TABLE IF NOT EXISTS scan_reports (
                id UUID PRIMARY KEY,
                report_id VARCHAR(255) UNIQUE NOT NULL,
                repo_id VARCHAR(255) NOT NULL,
                repo_url VARCHAR(500) NOT NULL,
                branch VARCHAR(255) DEFAULT 'main',
                scan_type VARCHAR(50) NOT NULL CHECK (scan_type IN ('complete', 'sbom', 'vulnerability')),
                scan_status VARCHAR(50) DEFAULT 'in_progress' CHECK (scan_status IN ('in_progress', 'completed', 'failed', 'partial')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP WITH TIME ZONE,
                total_files INTEGER DEFAULT 0,
                processed_files INTEGER DEFAULT 0,
                repository_info JSONB,
                scan_results JSONB,
                error_log TEXT,
                metadata JSONB DEFAULT '{}'::jsonb
            );
        `);

        // Create file_scan_progress table for tracking chunked file processing
        await client.query(`
            CREATE TABLE IF NOT EXISTS file_scan_progress (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                report_id VARCHAR(255) REFERENCES scan_reports(report_id),
                file_path VARCHAR(1000) NOT NULL,
                file_classification VARCHAR(50) NOT NULL,
                total_chunks INTEGER DEFAULT 1,
                processed_chunks INTEGER DEFAULT 0,
                file_status VARCHAR(50) DEFAULT 'pending' CHECK (file_status IN ('pending', 'in_progress', 'completed', 'failed')),
                last_chunk_position INTEGER DEFAULT 0,
                file_analysis JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_scan_reports_report_id ON scan_reports(report_id);
            CREATE INDEX IF NOT EXISTS idx_scan_reports_repo_id ON scan_reports(repo_id);
            CREATE INDEX IF NOT EXISTS idx_scan_reports_scan_type ON scan_reports(scan_type);
            CREATE INDEX IF NOT EXISTS idx_scan_reports_created_at ON scan_reports(created_at);
            CREATE INDEX IF NOT EXISTS idx_file_scan_progress_report_id ON file_scan_progress(report_id);
            CREATE INDEX IF NOT EXISTS idx_file_scan_progress_file_path ON file_scan_progress(file_path);
        `);

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Generate unique report ID with format: YYYYMMDD_HHMMSS_REPOID_SCANTYPE_UUID
function generateReportId(repoId, scanType) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 15); // YYYYMMDDHHMMSS
    const shortUuid = uuidv4().split('-')[0]; // First part of UUID for uniqueness
    return `${dateStr}_${repoId.slice(0, 8)}_${scanType.toUpperCase()}_${shortUuid}`;
}

// Database operations
class ScanReportDB {
    static async createScanReport(repoId, repoUrl, branch, scanType, repositoryInfo, totalFiles) {
        const client = await pool.connect();
        try {
            const id = uuidv4();
            const reportId = generateReportId(repoId, scanType);
            
            const result = await client.query(`
                INSERT INTO scan_reports (
                    id, report_id, repo_id, repo_url, branch, scan_type, 
                    total_files, repository_info
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [id, reportId, repoId, repoUrl, branch, scanType, totalFiles, repositoryInfo]);
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async updateScanReport(reportId, updates) {
        const client = await pool.connect();
        try {
            const setClause = Object.keys(updates).map((key, index) => 
                `${key} = $${index + 2}`
            ).join(', ');
            
            const values = [reportId, ...Object.values(updates)];
            
            const result = await client.query(`
                UPDATE scan_reports 
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
                WHERE report_id = $1 
                RETURNING *
            `, values);
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async completeScanReport(reportId, scanResults, processedFiles, status = 'completed') {
        return this.updateScanReport(reportId, {
            scan_results: scanResults,
            processed_files: processedFiles,
            scan_status: status,
            completed_at: new Date()
        });
    }

    static async getScanReport(reportId) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM scan_reports WHERE report_id = $1',
                [reportId]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async getAllScanReports(filters = {}) {
        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM scan_reports WHERE 1=1';
            const values = [];
            let paramIndex = 1;

            if (filters.repo_id) {
                query += ` AND repo_id = $${paramIndex}`;
                values.push(filters.repo_id);
                paramIndex++;
            }

            if (filters.scan_type) {
                query += ` AND scan_type = $${paramIndex}`;
                values.push(filters.scan_type);
                paramIndex++;
            }

            if (filters.scan_status) {
                query += ` AND scan_status = $${paramIndex}`;
                values.push(filters.scan_status);
                paramIndex++;
            }

            query += ' ORDER BY created_at DESC';

            if (filters.limit) {
                query += ` LIMIT $${paramIndex}`;
                values.push(filters.limit);
            }

            const result = await client.query(query, values);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // File progress tracking methods
    static async createFileProgress(reportId, filePath, fileClassification, totalChunks = 1) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO file_scan_progress (
                    report_id, file_path, file_classification, total_chunks
                ) VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [reportId, filePath, fileClassification, totalChunks]);
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async updateFileProgress(reportId, filePath, updates) {
        const client = await pool.connect();
        try {
            const setClause = Object.keys(updates).map((key, index) => 
                `${key} = $${index + 3}`
            ).join(', ');
            
            const values = [reportId, filePath, ...Object.values(updates)];
            
            const result = await client.query(`
                UPDATE file_scan_progress 
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
                WHERE report_id = $1 AND file_path = $2 
                RETURNING *
            `, values);
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async getFileProgress(reportId, filePath) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM file_scan_progress WHERE report_id = $1 AND file_path = $2',
                [reportId, filePath]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }
}

module.exports = {
    pool,
    initializeDatabase,
    ScanReportDB,
    generateReportId
};
