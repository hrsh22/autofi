import { parseUnits } from 'viem';

/**
 * Default backend API URL
 * Override by passing backendUrl in SynapseStorageConfig
 */
export const DEFAULT_BACKEND_URL = 'http://localhost:3001';

/**
 * Payment per upload in USDFC (18 decimals)
 * 0.1 USDFC per upload - bridged directly from user wallet
 */
export const PAYMENT_PER_UPLOAD_USDFC = parseUnits('0.1', 18);

/**
 * Filecoin chain ID
 */
export const FILECOIN_CHAIN_ID = 314;

