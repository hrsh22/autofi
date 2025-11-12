/**
 * Check Credits Script
 * 
 * Displays your current credit balance and transaction history.
 * Usage: tsx check-credits.ts [user_address]
 * 
 * If no address is provided, uses USER_ADDRESS env variable or BASE_SEPOLIA_PRIVATE_KEY to derive address.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function main() {
    const args = process.argv.slice(2);

    let userAddress: `0x${string}`;

    if (args.length > 0) {
        userAddress = args[0] as `0x${string}`;
    } else if (process.env.USER_ADDRESS) {
        userAddress = process.env.USER_ADDRESS as `0x${string}`;
    } else if (process.env.BASE_SEPOLIA_PRIVATE_KEY) {
        const account = privateKeyToAccount(process.env.BASE_SEPOLIA_PRIVATE_KEY as `0x${string}`);
        userAddress = account.address;
    } else {
        console.error('❌ Error: No address provided');
        console.log('\nUsage: tsx check-credits.ts [user_address]');
        console.log('\nOr set one of these environment variables:');
        console.log('  - USER_ADDRESS: Direct address');
        console.log('  - BASE_SEPOLIA_PRIVATE_KEY: Private key to derive address');
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('  Credit Balance & History');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`👤 User: ${userAddress}`);
    console.log(`🔗 Backend: ${BACKEND_URL}\n`);

    const storage = new SynapseStorageClient({
        backendUrl: BACKEND_URL,
    });

    // Get balance
    console.log('⏳ Fetching credit balance...');
    try {
        const balance = await storage.getCreditBalance(userAddress);
        const balanceWei = BigInt(balance.balance);
        const balanceUSDFC = Number(balanceWei / BigInt(10 ** 16)) / 100;

        console.log(`\n💰 Credit Balance:`);
        console.log(`   ${balance.balance} wei`);
        console.log(`   ${balanceUSDFC.toFixed(4)} USDFC\n`);
    } catch (error) {
        console.error(`❌ Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }

    // Get transaction history
    console.log('⏳ Fetching transaction history...');
    try {
        const transactions = await storage.getCreditHistory(userAddress);

        if (transactions.length === 0) {
            console.log('   No transactions found.\n');
        } else {
            console.log(`\n📜 Transaction History (${transactions.length} total):\n`);

            transactions.forEach((tx, index) => {
                const amountWei = BigInt(tx.amount);
                const amountUSDFC = Number(amountWei / BigInt(10 ** 16)) / 100;
                const date = new Date(tx.createdAt).toLocaleString();
                const sign = tx.type === 'deposit' ? '+' : '-';
                const emoji = tx.type === 'deposit' ? '💵' : '📤';

                console.log(`   ${emoji} Transaction #${index + 1}`);
                console.log(`      Type: ${tx.type.toUpperCase()}`);
                console.log(`      Amount: ${sign}${amountUSDFC.toFixed(4)} USDFC (${tx.amount} wei)`);
                console.log(`      Date: ${date}`);
                console.log(`      Description: ${tx.description}`);
                if (tx.bridgeRequestId) {
                    console.log(`      Bridge ID: ${tx.bridgeRequestId}`);
                }
                if (tx.fileId) {
                    console.log(`      File ID: ${tx.fileId}`);
                }
                console.log('');
            });
        }
    } catch (error) {
        console.error(`❌ Failed to fetch history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════');
}

main().catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
});

