import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Database } from './db/database.js';
import { SynapseService } from './services/synapse.js';
import { createStorageRouter } from './routes/storage.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const DATABASE_PATH = process.env.DATABASE_PATH || './storage.db';
const FILECOIN_PRIVATE_KEY = process.env.FILECOIN_PRIVATE_KEY;
const BACKEND_FILECOIN_ADDRESS = process.env.BACKEND_FILECOIN_ADDRESS;

if (!FILECOIN_PRIVATE_KEY) {
    console.error('Error: FILECOIN_PRIVATE_KEY environment variable is required');
    process.exit(1);
}

if (!BACKEND_FILECOIN_ADDRESS) {
    console.error('Error: BACKEND_FILECOIN_ADDRESS environment variable is required');
    process.exit(1);
}

// TypeScript now knows these are defined
const privateKey: string = FILECOIN_PRIVATE_KEY;
const backendAddress: string = BACKEND_FILECOIN_ADDRESS;

async function startServer() {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());

    // Initialize database
    console.log('Initializing database...');
    const db = new Database(DATABASE_PATH);
    await db.initialize();
    console.log('Database initialized');

    // Initialize Synapse SDK
    console.log('Initializing Synapse SDK...');
    const synapseService = new SynapseService(
        privateKey,
        backendAddress
    );
    await synapseService.initialize();
    console.log('Synapse SDK initialized');

    // Check backend wallet balance
    try {
        const balance = await synapseService.getBalance();
        const allowance = await synapseService.getAllowance();
        console.log(`Backend wallet balance: ${balance.toString()} wei`);
        console.log(`Backend wallet allowance: ${allowance.toString()} wei`);
    } catch (error) {
        console.error('Warning: Failed to check backend wallet balance:', error);
    }

    // Mount storage routes
    app.use('/api', createStorageRouter(db, synapseService));

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('Unhandled error:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: err.message || 'Unknown error',
        });
    });

    // Start server
    app.listen(PORT, () => {
        console.log(`\n🚀 Backend server running on port ${PORT}`);
        console.log(`   Health check: http://localhost:${PORT}/health`);
        console.log(`   API status: http://localhost:${PORT}/api/status`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        await db.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\nShutting down gracefully...');
        await db.close();
        process.exit(0);
    });
}

// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

