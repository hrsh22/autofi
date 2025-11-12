import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Database } from './db/database.js';
import { SynapseService } from './services/synapse.js';
import { createStorageRouter } from './routes/storage.js';

// Load environment variables
dotenv.config();

const START_TIME = Date.now();
console.log(`\n[${new Date().toISOString()}] Starting backend server...`);

// Global error handlers - must be set up before anything else
process.on('uncaughtException', (error: Error) => {
    console.error('\n❌ UNCAUGHT EXCEPTION - Server will crash:');
    console.error(`[${new Date().toISOString()}] Error:`, error);
    console.error('Stack:', error.stack);
    console.error(`Server was running for ${Math.round((Date.now() - START_TIME) / 1000)} seconds`);
    process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('\n❌ UNHANDLED REJECTION - Server will crash:');
    console.error(`[${new Date().toISOString()}] Reason:`, reason);
    if (reason instanceof Error) {
        console.error('Stack:', reason.stack);
    }
    console.error(`Server was running for ${Math.round((Date.now() - START_TIME) / 1000)} seconds`);
    process.exit(1);
});

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

// Store server instance and cleanup function for proper shutdown
let serverInstance: any = null;
let dbInstance: Database | null = null;
let isShuttingDown = false;

async function cleanup() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\nCleaning up resources...');

    try {
        if (serverInstance) {
            await new Promise<void>((resolve) => {
                serverInstance.close(() => {
                    console.log('HTTP server closed');
                    resolve();
                });
            });
        }
    } catch (error) {
        console.error('Error closing server:', error);
    }

    try {
        if (dbInstance) {
            await dbInstance.close();
            console.log('Database connection closed');
        }
    } catch (error) {
        console.error('Error closing database:', error);
    }
}

async function startServer() {
    try {
        const app = express();

        // Middleware
        app.use(cors());
        app.use(express.json());

        // Initialize database
        console.log('Initializing database...');
        const db = new Database(DATABASE_PATH);
        dbInstance = db;
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
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
        }

        // Mount storage routes
        app.use('/api', createStorageRouter(db, synapseService));

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: Date.now() });
        });

        // Error handling middleware - must be last
        app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('Unhandled error in request:', err);
            if (err instanceof Error) {
                console.error('Stack:', err.stack);
            }
            res.status(500).json({
                error: 'Internal server error',
                message: err.message || 'Unknown error',
            });
        });

        // Start server
        serverInstance = app.listen(PORT, () => {
            const uptime = Math.round((Date.now() - START_TIME) / 1000);
            console.log(`\n🚀 Backend server running on port ${PORT}`);
            console.log(`   Started at: ${new Date().toISOString()}`);
            console.log(`   Uptime: ${uptime}s`);
            console.log(`   Health check: http://localhost:${PORT}/health`);
            console.log(`   API status: http://localhost:${PORT}/api/status`);
        }).on('error', (error: Error) => {
            console.error(`\n❌ [${new Date().toISOString()}] Failed to start server:`, error);
            console.error('Stack:', error.stack);
            cleanup().then(() => process.exit(1));
        });

        // Handle server errors
        serverInstance.on('error', (error: Error) => {
            console.error('\n❌ Server error:', error);
            console.error('Stack:', error.stack);
            cleanup().then(() => process.exit(1));
        });

    } catch (error) {
        console.error('\n❌ Failed to initialize server:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }
        await cleanup();
        process.exit(1);
    }
}

// Graceful shutdown handlers - register once at module level
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await cleanup();
    process.exit(0);
});

// Start the server
startServer().catch(async (error) => {
    console.error('\n❌ Failed to start server:', error);
    if (error instanceof Error) {
        console.error('Stack:', error.stack);
    }
    await cleanup();
    process.exit(1);
});

