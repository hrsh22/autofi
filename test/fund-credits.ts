/**
 * Fund Credits Script
 * 
 * Bridges USDFC from your wallet to backend to fund your credit account.
 * Usage: tsx fund-credits.ts <amount_in_usdfc>
 * Example: tsx fund-credits.ts 1.5
 */

import { readFileSync } from 'node:fs';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';
import { getRouterAddress } from '../sdk/dist/onlyswaps/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const PRIVATE_KEY = process.env.BASE_SEPOLIA_PRIVATE_KEY as `0x${string}`;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const BACKEND_FILECOIN_ADDRESS = process.env.BACKEND_FILECOIN_ADDRESS || '0x6de669c9da78b62c7504d41412de43d3d7c7e9ef';
const CHAIN = base; // Base mainnet
const SOURCE_TOKEN = 'USDT' as const;

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('❌ Error: Amount required');
        console.log('\nUsage: tsx fund-credits.ts <amount_in_usdfc>');
        console.log('Example: tsx fund-credits.ts 1.5');
        console.log('\nThis will bridge 1.5 USDFC worth of tokens to fund your credit account.');
        process.exit(1);
    }

    const amountUSDFC = parseFloat(args[0]);

    if (isNaN(amountUSDFC) || amountUSDFC <= 0) {
        console.error('❌ Error: Amount must be a positive number');
        process.exit(1);
    }

    if (!PRIVATE_KEY) {
        console.error('❌ Error: BASE_SEPOLIA_PRIVATE_KEY environment variable not set');
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('  Fund Credits - Cross-Chain Filecoin Storage');
    console.log('═══════════════════════════════════════════════════\n');

    const account = privateKeyToAccount(PRIVATE_KEY);
    console.log(`👤 User: ${account.address}`);
    console.log(`💰 Amount: ${amountUSDFC} USDFC`);
    console.log(`🌐 Chain: ${CHAIN.name}`);
    console.log(`🪙 Token: ${SOURCE_TOKEN}`);
    console.log(`🔗 Backend: ${BACKEND_URL}\n`);

    // Setup clients
    const walletClient = createWalletClient({
        account,
        chain: CHAIN,
        transport: http(),
    });

    const publicClient = createPublicClient({
        chain: CHAIN,
        transport: http(),
    });

    const routerAddress = getRouterAddress(CHAIN.id);
    if (!routerAddress) {
        console.error(`❌ Error: OnlySwaps router not found for chain ${CHAIN.id}`);
        process.exit(1);
    }

    const storage = new SynapseStorageClient({
        backendUrl: BACKEND_URL,
        backendFilecoinAddress: BACKEND_FILECOIN_ADDRESS as `0x${string}`,
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        routerAddress,
    });

    // Convert to wei (18 decimals)
    const amountWei = parseUnits(amountUSDFC.toString(), 18);
    console.log(`📊 Amount in wei: ${amountWei.toString()}\n`);

    // Check current balance
    console.log('⏳ Checking current balance...');
    try {
        const currentBalance = await storage.getCreditBalance(account.address);
        console.log(`✓ Current balance: ${currentBalance.balance} wei\n`);
    } catch (error) {
        console.log('⚠️  Could not fetch current balance (new user?)\n');
    }

    // Fund credits
    console.log('⏳ Funding credits (this will take ~30-60 seconds)...');
    console.log('   1. Bridging tokens from Base to Filecoin');
    console.log('   2. Waiting for bridge completion');
    console.log('   3. Crediting your account\n');

    try {
        const result = await storage.fundCredits({
            amount: amountWei,
            userAddress: account.address,
            sourceChainId: CHAIN.id,
            sourceTokenSymbol: SOURCE_TOKEN,
        });

        console.log('\n✅ Credits funded successfully!');
        console.log(`   Bridge ID: ${result.bridgeRequestId}`);
        console.log(`   Amount added: ${result.amountFunded} wei`);
        console.log(`   New balance: ${result.newBalance} wei\n`);

        // Convert balance to USDFC for display
        const balanceUSDFC = Number(BigInt(result.newBalance) / BigInt(10 ** 16)) / 100;
        console.log(`💰 Your credit balance: ${balanceUSDFC.toFixed(4)} USDFC`);
    } catch (error) {
        console.error('\n❌ Failed to fund credits:');
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✓ Done! You can now upload files using these credits.');
    console.log('═══════════════════════════════════════════════════');
}

main().catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
});

