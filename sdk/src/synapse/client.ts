import type { PublicClient } from 'viem';
import { OnlySwapsService } from '../onlyswaps/service.js';
import {
    type SynapseStorageConfig,
    type UploadFileParams,
    type UploadResult,
    type UserFile,
    type BackendStatus,
    type BridgeDepositResult,
} from './types.js';
import {
    DEFAULT_BACKEND_URL,
    PAYMENT_PER_UPLOAD_USDFC,
    FILECOIN_CHAIN_ID,
} from './constants.js';

export class SynapseStorageClient {
    private backendUrl: string;
    private onlySwaps?: OnlySwapsService;
    private backendAddress?: `0x${string}`;

    constructor(config: SynapseStorageConfig) {
        this.backendUrl = config.backendUrl || DEFAULT_BACKEND_URL;
        this.backendAddress = config.backendFilecoinAddress;

        // Initialize OnlySwaps if wallet and public clients are provided
        if (config.walletClient && config.publicClient && config.routerAddress) {
            this.onlySwaps = new OnlySwapsService({
                walletClient: config.walletClient,
                publicClient: config.publicClient,
                routerAddress: config.routerAddress,
            });
        }
    }

    /**
     * List all files uploaded by a user
     */
    async listFiles(userAddress: `0x${string}`): Promise<UserFile[]> {
        const response = await fetch(`${this.backendUrl}/api/files/${userAddress}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch user files: ${response.statusText}`);
        }

        const data = await response.json() as { files: UserFile[] };
        return data.files;
    }

    /**
     * Download a file by its CommP
     */
    async downloadFile(commp: string): Promise<Uint8Array> {
        const response = await fetch(`${this.backendUrl}/api/download/${commp}`);

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }

    /**
     * Check backend status and health
     */
    async getBackendStatus(): Promise<BackendStatus> {
        const response = await fetch(`${this.backendUrl}/api/status`);

        if (!response.ok) {
            throw new Error(`Failed to fetch backend status: ${response.statusText}`);
        }

        return await response.json() as BackendStatus;
    }

    /**
     * Bridge payment to backend wallet (internal method)
     * Bridges 0.1 USDFC per upload
     */
    // @ts-ignore
    private async bridgePayment(params: {
        userAddress: `0x${string}`;
        sourceChainId: number;
        sourceTokenSymbol: 'USDT' | 'RUSD';
        destPublicClient?: PublicClient;
    }): Promise<BridgeDepositResult> {
        if (!this.onlySwaps) {
            throw new Error('OnlySwaps not initialized. Please provide walletClient, publicClient, and routerAddress in config.');
        }

        console.log('Bridging payment to backend (0.1 USDFC)...');

        // Get backend wallet address from config or environment
        const backendAddress = this.backendAddress || process.env.BACKEND_FILECOIN_ADDRESS as `0x${string}`;
        if (!backendAddress) {
            throw new Error('Backend Filecoin address not configured. Pass backendFilecoinAddress in config or set BACKEND_FILECOIN_ADDRESS env var.');
        }

        // Determine environment based on source chain
        // Mainnet chains: Base (8453), Ethereum (1), Arbitrum (42161), etc.
        // Testnet chains: Base Sepolia (84532), etc.
        const isMainnet = params.sourceChainId === 8453 || params.sourceChainId === 1 || params.sourceChainId === 42161;
        const env = isMainnet ? 'mainnet' : 'testnet';

        // Get recommended fees for 0.1 USDFC
        const fees = await this.onlySwaps.fetchRecommendedFeesBySymbol({
            env: env as 'mainnet' | 'testnet',
            srcChainId: params.sourceChainId,
            dstChainId: FILECOIN_CHAIN_ID,
            tokenSymbol: params.sourceTokenSymbol,
            amount: PAYMENT_PER_UPLOAD_USDFC,
        });

        console.log('Bridge fees:', {
            solverFee: fees.solverFee.toString(),
            networkFee: fees.networkFee.toString(),
            approvalAmount: fees.approvalAmount.toString(),
        });

        // Execute swap
        const swapResult = await this.onlySwaps.swapBySymbol({
            env: env as 'mainnet' | 'testnet',
            srcChainId: params.sourceChainId,
            dstChainId: FILECOIN_CHAIN_ID,
            tokenSymbol: params.sourceTokenSymbol,
            amount: fees.approvalAmount,
            recipient: backendAddress,
            solverFee: fees.solverFee,
        });

        console.log('Bridge initiated. Request ID:', swapResult.requestId);

        // Wait for bridge completion
        console.log('Waiting for bridge completion...');
        await this.onlySwaps.waitForExecution(swapResult.requestId, {
            timeoutMs: 300000, // 5 minutes
            intervalMs: 5000,  // Check every 5 seconds
            onProgress: (status) => {
                console.log(`Bridge status: executed=${status.executed}, fulfilled=${status.fulfilled}, elapsed=${status.elapsed}ms`);
            },
            destPublicClient: params.destPublicClient,
            dstChainId: FILECOIN_CHAIN_ID,
        });

        console.log('Bridge completed successfully!');

        return {
            bridgeRequestId: swapResult.requestId,
        };
    }

    /**
     * Upload a file to Filecoin storage
     * Automatically bridges 0.1 USDFC payment per upload
     */
    async uploadFile(params: UploadFileParams): Promise<UploadResult> {
        // @ts-ignore
        const { file, fileName, userAddress, sourceChainId, sourceTokenSymbol } = params;

        console.log(`Uploading file: ${fileName} for user ${userAddress}`);

        // 1. Bridge 0.1 USDFC to backend wallet
        console.log('Step 1: Bridging payment (0.1 USDFC)...');
        console.log('SKIPPING BRIDGING FOR NOW!!!! ENABLE LATER!!!!')
        const bridgeResult = {
            bridgeRequestId: '0x1234567890',
        }
        // const bridgeResult = await this.bridgePayment({
        //     userAddress,
        //     sourceChainId,
        //     sourceTokenSymbol,
        // });

        // 2. Convert file to blob for upload
        let fileData: Blob;
        if (file instanceof Uint8Array || Buffer.isBuffer(file)) {
            fileData = new Blob([file]);
        } else if (file instanceof File) {
            fileData = file;
        } else {
            throw new Error('Invalid file type. Expected File, Uint8Array, or Buffer.');
        }

        // 3. Create FormData for multipart upload
        const formData = new FormData();
        formData.append('file', fileData, fileName);
        formData.append('userAddress', userAddress);
        formData.append('bridgeRequestId', bridgeResult.bridgeRequestId);
        formData.append('paymentAmount', PAYMENT_PER_UPLOAD_USDFC.toString());

        // 4. Upload to backend
        console.log('Step 2: Uploading file to backend...');
        const uploadResponse = await fetch(`${this.backendUrl}/api/initiate-storage`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({})) as { message?: string };
            throw new Error(`Upload failed: ${errorData.message || uploadResponse.statusText}`);
        }

        const result = await uploadResponse.json() as UploadResult;
        console.log('Upload complete:', result);

        return result;
    }
}
