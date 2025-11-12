/**
 * @autofi/synapse - Cross-Chain Filecoin Storage Demo
 * 
 * This script demonstrates the complete flow:
 * 1. Bridge 0.1 USDFC from Base to backend wallet
 * 2. Upload test-upload.json to Filecoin via Synapse
 * 3. List user's files
 * 4. Download the file back from Filecoin
 */

import { readFileSync } from 'node:fs';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';
import { getRouterAddress } from '../sdk/dist/onlyswaps/index.js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONFIGURATION - Edit these values
// ============================================================================

const CONFIG = {
    // Your wallet private key (must have USDT on Base mainnet)
    PRIVATE_KEY: process.env.BASE_MAINNET_PRIVATE_KEY as `0x${string}`,

    // Backend API URL
    BACKEND_URL: 'http://localhost:3001',

    // Backend Filecoin wallet address (where payments go)
    BACKEND_FILECOIN_ADDRESS: '0x6de669c9da78b62c7504d41412de43d3d7c7e9ef',

    // Network settings
    CHAIN: base,                  // Base mainnet
    SOURCE_TOKEN: 'USDT' as const, // Use USDT on mainnet

    // File to upload
    FILE_PATH: './test-upload.json',
};

console.log('CONFIG: ', JSON.stringify(CONFIG, null, 2));

// ============================================================================
// DEMO SCRIPT
// ============================================================================

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  @autofi/synapse - Cross-Chain Filecoin Storage Demo         ║');
    console.log('║  Making Synapse SDK accessible from ANY blockchain           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Validate configuration
    if (!CONFIG.PRIVATE_KEY) {
        console.error('❌ Error: Please configure your PRIVATE_KEY in the script');
        process.exit(1);
    }

    if (!CONFIG.BACKEND_FILECOIN_ADDRESS || CONFIG.BACKEND_FILECOIN_ADDRESS.length < 42) {
        console.error('❌ Error: Please configure your BACKEND_FILECOIN_ADDRESS in the script');
        process.exit(1);
    }

    console.log('📋 Configuration:');
    console.log(`   Network: ${CONFIG.CHAIN.name} (Chain ID: ${CONFIG.CHAIN.id})`);
    console.log(`   Token: ${CONFIG.SOURCE_TOKEN}`);
    console.log(`   Backend: ${CONFIG.BACKEND_URL}`);
    console.log(`   File: ${CONFIG.FILE_PATH}\n`);

    // ========================================================================
    // STEP 1: Setup Wallet and Clients
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 1: Setting Up Wallet and Clients                        │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    const account = privateKeyToAccount(CONFIG.PRIVATE_KEY as `0x${string}`);
    console.log(`✓ Wallet loaded: ${account.address}`);

    const walletClient = createWalletClient({
        account,
        chain: CONFIG.CHAIN,
        transport: http(),
    });
    console.log(`✓ Wallet client created for ${CONFIG.CHAIN.name}`);

    const publicClient = createPublicClient({
        chain: CONFIG.CHAIN,
        transport: http(),
    });
    console.log(`✓ Public client created`);

    const routerAddress = getRouterAddress(CONFIG.CHAIN.id);
    if (!routerAddress) {
        console.error(`❌ Error: OnlySwaps router not found for chain ${CONFIG.CHAIN.id}`);
        process.exit(1);
    }
    console.log(`✓ OnlySwaps router: ${routerAddress}\n`);

    // ========================================================================
    // STEP 2: Initialize Synapse Storage Client
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 2: Initializing Synapse Storage Client                  │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    const storage = new SynapseStorageClient({
        backendUrl: CONFIG.BACKEND_URL,
        backendFilecoinAddress: CONFIG.BACKEND_FILECOIN_ADDRESS as `0x${string}`,
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        routerAddress,
    });
    console.log(`✓ Synapse Storage Client initialized`);
    console.log(`   Backend wallet: ${CONFIG.BACKEND_FILECOIN_ADDRESS}\n`);

    // ========================================================================
    // STEP 3: Check Backend Status
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 3: Checking Backend Status                              │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    try {
        const status = await storage.getBackendStatus();
        console.log(`✓ Backend Status: ${status.status}`);
        if (status.synapse) {
            console.log(`   Backend Synapse Balance: ${status.synapse.balance} wei`);
            console.log(`   Backend Synapse Allowance: ${status.synapse.allowance} wei`);
        }
    } catch (error) {
        console.error('⚠️  Warning: Could not fetch backend status');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log('   Continuing anyway...');
    }
    console.log('');

    // ========================================================================
    // STEP 4: Read Test File
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 4: Reading Test File                                    │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    let fileData: Uint8Array;
    try {
        const fileBuffer = readFileSync(CONFIG.FILE_PATH);
        fileData = new Uint8Array(fileBuffer);
        console.log(`✓ File loaded: ${CONFIG.FILE_PATH}`);
        console.log(`   Size: ${fileData.length} bytes`);
        console.log(`   Content preview: ${new TextDecoder().decode(fileData.slice(0, 100))}...\n`);
    } catch (error) {
        console.error(`❌ Error: Could not read file ${CONFIG.FILE_PATH}`);
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }

    // ========================================================================
    // STEP 5: Upload File to Filecoin (with auto-bridge)
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 5: Uploading File to Filecoin                           │');
    console.log('│ (This will automatically bridge 0.1 USDFC from your wallet)  │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    console.log('⏳ Starting upload process...');
    console.log(`   User: ${account.address}`);
    console.log(`   File: ${CONFIG.FILE_PATH}`);
    console.log(`   Payment: 0.1 USDFC (bridged from ${CONFIG.SOURCE_TOKEN})\n`);

    const startTime = Date.now();

    let uploadResult;
    try {
        uploadResult = await storage.uploadFile({
            file: fileData,
            fileName: 'test-upload.json',
            userAddress: account.address,
            sourceChainId: CONFIG.CHAIN.id,
            sourceTokenSymbol: CONFIG.SOURCE_TOKEN,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n✅ Upload Successful!');
        console.log(`   Duration: ${duration}s`);
        console.log(`   File ID: ${uploadResult.fileId}`);
        console.log(`   Status: ${uploadResult.status}`);
        console.log(`   Message: ${uploadResult.message}\n`);
    } catch (error) {
        console.error('\n❌ Upload Failed!');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }

    // ========================================================================
    // STEP 6: List User Files
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 6: Listing User Files                                   │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    try {
        const files = await storage.listFiles(account.address);

        console.log(`✓ Found ${files.length} file(s) for user ${account.address}\n`);

        files.forEach((file: any, index: number) => {
            console.log(`   File #${index + 1}:`);
            console.log(`   ├─ Name: ${file.fileName}`);
            console.log(`   ├─ Size: ${file.fileSize} bytes`);
            console.log(`   ├─ CommP: ${file.commp || 'pending'}`);
            console.log(`   ├─ Provider: ${file.providerId || 'pending'}`);
            console.log(`   ├─ Payment: ${file.paymentAmount} wei`);
            console.log(`   ├─ Bridge ID: ${file.bridgeRequestId}`);
            console.log(`   └─ Uploaded: ${file.uploadedAt ? new Date(file.uploadedAt).toISOString() : 'pending'}`);
            console.log('');
        });

        // Find our uploaded file
        const uploadedFile = files.find((f: any) => f.id === uploadResult.fileId);
        if (!uploadedFile || !uploadedFile.commp) {
            console.error('⚠️  Warning: File uploaded but CommP not found yet');
            console.log('   File may still be processing on Filecoin\n');
            return;
        }

        // ====================================================================
        // STEP 7: Download File from Filecoin
        // ====================================================================

        console.log('┌──────────────────────────────────────────────────────────────┐');
        console.log('│ STEP 7: Downloading File from Filecoin                       │');
        console.log('└──────────────────────────────────────────────────────────────┘\n');

        console.log(`⏳ Downloading file with CommP: ${uploadedFile.commp}\n`);

        const downloadedData = await storage.downloadFile(uploadedFile.commp);

        console.log('✅ Download Successful!');
        console.log(`   Size: ${downloadedData.length} bytes`);

        // Verify content matches
        const downloadedContent = new TextDecoder().decode(downloadedData);
        const originalContent = new TextDecoder().decode(fileData);

        if (downloadedContent === originalContent) {
            console.log(`   ✓ Content verification: PASSED`);
        } else {
            console.log(`   ⚠️  Content verification: FAILED`);
            console.log(`   Original: ${originalContent.slice(0, 50)}...`);
            console.log(`   Downloaded: ${downloadedContent.slice(0, 50)}...`);
        }

        console.log(`\n   Content:\n${downloadedContent}\n`);

    } catch (error) {
        console.error('❌ Error listing/downloading files:');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // ========================================================================
    // DEMO COMPLETE
    // ========================================================================

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEMO COMPLETE!                                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('🎉 Success! You just uploaded a file to Filecoin from Base mainnet');
    console.log('   without ever switching networks or needing a Filecoin wallet!\n');

    console.log('📊 Summary:');
    console.log(`   • User stayed on: ${CONFIG.CHAIN.name}`);
    console.log(`   • Paid with: ${CONFIG.SOURCE_TOKEN}`);
    console.log(`   • Payment amount: 0.1 USDFC (+ OnlySwaps fees)`);
    console.log(`   • File stored on: Filecoin (via Synapse SDK)`);
    console.log(`   • Ownership metadata: Recorded on-chain in Filecoin\n`);

    console.log('🔑 Key Innovation:');
    console.log('   This is the FIRST cross-chain Synapse SDK solution!');
    console.log('   Users can access Filecoin storage from ANY blockchain.');
}

// Run the demo
main().catch((error) => {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ DEMO FAILED                                               ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');
    console.error('Error:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure backend is running: cd backend && npm run dev');
    console.error('2. Check your PRIVATE_KEY is correct and has USDT on Base');
    console.error('3. Verify BACKEND_FILECOIN_ADDRESS is set correctly');
    console.error('4. Make sure backend has USDFC and FIL for gas\n');
    process.exit(1);
});
