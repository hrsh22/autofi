import dotenv from 'dotenv';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
};

// Usage: tsx status.ts
async function main() {
  console.log('Checking backend status at', CONFIG.BACKEND_URL);

  const storage = new SynapseStorageClient({
    backendUrl: CONFIG.BACKEND_URL,
  });

  try {
    const status = await storage.getBackendStatus();
    console.log('Status:', status.status);
    if (status.synapse) {
      console.log('Synapse:');
      console.log('  • Balance:', status.synapse.balance);
      console.log('  • Allowance:', status.synapse.allowance);
    }
    if (status.error) {
      console.log('Error:', status.error);
    }
  } catch (err) {
    console.error('Failed to fetch backend status:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});


