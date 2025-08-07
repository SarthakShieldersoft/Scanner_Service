const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');

// Import route modules
const healthRoutes = require('./routes/health');
const scanRoutes = require('./routes/scan');
const repositoryRoutes = require('./routes/repository');

const app = express();

// CORS configuration to allow frontend access
const corsOptions = {
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

app.use(cors(corsOptions));
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
