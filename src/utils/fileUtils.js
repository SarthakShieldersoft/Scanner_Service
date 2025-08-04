const { FILE_CLASSIFICATIONS, CHUNK_SIZE, TOKENS_PER_CHAR } = require('../config/constants');

/**
 * Classify a file based on its path and name
 * @param {string} filePath - The file path
 * @param {string} fileName - The file name
 * @returns {string} Classification: 'SBOM', 'CODE', 'CONFIG', or 'OTHER'
 */
function classifyFile(filePath, fileName) {
    const extension = filePath.includes('.') ? '.' + filePath.split('.').pop() : '';
    
    if (FILE_CLASSIFICATIONS.SBOM.includes(fileName) || 
        FILE_CLASSIFICATIONS.SBOM.some(sbomFile => filePath.endsWith(sbomFile))) {
        return 'SBOM';
    }
    
    if (FILE_CLASSIFICATIONS.CODE.includes(extension)) {
        return 'CODE';
    }
    
    if (FILE_CLASSIFICATIONS.CONFIG.includes(extension)) {
        return 'CONFIG';
    }
    
    return 'OTHER';
}

/**
 * Get files from repository structure based on scan type
 * @param {Object} structure - Repository structure object
 * @param {string} scanType - Type of scan: 'complete', 'sbom', or 'vulnerability'
 * @returns {Array} Array of file objects with path, classification, and size
 */
function getFilesForScanType(structure, scanType) {
    const files = [];
    
    function traverse(obj, currentPath = '') {
        for (const [key, value] of Object.entries(obj)) {
            const filePath = currentPath ? `${currentPath}/${key}` : key;
            
            if (value.type === 'file') {
                const classification = classifyFile(filePath, key);
                
                switch (scanType) {
                    case 'complete':
                        files.push({ path: filePath, classification, size: value.size });
                        break;
                    case 'sbom':
                        if (classification === 'SBOM') {
                            files.push({ path: filePath, classification, size: value.size });
                        }
                        break;
                    case 'vulnerability':
                        if (classification === 'CODE') {
                            files.push({ path: filePath, classification, size: value.size });
                        }
                        break;
                }
            } else if (value.type === 'directory') {
                traverse(value.children || {}, filePath);
            }
        }
    }
    
    traverse(structure);
    return files;
}

/**
 * Chunk content into smaller pieces for processing
 * @param {string} content - Content to chunk
 * @param {number} chunkSize - Size of each chunk (default: CHUNK_SIZE)
 * @returns {Array} Array of chunk objects with content, start, end, and isLast properties
 */
function chunkContent(content, chunkSize = CHUNK_SIZE) {
    const chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push({
            content: content.slice(i, i + chunkSize),
            start: i,
            end: Math.min(i + chunkSize, content.length),
            isLast: i + chunkSize >= content.length
        });
    }
    return chunks;
}

/**
 * Estimate token count for given text
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
    return Math.ceil(text.length * TOKENS_PER_CHAR);
}

/**
 * Sort files by priority for processing
 * @param {Array} files - Array of file objects
 * @returns {Array} Sorted array of files
 */
function sortFilesByPriority(files) {
    return files.sort((a, b) => {
        // SBOM files first, then by size (smaller first for faster processing)
        if (a.classification === 'SBOM' && b.classification !== 'SBOM') return -1;
        if (b.classification === 'SBOM' && a.classification !== 'SBOM') return 1;
        return a.size - b.size;
    });
}

module.exports = {
    classifyFile,
    getFilesForScanType,
    chunkContent,
    estimateTokens,
    sortFilesByPriority
};
