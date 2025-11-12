/**
 * Upload File Script
 * 
 * Uploads a file to Filecoin using credits from your account.
 * Usage: tsx upload-file.ts <filePath> [storage_duration_days]
 * Example: tsx upload-file.ts ./test-upload.json 30
 * 
 * Default storage duration: 30 days
 */

import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';

dotenv.config();

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const PRIVATE_KEY = process.env.BASE_SEPOLIA_PRIVATE_KEY as `0x${string}` | undefined;
const DEFAULT_STORAGE_DAYS = 30;

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const storageDurationDays = args[1] ? parseInt(args[1]) : DEFAULT_STORAGE_DAYS;

  if (!filePath) {
    console.error('❌ Error: File path required');
    console.log('\nUsage: tsx upload-file.ts <filePath> [storage_duration_days]');
    console.log('Example: tsx upload-file.ts ./test-upload.json 30');
    console.log('\nDefault storage duration: 30 days');
    process.exit(1);
  }

  if (isNaN(storageDurationDays) || storageDurationDays <= 0) {
    console.error('❌ Error: Storage duration must be a positive number');
    process.exit(1);
  }

  if (!PRIVATE_KEY) {
    console.error('❌ Error: BASE_SEPOLIA_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('  Upload File - Cross-Chain Filecoin Storage');
  console.log('═══════════════════════════════════════════════════\n');

  const account = privateKeyToAccount(PRIVATE_KEY);

  const fileBuffer = readFileSync(filePath);
  const fileData = new Uint8Array(fileBuffer);
  const fileName = path.basename(filePath);
  const fileSize = fileData.length;

  console.log(`👤 User: ${account.address}`);
  console.log(`📁 File: ${fileName}`);
  console.log(`📊 Size: ${fileSize} bytes (${(fileSize / 1024).toFixed(2)} KB)`);
  console.log(`⏱️  Storage: ${storageDurationDays} days`);
  console.log(`🔗 Backend: ${BACKEND_URL}\n`);

  const storage = new SynapseStorageClient({
    backendUrl: BACKEND_URL,
  });

  // Calculate and display estimated cost
  const estimatedCost = storage.calculateStorageCost(fileSize, storageDurationDays);
  const costUSDFC = Number(estimatedCost / BigInt(10 ** 16)) / 100;

  console.log(`💵 Estimated cost: ${estimatedCost} wei (${costUSDFC.toFixed(6)} USDFC)\n`);

  // Check current balance
  console.log('⏳ Checking credit balance...');
  try {
    const balance = await storage.getCreditBalance(account.address);
    const balanceWei = BigInt(balance.balance);
    const balanceUSDFC = Number(balanceWei / BigInt(10 ** 16)) / 100;

    console.log(`✓ Current balance: ${balance.balance} wei (${balanceUSDFC.toFixed(4)} USDFC)`);

    if (balanceWei < estimatedCost) {
      console.error(`\n❌ Insufficient credits!`);
      console.error(`   Required: ${estimatedCost} wei`);
      console.error(`   Balance: ${balance.balance} wei`);
      console.error(`   Shortfall: ${(estimatedCost - balanceWei).toString()} wei`);
      console.error(`\nPlease fund your account using: tsx fund-credits.ts <amount>`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Failed to check balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`\nPlease fund your account using: tsx fund-credits.ts <amount>`);
    process.exit(1);
  }

  // Upload file
  console.log('\n⏳ Uploading file...');
  try {
    const result = await storage.uploadFile({
      file: fileData,
      fileName,
      userAddress: account.address,
      storageDurationDays,
    });

    console.log('\n✅ Upload successful!');
    console.log(`   File ID: ${result.fileId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Cost: ${result.storageCost} wei`);
    console.log(`   Message: ${result.message}`);

    // Show remaining balance
    const newBalance = await storage.getCreditBalance(account.address);
    const newBalanceUSDFC = Number(BigInt(newBalance.balance) / BigInt(10 ** 16)) / 100;
    console.log(`\n💰 Remaining balance: ${newBalance.balance} wei (${newBalanceUSDFC.toFixed(4)} USDFC)`);
  } catch (err) {
    console.error('\n❌ Upload failed:');
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✓ Done! File uploaded to Filecoin.');
  console.log('═══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});


