export type Environment = 'testnet' | 'mainnet';

export interface ChainIds {
  base?: number;
  baseSepolia?: number;
  filecoin?: number;
  filecoinCalibration?: number;
  [key: string]: number | undefined;
}

export interface TokenDescriptor {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  chainId: number;
}

export interface Route {
  srcChainId: number;
  dstChainId: number;
  tokenSymbol: string;
  srcTokenAddress: `0x${string}`;
  dstTokenAddress: `0x${string}`;
}

export interface SwapIntent {
  srcChainId: number;
  dstChainId: number;
  tokenSymbol: string;
  srcTokenAddress: `0x${string}`;
  dstTokenAddress: `0x${string}`;
  amount: bigint;
  feeBps?: number;
}

export interface SwapResult {
  intentId: string;
  txHash?: `0x${string}`;
  fulfilled?: boolean;
  fulfillTxHash?: `0x${string}`;
  srcChainId: number;
  dstChainId: number;
  tokenSymbol: string;
  amount: bigint;
}

export interface StorageUsage {
  usedGb: number;
  capacityGb: number;
}

export interface PurchaseRequest {
  gb: number;
}

export interface PurchaseResult {
  txHash: `0x${string}`;
  gbPurchased: number;
}

export interface Proof {
  schemaVersion: string;
  timestamp: string;
  env: Environment;
  reason: string;
  swap?: SwapResult;
  purchase?: PurchaseResult;
  agentId?: string;
  srcChainId?: number;
  dstChainId?: number;
  tokenAddresses?: { src?: `0x${string}`; dst?: `0x${string}` };
  signature?: `0x${string}`;
}

export type OrchestratorMode = 'full' | 'purchase-only' | 'swap-only';

export interface PolicyConfig {
  storageThreshold: number;
  purchaseAmount: number;
  intervalSeconds?: number;
  jitterPct?: number;
  maxSpendPerTx?: bigint;
  monthlyCap?: bigint;
  cooldownSeconds?: number;
}

export interface AutoFiConfig {
  env: Environment;
  pin?: {
    endpoint: string;
    token: string;
  };
}


