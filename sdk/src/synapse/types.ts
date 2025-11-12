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
    storageDurationDays: number;  // Storage duration in days
}

export interface UploadResult {
    fileId: string;
    status: 'completed';
    message: string;
    storageCost: string;  // Cost in USDFC wei
}

export interface UserFile {
    id: string;
    fileName: string;
    fileSize: number;
    fileHash: string;
    commp: string | null;
    providerId: string | null;
    storageDurationDays: number;
    storageCost: string;
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

// Credit-related types
export interface CreditBalance {
    address: string;
    balance: string;  // USDFC wei as string
}

export interface CreditTransaction {
    id: string;
    type: 'deposit' | 'deduct';
    amount: string;
    fileId: string | null;
    bridgeRequestId: string | null;
    description: string;
    createdAt: number;
}

export interface FundCreditsParams {
    amount: bigint;  // USDFC wei to deposit
    userAddress: `0x${string}`;
    sourceChainId: number;
    sourceTokenSymbol: 'USDT' | 'RUSD';
}

export interface FundCreditsResult {
    bridgeRequestId: `0x${string}`;
    amountFunded: string;
    newBalance: string;
}

