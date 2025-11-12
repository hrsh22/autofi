import { createHash } from 'crypto';
import { Database } from '../db/database.js';
import { SynapseService } from './synapse.js';

export interface ProcessUploadParams {
    fileId: string;
    fileBuffer: Buffer;
    userAddress: string;
    fileName: string;
    storageDurationDays: number;
    storageCost: string;
}

export class UploadService {
    constructor(
        private db: Database,
        private synapse: SynapseService
    ) { }

    calculateFileHash(buffer: Buffer): string {
        return createHash('sha256').update(buffer).digest('hex');
    }

    async processUpload(params: ProcessUploadParams): Promise<void> {
        const { fileId, fileBuffer, userAddress, fileName, storageDurationDays, storageCost } = params;

        console.log(`Processing upload for file ${fileId} (${fileName}) from user ${userAddress}`);
        console.log(`Storage: ${storageDurationDays} days, Cost: ${storageCost} USDFC wei`);

        // Upload to Filecoin via Synapse with metadata
        let uploadResult;
        try {
            uploadResult = await this.synapse.uploadFile(fileBuffer, userAddress, fileName);
        } catch (error) {
            console.error('Failed to upload to Synapse:', error);
            throw new Error(`Synapse upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Update user_files with CommP
        await this.db.updateUserFile(fileId, {
            commp: uploadResult.commp,
            provider_id: uploadResult.providerId,
            uploaded_at: Date.now(),
        });

        console.log(`Upload processing complete for file ${fileId}. CommP: ${uploadResult.commp}`);
    }

    async initiateUpload(params: {
        fileBuffer: Buffer;
        fileName: string;
        userAddress: string;
        fileId: string;
        storageDurationDays: number;
        storageCost: string;
    }): Promise<void> {
        const { fileBuffer, fileName, userAddress, fileId, storageDurationDays, storageCost } = params;

        // Calculate file hash
        const fileHash = this.calculateFileHash(fileBuffer);
        const fileSize = fileBuffer.length;

        // Create file record in database
        await this.db.createUserFile({
            id: fileId,
            user_address: userAddress,
            file_name: fileName,
            file_size: fileSize,
            file_hash: fileHash,
            commp: null,
            provider_id: null,
            storage_duration_days: storageDurationDays,
            storage_cost: storageCost,
        });

        // Process upload immediately
        await this.processUpload({
            fileId,
            fileBuffer,
            userAddress,
            fileName,
            storageDurationDays,
            storageCost,
        });
    }
}
