import type { PublicClient, WalletClient } from 'viem';

export interface SynapseStorageConfig {
    backendUrl: string;
    backendFilecoinAddress?: `0x${string}`;  // Backend wallet address for bridge payments
    walletClient?: WalletClient;
    publicClient?: PublicClient;
    routerAddress?: `0x${string}`;
}

export interface UploadFileParams {
    file: File | Uint8Array | Buffer;
    fileName: string;
    userAddress: `0x${string}`;
    sourceChainId: number;
    sourceTokenSymbol: 'USDT' | 'RUSD';  // Only bridgeable tokens
}

export interface UploadResult {
    fileId: string;
    status: 'completed';
    message: string;
}

export interface UserFile {
    id: string;
    fileName: string;
    fileSize: number;
    fileHash: string;
    commp: string | null;
    providerId: string | null;
    paymentAmount: string | null;
    bridgeRequestId: string | null;
    uploadedAt: number | null;
}

export interface BackendStatus {
    status: 'healthy' | 'unhealthy';
    synapse?: {
        balance: string;
        allowance: string;
    };
    error?: string;
}

export interface BridgeDepositResult {
    bridgeRequestId: `0x${string}`;
}

