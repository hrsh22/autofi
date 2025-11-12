import dotenv from 'dotenv';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
};

// Usage: tsx list-files.ts <userAddress>
async function main() {
    const userAddressArg = process.argv[2] as `0x${string}` | undefined;
    const userAddress = (userAddressArg || process.env.USER_ADDRESS) as `0x${string}` | undefined;

    if (!userAddress || !userAddress.startsWith('0x') || userAddress.length < 42) {
        console.error('Usage: tsx list-files.ts <userAddress>');
        console.error('Example: tsx list-files.ts 0xabc123...');
        process.exit(1);
    }

    console.log('Listing files for user:', userAddress);
    console.log('Backend:', CONFIG.BACKEND_URL);

    const storage = new SynapseStorageClient({
        backendUrl: CONFIG.BACKEND_URL,
    });

    try {
        const files = await storage.listFiles(userAddress);
        console.log(`Found ${files.length} file(s).\n`);

        files.forEach((file: any, index: number) => {
            console.log(`File #${index + 1}`);
            console.log(`  • ID: ${file.id}`);
            console.log(`  • Name: ${file.fileName}`);
            console.log(`  • Size: ${file.fileSize} bytes`);
            console.log(`  • CommP: ${file.commp || 'pending'}`);
            console.log(`  • Provider: ${file.providerId || 'pending'}`);
            console.log(`  • Payment: ${file.paymentAmount || '0'} wei`);
            console.log(`  • Bridge ID: ${file.bridgeRequestId || 'n/a'}`);
            console.log(`  • Uploaded: ${file.uploadedAt ? new Date(file.uploadedAt).toISOString() : 'pending'}`);
            console.log('');
        });
    } catch (err) {
        console.error('Failed to list files:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});


