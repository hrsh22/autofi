import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../db/database.js';
import { SynapseService } from '../services/synapse.js';
import { UploadService } from '../services/upload.js';

// Use memory storage (no disk writes)
const upload = multer({ storage: multer.memoryStorage() });

export function createStorageRouter(
    db: Database, 
    synapseService: SynapseService
): Router {
    const router = Router();
    const uploadService = new UploadService(db, synapseService);

    // POST /api/initiate-storage - Initiate file upload
    // Expects: file, userAddress, bridgeRequestId, paymentAmount
    router.post('/initiate-storage', upload.single('file'), async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' });
            }

            const { userAddress, bridgeRequestId, paymentAmount } = req.body;

            if (!userAddress) {
                return res.status(400).json({ error: 'userAddress is required' });
            }

            if (!bridgeRequestId) {
                return res.status(400).json({ error: 'bridgeRequestId is required - payment must be made before upload' });
            }

            if (!paymentAmount) {
                return res.status(400).json({ error: 'paymentAmount is required' });
            }

            // Normalize address
            const normalizedAddress = userAddress.toLowerCase();

            // Generate unique file ID
            const fileId = uuidv4();
            const fileName = req.file.originalname || 'unnamed';

            console.log(`Received upload request: fileId=${fileId}, user=${normalizedAddress}, fileName=${fileName}`);
            console.log(`Payment: ${paymentAmount} (bridge: ${bridgeRequestId})`);

            // Process upload immediately
            await uploadService.initiateUpload({
                fileBuffer: req.file.buffer,
                fileName,
                userAddress: normalizedAddress,
                fileId,
                bridgeRequestId,
                paymentAmount,
            });

            res.json({
                fileId,
                status: 'completed',
                message: 'File uploaded successfully',
            });
        } catch (error) {
            console.error('Error initiating storage:', error);
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
                    paymentAmount: f.payment_amount,
                    bridgeRequestId: f.bridge_request_id,
                    uploadedAt: f.uploaded_at,
                })),
            });
        } catch (error) {
            console.error('Error fetching user files:', error);
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
            res.status(500).json({ 
                error: 'Failed to download file',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // GET /api/status - Backend status and health check
    router.get('/status', async (req: Request, res: Response) => {
        try {
            const balance = await synapseService.getBalance();
            const allowance = await synapseService.getAllowance();

            res.json({
                status: 'healthy',
                synapse: {
                    balance: balance.toString(),
                    allowance: allowance.toString(),
                },
            });
        } catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    return router;
}
