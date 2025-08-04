const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const { initializeDatabase } = require('./database');

// Import route modules
const healthRoutes = require('./routes/health');
const scanRoutes = require('./routes/scan');
const repositoryRoutes = require('./routes/repository');

const app = express();
app.use(express.json());

// Setup routes
app.use('/health', healthRoutes);
app.use('/scan', scanRoutes);
app.use('/scan-repository', repositoryRoutes);
app.use('/scan-report', repositoryRoutes);
app.use('/scan-reports', repositoryRoutes);
app.use('/retry-scan', repositoryRoutes);

const port = process.env.PORT || 3000;

// Initialize database and start server
async function startServer() {
    try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialized successfully');
        
        app.listen(port, () => {
            console.log(`Scanner service is running on port ${port}`);
            
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
