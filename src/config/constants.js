// Configuration constants for the Scanner service

// File classification for different scan types
const FILE_CLASSIFICATIONS = {
    SBOM: [
        'package.json', 'package-lock.json', 'yarn.lock',
        'requirements.txt', 'Pipfile', 'Pipfile.lock', 'poetry.lock',
        'pom.xml', 'build.gradle', 'build.gradle.kts',
        'Cargo.toml', 'Cargo.lock',
        'go.mod', 'go.sum',
        'composer.json', 'composer.lock',
        'Gemfile', 'Gemfile.lock'
    ],
    CODE: [
        '.js', '.ts', '.jsx', '.tsx',
        '.py', '.pyx',
        '.java', '.scala', '.kt',
        '.php', '.rb',
        '.go', '.rs',
        '.c', '.cpp', '.cc', '.cxx',
        '.cs', '.vb',
        '.sql', '.pl'
    ],
    CONFIG: [
        '.yaml', '.yml', '.json', '.xml', '.toml', '.ini', '.conf', '.config'
    ]
};

// Token estimation and rate limiting constants
const TOKENS_PER_CHAR = 0.25;
const MAX_TOKENS_PER_REQUEST = 25000; // More conservative limit
const MAX_TPM = 1200000; // Further reduced TPM limit for better reliability
const CHUNK_SIZE = 6000; // Smaller chunks to be more conservative
const REQUEST_DELAY = 5000; // 5 seconds between requests for better spacing
const TPM_RESET_INTERVAL = 60000; // 1 minute in milliseconds
const TPM_SAFETY_MARGIN = 0.8; // Use only 80% of TPM limit for safety

// AI system instruction for vulnerability analysis
const SYSTEM_INSTRUCTION = `
You are a security expert. Analyze the provided code snippets and dependency files for potential security vulnerabilities and outdated packages. 
Provide a detailed report of your findings, including the vulnerability type, severity, and recommended remediation.
For dependency files, list any outdated packages with their current version and the recommended latest version.
`;

module.exports = {
    FILE_CLASSIFICATIONS,
    TOKENS_PER_CHAR,
    MAX_TOKENS_PER_REQUEST,
    MAX_TPM,
    CHUNK_SIZE,
    REQUEST_DELAY,
    TPM_RESET_INTERVAL,
    TPM_SAFETY_MARGIN,
    SYSTEM_INSTRUCTION
};
