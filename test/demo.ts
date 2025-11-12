/**
 * @autofi/synapse - Cross-Chain Filecoin Storage Demo (TESTNET)
 * 
 * This script demonstrates the complete credit-based flow:
 * 1. Check current credit balance
 * 2. Fund credits (bridge 1.0 USDFC from Base Sepolia to backend wallet)
 * 3. Upload test-upload.json to Filecoin Calibration testnet using credits (30 days)
 * 4. List user's files
 * 5. Download the file back from Filecoin
 * 6. Show remaining credits and transaction history
 * 
 * Requirements:
 * - BASE_SEPOLIA_PRIVATE_KEY environment variable
 * - RUSD tokens on Base Sepolia (get from faucet)
 * - BACKEND_FILECOIN_ADDRESS environment variable (testnet address)
 */

import { readFileSync } from 'node:fs';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';
import { getRouterAddress } from '../sdk/dist/onlyswaps/index.js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONFIGURATION - Edit these values
// ============================================================================

const CONFIG = {
    // Your wallet private key (must have RUSD on Base Sepolia testnet)
    PRIVATE_KEY: process.env.BASE_SEPOLIA_PRIVATE_KEY as `0x${string}`,

    // Backend API URL
    BACKEND_URL: 'http://localhost:3001',

    // Backend Filecoin wallet address (where payments go)
    // This should be your testnet Filecoin wallet address
    BACKEND_FILECOIN_ADDRESS: process.env.BACKEND_FILECOIN_ADDRESS as `0x${string}` || '0xd490fb9eee2578444cfa56d74b4afaf215efc269',

    // Network settings
    CHAIN: baseSepolia,           // Base Sepolia testnet
    SOURCE_TOKEN: 'RUSD' as const, // Use RUSD on testnet

    // File to upload
    FILE_PATH: './test-upload.json',

    // Credit funding amount (in USDFC)
    FUND_AMOUNT: 1.0,

    // Storage duration (in days)
    STORAGE_DURATION: 30,
};

console.log('CONFIG: ', JSON.stringify(CONFIG, null, 2));

// ============================================================================
// DEMO SCRIPT
// ============================================================================

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  @autofi/synapse - Cross-Chain Filecoin Storage Demo         ║');
    console.log('║  TESTNET MODE: Base Sepolia → Filecoin Calibration           ║');
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
    console.log(`   File: ${CONFIG.FILE_PATH}`);
    console.log(`   Fund Amount: ${CONFIG.FUND_AMOUNT} USDFC`);
    console.log(`   Storage Duration: ${CONFIG.STORAGE_DURATION} days\n`);

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
    // STEP 4: Check Current Credit Balance
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 4: Checking Current Credit Balance                      │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    let initialBalance = 0n;
    try {
        const balance = await storage.getCreditBalance(account.address);
        initialBalance = BigInt(balance.balance);
        const balanceUSDFC = Number(initialBalance / BigInt(10 ** 16)) / 100;
        console.log(`✓ Current balance: ${balance.balance} wei (${balanceUSDFC.toFixed(4)} USDFC)\n`);
    } catch (error) {
        console.log('⚠️  No existing balance found (new user)\n');
    }

    // ========================================================================
    // STEP 5: Fund Credits
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 5: Funding Credits                                      │');
    console.log('│ (This will bridge USDFC from your wallet)                    │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    console.log(`⏳ Funding ${CONFIG.FUND_AMOUNT} USDFC...`);
    console.log(`   This will take ~30-60 seconds for bridging\n`);

    const fundStartTime = Date.now();
    const fundAmountWei = parseUnits(CONFIG.FUND_AMOUNT.toString(), 18);

    try {
        const fundResult = await storage.fundCredits({
            amount: fundAmountWei,
            userAddress: account.address,
            sourceChainId: CONFIG.CHAIN.id,
            sourceTokenSymbol: CONFIG.SOURCE_TOKEN,
        });

        const fundDuration = ((Date.now() - fundStartTime) / 1000).toFixed(1);
        const newBalanceUSDFC = Number(BigInt(fundResult.newBalance) / BigInt(10 ** 16)) / 100;

        console.log('\n✅ Credits Funded Successfully!');
        console.log(`   Duration: ${fundDuration}s`);
        console.log(`   Bridge ID: ${fundResult.bridgeRequestId}`);
        console.log(`   Amount added: ${CONFIG.FUND_AMOUNT} USDFC`);
        console.log(`   New balance: ${newBalanceUSDFC.toFixed(4)} USDFC\n`);
    } catch (error) {
        console.error('\n❌ Funding Failed!');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }

    // ========================================================================
    // STEP 6: Read Test File
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 6: Reading Test File                                    │');
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
    // STEP 7: Calculate Storage Cost
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 7: Calculating Storage Cost                             │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    const estimatedCost = storage.calculateStorageCost(fileData.length, CONFIG.STORAGE_DURATION);
    const costUSDFC = Number(estimatedCost / BigInt(10 ** 16)) / 100;

    console.log(`✓ Storage cost calculated:`);
    console.log(`   File size: ${fileData.length} bytes`);
    console.log(`   Duration: ${CONFIG.STORAGE_DURATION} days`);
    console.log(`   Cost: ${estimatedCost} wei (${costUSDFC.toFixed(6)} USDFC)\n`);

    // ========================================================================
    // STEP 8: Upload File to Filecoin (using credits)
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 8: Uploading File to Filecoin                           │');
    console.log('│ (Using credits from your account)                            │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    console.log('⏳ Starting upload process...');
    console.log(`   User: ${account.address}`);
    console.log(`   File: ${CONFIG.FILE_PATH}`);
    console.log(`   Storage: ${CONFIG.STORAGE_DURATION} days`);
    console.log(`   Cost: ${costUSDFC.toFixed(6)} USDFC\n`);

    const startTime = Date.now();

    let uploadResult;
    try {
        uploadResult = await storage.uploadFile({
            file: fileData,
            fileName: 'test-upload.json',
            userAddress: account.address,
            storageDurationDays: CONFIG.STORAGE_DURATION,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n✅ Upload Successful!');
        console.log(`   Duration: ${duration}s`);
        console.log(`   File ID: ${uploadResult.fileId}`);
        console.log(`   Status: ${uploadResult.status}`);
        console.log(`   Cost: ${uploadResult.storageCost} wei`);
        console.log(`   Message: ${uploadResult.message}\n`);
    } catch (error) {
        console.error('\n❌ Upload Failed!');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }

    // ========================================================================
    // STEP 9: List User Files
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 9: Listing User Files                                   │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    try {
        const files = await storage.listFiles(account.address);

        console.log(`✓ Found ${files.length} file(s) for user ${account.address}\n`);

        files.forEach((file: any, index: number) => {
            const fileCostWei = BigInt(file.storageCost || '0');
            const fileCostUSDFC = Number(fileCostWei / BigInt(10 ** 16)) / 100;

            console.log(`   File #${index + 1}:`);
            console.log(`   ├─ Name: ${file.fileName}`);
            console.log(`   ├─ Size: ${file.fileSize} bytes`);
            console.log(`   ├─ Storage: ${file.storageDurationDays} days`);
            console.log(`   ├─ Cost: ${fileCostUSDFC.toFixed(6)} USDFC`);
            console.log(`   ├─ CommP: ${file.commp || 'pending'}`);
            console.log(`   ├─ Provider: ${file.providerId || 'pending'}`);
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
        // STEP 10: Download File from Filecoin
        // ====================================================================

        console.log('┌──────────────────────────────────────────────────────────────┐');
        console.log('│ STEP 10: Downloading File from Filecoin                      │');
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
    // STEP 11: Check Remaining Credits and Transaction History
    // ========================================================================

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│ STEP 11: Checking Remaining Credits                          │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');

    try {
        const finalBalance = await storage.getCreditBalance(account.address);
        const finalBalanceWei = BigInt(finalBalance.balance);
        const finalBalanceUSDFC = Number(finalBalanceWei / BigInt(10 ** 16)) / 100;
        const usedWei = initialBalance + fundAmountWei - finalBalanceWei;
        const usedUSDFC = Number(usedWei / BigInt(10 ** 16)) / 100;

        console.log(`✓ Final balance: ${finalBalance.balance} wei (${finalBalanceUSDFC.toFixed(4)} USDFC)`);
        console.log(`   Credits used: ${usedWei} wei (${usedUSDFC.toFixed(6)} USDFC)\n`);

        // Show recent transactions
        const transactions = await storage.getCreditHistory(account.address, 5);
        console.log(`📜 Recent Transactions (${transactions.length}):\n`);

        transactions.forEach((tx: any, index: number) => {
            const txAmountWei = BigInt(tx.amount);
            const txAmountUSDFC = Number(txAmountWei / BigInt(10 ** 16)) / 100;
            const sign = tx.type === 'deposit' ? '+' : '-';

            console.log(`   ${index + 1}. ${tx.type.toUpperCase()}: ${sign}${txAmountUSDFC.toFixed(6)} USDFC`);
            console.log(`      ${tx.description}`);
        });
    } catch (error) {
        console.error('❌ Error fetching final balance:');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // ========================================================================
    // DEMO COMPLETE
    // ========================================================================

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEMO COMPLETE!                                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('🎉 Success! You just used the credit-based Filecoin storage system!');
    console.log('   Uploaded a file to Filecoin from Base without switching networks!\n');

    console.log('📊 Summary:');
    console.log(`   • User stayed on: ${CONFIG.CHAIN.name}`);
    console.log(`   • Funded with: ${CONFIG.SOURCE_TOKEN} (bridged ${CONFIG.FUND_AMOUNT} USDFC)`);
    console.log(`   • Storage duration: ${CONFIG.STORAGE_DURATION} days`);
    console.log(`   • Storage cost: ${costUSDFC.toFixed(6)} USDFC`);
    console.log(`   • File stored on: Filecoin (via Synapse SDK)`);
    console.log(`   • Credits never expire: Use anytime for future uploads\n`);

    console.log('🔑 Key Innovation:');
    console.log('   Credit-based system: Fund once, use many times!');
    console.log('   Cross-chain Synapse SDK: Access Filecoin from ANY blockchain.');
    console.log('   Transparent costs: Exact Synapse SDK pricing formula.');
}

// Run the demo
main().catch((error) => {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ DEMO FAILED                                               ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');
    console.error('Error:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure backend is running: cd backend && npm run dev');
    console.error('2. Check your BASE_SEPOLIA_PRIVATE_KEY is correct and has RUSD on Base Sepolia');
    console.error('3. Verify BACKEND_FILECOIN_ADDRESS is set correctly (testnet address)');
    console.error('4. Make sure backend has USDFC and FIL for gas on Calibration testnet');
    console.error('5. Check credit balance: npm run check-credits');
    console.error('6. Get testnet tokens: Base Sepolia faucet for RUSD, Filecoin faucet for FIL\n');
    process.exit(1);
});
