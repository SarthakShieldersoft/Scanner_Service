const { GoogleGenerativeAI } = require('@google/generative-ai');
const { 
    SYSTEM_INSTRUCTION, 
    MAX_TOKENS_PER_REQUEST, 
    REQUEST_DELAY,
    MAX_TPM,
    TPM_RESET_INTERVAL,
    TPM_SAFETY_MARGIN
} = require('../config/constants');
const { estimateTokens, chunkContent } = require('../utils/fileUtils');
const { ScanReportDB } = require('../database');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyze a single file for security vulnerabilities
 * @param {string} content - File content to analyze
 * @param {Object} file - File object with path and classification
 * @param {string} scanType - Type of scan being performed
 * @param {string} chunkInfo - Optional chunk information
 * @param {number} retryCount - Current retry attempt count
 * @returns {Object} Analysis result
 */
async function analyzeSingleFile(content, file, scanType, chunkInfo = null, retryCount = 0) {
    const maxRetries = 5; // Increased retry attempts
    const baseDelay = 3000; // Increased base delay to 3 seconds
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let systemPrompt = SYSTEM_INSTRUCTION;
        
        // Customize prompt based on scan type
        if (scanType === 'sbom') {
            systemPrompt += '\nFocus specifically on dependency analysis, version checks, and known vulnerabilities in packages.';
        } else if (scanType === 'vulnerability') {
            systemPrompt += '\nFocus specifically on code-level security vulnerabilities like injection flaws, authentication issues, and logic errors.';
        }

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "I am ready to analyze your code and dependencies." }],
                },
            ],
            generationConfig: {
                maxOutputTokens: 4096,
            },
        });

        const fileTypeInfo = chunkInfo ? ` (${chunkInfo})` : '';
        const prompt = `Analyze the following ${file.classification.toLowerCase()} file "${file.path}"${fileTypeInfo} for security issues:\n\n\`\`\`\n${content}\n\`\`\``;

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        
        return {
            file_path: file.path,
            file_type: file.classification,
            analysis: response.text()
        };
    } catch (error) {
        console.log(`⚠️ Error analyzing file ${file.path}: ${error.message}`);
        
        // Check if it's a rate limiting or service unavailable error
        if ((error.message.includes('503') || error.message.includes('429') || error.message.includes('overloaded')) && retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
            console.log(`🔄 Retrying ${file.path} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return analyzeSingleFile(content, file, scanType, chunkInfo, retryCount + 1);
        }
        
        // If max retries exceeded or different error, return error result
        return {
            file_path: file.path,
            file_type: file.classification,
            error: `Analysis failed after ${retryCount + 1} attempts: ${error.message}`,
            retry_count: retryCount + 1
        };
    }
}

/**
 * Process a file in chunks with TPM management
 * @param {string} reportId - Report ID for database updates
 * @param {string} content - File content
 * @param {Object} file - File object
 * @param {string} scanType - Type of scan
 * @param {number} tokensUsed - Current tokens used this minute
 * @param {number} lastReset - Last TPM reset timestamp
 * @returns {Object} Analysis results for all chunks
 */
async function processFileInChunksWithTPM(reportId, content, file, scanType, tokensUsed, lastReset) {
    const chunks = chunkContent(content);
    const chunkResults = [];
    let currentTokensUsed = tokensUsed;
    let currentLastReset = lastReset;
    const effectiveTPMLimit = MAX_TPM * TPM_SAFETY_MARGIN;

    console.log(`🔄 Processing ${chunks.length} chunks for ${file.path}`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const estimatedTokens = estimateTokens(chunk.content);
        const currentTime = Date.now();
        const timeElapsed = currentTime - currentLastReset;

        // Reset token count if minute has passed
        if (timeElapsed >= TPM_RESET_INTERVAL) {
            console.log(`🔄 Chunk TPM Reset: Used ${currentTokensUsed} tokens`);
            currentTokensUsed = 0;
            currentLastReset = currentTime;
        }

        // Check if adding this chunk would exceed TPM limit
        if (currentTokensUsed + estimatedTokens > effectiveTPMLimit) {
            const timeToWait = TPM_RESET_INTERVAL - timeElapsed;
            console.log(`⏳ Chunk TPM Wait: ${currentTokensUsed}/${effectiveTPMLimit} tokens. Waiting ${Math.round(timeToWait/1000)}s...`);
            
            await new Promise(resolve => setTimeout(resolve, timeToWait));
            currentTokensUsed = 0;
            currentLastReset = Date.now();
        }

        try {
            console.log(`🔍 Processing chunk ${i+1}/${chunks.length} (${estimatedTokens} tokens)`);
            const chunkResult = await analyzeSingleFile(chunk.content, file, scanType, `chunk_${i+1}_of_${chunks.length}`);
            
            chunkResults.push({
                chunk_info: `Lines ${chunk.start}-${chunk.end}`,
                analysis: chunkResult.analysis || chunkResult.error
            });
            
            currentTokensUsed += estimatedTokens;

            // Update chunk progress in database
            await ScanReportDB.updateFileProgress(reportId, file.path, {
                processed_chunks: i + 1,
                last_chunk_position: chunk.end
            });

            // Delay between chunks for API stability
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.log(`❌ Chunk ${i+1} failed: ${error.message}`);
            chunkResults.push({
                chunk_info: `Lines ${chunk.start}-${chunk.end}`,
                error: error.message
            });
        }
    }

    return {
        file_info: `Processed in ${chunks.length} chunks with TPM management`,
        chunks: chunkResults
    };
}

/**
 * Analyze code or dependencies directly (for /scan endpoint)
 * @param {string} code - Code content to analyze
 * @param {Object} dependencies - Dependencies object to analyze
 * @returns {Object} Analysis result
 */
async function analyzeCodeAndDependencies(code, dependencies) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            {
                role: "model",
                parts: [{ text: "I am ready to analyze your code and dependencies." }],
            },
        ],
        generationConfig: {
            maxOutputTokens: 4096,
        },
    });

    let prompt = '';
    if (code) {
        prompt += `Analyze the following code for security vulnerabilities:\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }
    if (dependencies) {
        prompt += `Analyze the following dependencies for outdated packages:\n\n\`\`\`\n${JSON.stringify(dependencies, null, 2)}\n\`\`\``;
    }

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
}

module.exports = {
    analyzeSingleFile,
    processFileInChunksWithTPM,
    analyzeCodeAndDependencies
};
