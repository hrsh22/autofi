import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  PRIVATE_KEY: process.env.BASE_MAINNET_PRIVATE_KEY as `0x${string}` | undefined,
  SOURCE_CHAIN: base,
  SOURCE_TOKEN: 'USDT' as const,
};

// Usage: tsx upload-file.ts <filePath>
async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: tsx upload-file.ts <filePath>');
    console.error('Example: tsx upload-file.ts ./test-upload.json');
    process.exit(1);
  }
  if (!CONFIG.PRIVATE_KEY) {
    console.error('Please set BASE_MAINNET_PRIVATE_KEY in your environment.');
    process.exit(1);
  }

  const account = privateKeyToAccount(CONFIG.PRIVATE_KEY);
  console.log('User:', account.address);
  console.log('Backend:', CONFIG.BACKEND_URL);
  console.log('Chain:', CONFIG.SOURCE_CHAIN.name);
  console.log('Token:', CONFIG.SOURCE_TOKEN);
  console.log('File:', filePath);

  const storage = new SynapseStorageClient({
    backendUrl: CONFIG.BACKEND_URL,
  });

  const fileBuffer = readFileSync(filePath);
  const fileData = new Uint8Array(fileBuffer);
  const fileName = path.basename(filePath);

  try {
    const result = await storage.uploadFile({
      file: fileData,
      fileName,
      userAddress: account.address,
      sourceChainId: CONFIG.SOURCE_CHAIN.id,
      sourceTokenSymbol: CONFIG.SOURCE_TOKEN,
    });
    console.log('Upload complete:', result);
  } catch (err) {
    console.error('Upload failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});


