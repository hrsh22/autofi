import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../db/database.js';
import { SynapseService } from '../services/synapse.js';
import { UploadService } from '../services/upload.js';
import { CreditService } from '../services/credits.js';

// Use memory storage (no disk writes)
const upload = multer({ storage: multer.memoryStorage() });

export function createStorageRouter(
    db: Database,
    synapseService: SynapseService
): Router {
    const router = Router();
    const uploadService = new UploadService(db, synapseService);
    const creditService = new CreditService(db);

    // POST /api/initiate-storage - Initiate file upload
    // Expects: file, userAddress, storageDurationDays
    router.post('/initiate-storage', upload.single('file'), async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' });
            }

            const { userAddress, storageDurationDays } = req.body;

            if (!userAddress) {
                return res.status(400).json({ error: 'userAddress is required' });
            }

            if (!storageDurationDays) {
                return res.status(400).json({ error: 'storageDurationDays is required' });
            }

            // Normalize address
            const normalizedAddress = userAddress.toLowerCase();

            // Generate unique file ID
            const fileId = uuidv4();
            const fileName = req.file.originalname || 'unnamed';

            console.log(`Received upload request: fileId=${fileId}, user=${normalizedAddress}, fileName=${fileName}`);
            console.log(`Storage duration: ${storageDurationDays} days`);

            // Calculate storage cost
            const fileSize = req.file.buffer.length;
            const durationDays = parseInt(storageDurationDays);
            const cost = creditService.calculateCost(fileSize, durationDays);

            console.log(`Calculated storage cost: ${cost} USDFC wei for ${fileSize} bytes over ${durationDays} days`);

            // Check and deduct credits
            const deduction = await creditService.deductCredits(
                normalizedAddress,
                cost,
                fileId,
                fileName,
                durationDays
            );

            if (!deduction.success) {
                return res.status(402).json({
                    error: 'Insufficient credits',
                    currentBalance: deduction.currentBalance?.toString(),
                    requiredAmount: deduction.requiredAmount?.toString(),
                    message: `Need ${deduction.requiredAmount} wei, but only have ${deduction.currentBalance} wei`,
                });
            }

            // Process upload
            await uploadService.initiateUpload({
                fileBuffer: req.file.buffer,
                fileName,
                userAddress: normalizedAddress,
                fileId,
                storageDurationDays: durationDays,
                storageCost: cost.toString(),
            });

            res.json({
                fileId,
                status: 'completed',
                message: 'File uploaded successfully',
                storageCost: cost.toString(),
            });
        } catch (error) {
            console.error('Error initiating storage:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            res.status(500).json({
                error: 'Failed to initiate storage',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // GET /api/files/:userAddress - List user files
    router.get('/files/:userAddress', async (req: Request, res: Response) => {
        try {
            const { userAddress } = req.params;
            const normalizedAddress = userAddress.toLowerCase();

            const files = await db.getUserFiles(normalizedAddress);

            res.json({
                files: files.map(f => ({
                    id: f.id,
                    fileName: f.file_name,
                    fileSize: f.file_size,
                    fileHash: f.file_hash,
                    commp: f.commp,
                    providerId: f.provider_id,
                    storageDurationDays: f.storage_duration_days,
                    storageCost: f.storage_cost,
                    uploadedAt: f.uploaded_at,
                })),
            });
        } catch (error) {
            console.error('Error fetching user files:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            res.status(500).json({
                error: 'Failed to fetch user files',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // GET /api/download/:commp - Download file by CommP
    router.get('/download/:commp', async (req: Request, res: Response) => {
        try {
            const { commp } = req.params;

            console.log(`Download requested for CommP: ${commp}`);

            // Get file metadata
            const file = await db.getFileByCommp(commp);
            if (!file) {
                return res.status(404).json({ error: 'File not found' });
            }

            // Download from Filecoin
            const fileBuffer = await synapseService.downloadFile(commp);

            // Set appropriate headers
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
            res.setHeader('Content-Length', fileBuffer.length);

            res.send(fileBuffer);
        } catch (error) {
            console.error('Error downloading file:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            res.status(500).json({
                error: 'Failed to download file',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // GET /api/status - Backend status and health check
    router.get('/status', async (req: Request, res: Response) => {
        const diagnosticsBefore = synapseService.getDiagnostics();

        try {
            const [balance, allowance] = await Promise.all([
                synapseService.getBalance(),
                synapseService.getAllowance(),
            ]);

            res.json({
                status: 'healthy',
                synapse: {
                    balance: balance.toString(),
                    allowance: allowance.toString(),
                    diagnostics: synapseService.getDiagnostics(),
                },
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching status:`, error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }

            res.status(500).json({
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                diagnostics: {
                    before: diagnosticsBefore,
                    after: synapseService.getDiagnostics(),
                },
            });
        }
    });

    // POST /api/fund-credits - Fund user's credit account
    router.post('/fund-credits', async (req: Request, res: Response) => {
        try {
            const { userAddress, amount, bridgeRequestId } = req.body;

            // Validate inputs
            if (!userAddress || !amount || !bridgeRequestId) {
                return res.status(400).json({ error: 'Missing required fields: userAddress, amount, bridgeRequestId' });
            }

            const normalizedAddress = userAddress.toLowerCase();

            console.log(`Funding credits for ${normalizedAddress}: ${amount} USDFC wei via bridge ${bridgeRequestId}`);

            await creditService.addCredits(
                normalizedAddress,
                BigInt(amount),
                bridgeRequestId
            );

            const newBalance = await creditService.getBalance(normalizedAddress);

            res.json({
                success: true,
                newBalance: newBalance.toString(),
                amountAdded: amount,
            });
        } catch (error) {
            console.error('Error funding credits:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            res.status(500).json({
                error: 'Failed to fund credits',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // GET /api/credits/:userAddress - Get user's credit balance
    router.get('/credits/:userAddress', async (req: Request, res: Response) => {
        try {
            const normalizedAddress = req.params.userAddress.toLowerCase();
            const balance = await creditService.getBalance(normalizedAddress);

            res.json({
                address: normalizedAddress,
                balance: balance.toString(),
            });
        } catch (error) {
            console.error('Error fetching credit balance:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            res.status(500).json({
                error: 'Failed to fetch credit balance',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // GET /api/credits/history/:userAddress - Get user's credit transaction history
    router.get('/credits/history/:userAddress', async (req: Request, res: Response) => {
        try {
            const normalizedAddress = req.params.userAddress.toLowerCase();
            const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

            const transactions = await db.getCreditTransactions(normalizedAddress, limit);

            // Transform database rows (snake_case) to API format (camelCase)
            const transformedTransactions = transactions.map((tx) => ({
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                fileId: tx.file_id,
                bridgeRequestId: tx.bridge_request_id,
                description: tx.description,
                createdAt: tx.created_at, // Map created_at to createdAt
            }));

            res.json({ transactions: transformedTransactions });
        } catch (error) {
            console.error('Error fetching credit history:', error);
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
            }
            res.status(500).json({
                error: 'Failed to fetch credit history',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    return router;
}
