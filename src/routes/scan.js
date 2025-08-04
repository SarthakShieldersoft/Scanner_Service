const express = require('express');
const { analyzeCodeAndDependencies } = require('../services/analysisService');

const router = express.Router();

/**
 * Direct code and dependency scanning endpoint
 * POST /scan
 */
router.post('/', async (req, res) => {
    const { code, dependencies } = req.body;

    if (!code && !dependencies) {
        return res.status(400).json({ error: 'Please provide code or dependencies to scan.' });
    }

    try {
        const analysis = await analyzeCodeAndDependencies(code, dependencies);
        res.json({ analysis });
    } catch (error) {
        console.error('Direct scan error:', error);
        res.status(500).json({ error: 'An error occurred while analyzing the code.' });
    }
});

module.exports = router;
