import type { PublicClient } from 'viem';
import { OnlySwapsService } from '../onlyswaps/service.js';
import {
    type SynapseStorageConfig,
    type UploadFileParams,
    type UploadResult,
    type UserFile,
    type BackendStatus,
    type BridgeDepositResult,
    type FundCreditsParams,
    type FundCreditsResult,
    type CreditBalance,
    type CreditTransaction,
} from './types.js';
import {
    DEFAULT_BACKEND_URL,
    FILECOIN_CHAIN_ID,
    DEFAULT_BACKEND_FILECOIN_ADDRESS,
    calculateStorageCost,
} from './constants.js';

export class SynapseStorageClient {
    private backendUrl: string;
    private onlySwaps?: OnlySwapsService;
    private backendAddress?: `0x${string}`;

    constructor(config: SynapseStorageConfig) {
        this.backendUrl = DEFAULT_BACKEND_URL;
        this.backendAddress = DEFAULT_BACKEND_FILECOIN_ADDRESS;

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
     * Bridge USDFC to backend wallet (internal method)
     * Used by fundCredits to transfer tokens
     */
    // @ts-ignore
    private async bridgePayment(params: {
        userAddress: `0x${string}`;
        sourceChainId: number;
        sourceTokenSymbol: 'USDT' | 'RUSD';
        amount: bigint;
        destPublicClient?: PublicClient;
    }): Promise<BridgeDepositResult> {
        if (!this.onlySwaps) {
            throw new Error('OnlySwaps not initialized. Please provide walletClient, publicClient, and routerAddress in config.');
        }

        console.log(`Bridging ${params.amount} USDFC wei to backend...`);

        // Get backend wallet address from config or environment
        const backendAddress = this.backendAddress as `0x${string}`;
        if (!backendAddress) {
            throw new Error('Backend Filecoin address not configured. Pass backendFilecoinAddress in config or set BACKEND_FILECOIN_ADDRESS env var.');
        }

        // Determine environment based on source chain
        // Mainnet chains: Base (8453), Ethereum (1), Arbitrum (42161), etc.
        // Testnet chains: Base Sepolia (84532), etc.
        const isMainnet = params.sourceChainId === 8453 || params.sourceChainId === 1 || params.sourceChainId === 42161;
        const env = isMainnet ? 'mainnet' : 'testnet';

        // Get recommended fees for the specified amount
        const fees = await this.onlySwaps.fetchRecommendedFeesBySymbol({
            env: env as 'mainnet' | 'testnet',
            srcChainId: params.sourceChainId,
            dstChainId: FILECOIN_CHAIN_ID,
            tokenSymbol: params.sourceTokenSymbol,
            amount: params.amount,
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
     * Fund user's credit account by bridging USDFC
     */
    async fundCredits(params: FundCreditsParams): Promise<FundCreditsResult> {
        if (!this.onlySwaps) {
            throw new Error('OnlySwaps not initialized. Please provide walletClient, publicClient, and routerAddress in config.');
        }

        console.log(`Funding credits: ${params.amount} wei for ${params.userAddress}`);

        // Bridge USDFC to backend
        console.log('SKIPPING BRIDGING FOR NOW!!!! ENABLE LATER!!!!')
        const bridgeResult = {
            bridgeRequestId: '0x1234567890' as `0x${string}`,
        }
        // const bridgeResult = await this.bridgePayment({
        //     userAddress: params.userAddress,
        //     sourceChainId: params.sourceChainId,
        //     sourceTokenSymbol: params.sourceTokenSymbol,
        //     amount: params.amount,
        // });

        // Notify backend to credit user account
        const response = await fetch(`${this.backendUrl}/api/fund-credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAddress: params.userAddress,
                amount: params.amount.toString(),
                bridgeRequestId: bridgeResult.bridgeRequestId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as { message?: string };
            throw new Error(`Failed to fund credits: ${errorData.message || response.statusText}`);
        }

        const result = await response.json() as { success: boolean; newBalance: string; amountAdded: string };

        return {
            bridgeRequestId: bridgeResult.bridgeRequestId,
            amountFunded: params.amount.toString(),
            newBalance: result.newBalance,
        };
    }

    /**
     * Get user's credit balance
     */
    async getCreditBalance(userAddress: `0x${string}`): Promise<CreditBalance> {
        const response = await fetch(`${this.backendUrl}/api/credits/${userAddress}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch credit balance: ${response.statusText}`);
        }

        return await response.json() as CreditBalance;
    }

    /**
     * Get user's credit transaction history
     */
    async getCreditHistory(userAddress: `0x${string}`, limit?: number): Promise<CreditTransaction[]> {
        const url = limit
            ? `${this.backendUrl}/api/credits/history/${userAddress}?limit=${limit}`
            : `${this.backendUrl}/api/credits/history/${userAddress}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch credit history: ${response.statusText}`);
        }

        const data = await response.json() as { transactions: CreditTransaction[] };
        return data.transactions;
    }

    /**
     * Calculate storage cost for a file
     */
    calculateStorageCost(fileSizeBytes: number, durationDays: number): bigint {
        return calculateStorageCost(fileSizeBytes, durationDays);
    }

    /**
     * Upload a file to Filecoin storage
     * Uses credits from user's account (fund credits first using fundCredits)
     */
    async uploadFile(params: UploadFileParams): Promise<UploadResult> {
        const { file, fileName, userAddress, storageDurationDays } = params;

        console.log(`Uploading ${fileName} for ${storageDurationDays} days`);

        // Convert file to blob for upload
        let fileData: Blob;
        if (file instanceof Uint8Array || Buffer.isBuffer(file)) {
            fileData = new Blob([file]);
        } else if (file instanceof File) {
            fileData = file;
        } else {
            throw new Error('Invalid file type. Expected File, Uint8Array, or Buffer.');
        }

        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append('file', fileData, fileName);
        formData.append('userAddress', userAddress);
        formData.append('storageDurationDays', storageDurationDays.toString());

        // Upload to backend
        const uploadResponse = await fetch(`${this.backendUrl}/api/initiate-storage`, {
            method: 'POST',
            body: formData,
        });

        if (uploadResponse.status === 402) {
            // Insufficient credits
            const errorData = await uploadResponse.json() as {
                error: string;
                currentBalance: string;
                requiredAmount: string;
                message: string;
            };
            throw new Error(
                `Insufficient credits. Balance: ${errorData.currentBalance} wei, Required: ${errorData.requiredAmount} wei. Please fund your account using fundCredits().`
            );
        }

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({})) as { message?: string };
            throw new Error(`Upload failed: ${errorData.message || uploadResponse.statusText}`);
        }

        const result = await uploadResponse.json() as UploadResult;
        console.log('Upload complete:', result);

        return result;
    }
}
