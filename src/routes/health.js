const express = require('express');

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Scanner Service',
        version: '1.0.0',
        uptime: process.uptime()
    });
});

module.exports = router;
