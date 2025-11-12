/**
 * Example: Cross-chain Filecoin storage using @autofi/synapse
 * 
 * This example shows how to:
 * 1. Upload a file from Base testnet (paying with USDT)
 * 2. Automatically bridge tokens to Filecoin
 * 3. Store files on Filecoin via Synapse SDK
 * 4. Download files back from Filecoin
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, filecoin } from 'viem/chains';
import { SynapseStorageClient } from '@autofi/synapse';
import { getRouterAddress } from '../src/onlyswaps/discovery.js';

// Example configuration
const PRIVATE_KEY = '0x...'; // Your private key
const BACKEND_URL = 'http://localhost:3001'; // Backend API URL

async function main() {
    // 1. Setup wallet and clients
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    
    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(),
    });

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
    });

    const routerAddress = getRouterAddress(baseSepolia.id);
    if (!routerAddress) {
        throw new Error('OnlySwaps router not found for Base Sepolia');
    }

    // 2. Initialize Synapse Storage Client
    console.log('Initializing Synapse Storage Client...');
    const storage = new SynapseStorageClient({
        backendUrl: BACKEND_URL,
        walletClient,
        publicClient,
        routerAddress,
    });

    // 3. Upload a file
    // Note: This will bridge 0.1 USDFC per upload from your wallet to the backend
    console.log('\nUploading file...');
    const fileContent = 'Hello, Filecoin! This is a test file.';
    const fileData = new TextEncoder().encode(fileContent);
    
    const uploadResult = await storage.uploadFile({
        file: fileData,
        fileName: 'test.txt',
        userAddress: account.address,
        sourceChainId: baseSepolia.id,
        sourceTokenSymbol: 'RUSD', // Using testnet token
    });

    console.log('Upload result:', uploadResult);
    console.log(`File ID: ${uploadResult.fileId}`);
    console.log(`Status: ${uploadResult.status}`);

    // 4. List user files
    console.log('\nListing user files...');
    const files = await storage.listFiles(account.address);
    console.log(`Found ${files.length} files:`);
    files.forEach(file => {
        console.log(`- ${file.fileName} (${file.fileSize} bytes)`);
        console.log(`  CommP: ${file.commp}`);
        console.log(`  Payment: ${file.paymentAmount} USDFC`);
        console.log(`  Bridge ID: ${file.bridgeRequestId}`);
        console.log(`  Uploaded: ${file.uploadedAt ? new Date(file.uploadedAt).toISOString() : 'pending'}`);
    });

    // 5. Download a file
    if (files.length > 0 && files[0].commp) {
        console.log(`\nDownloading file: ${files[0].fileName}...`);
        const downloadedData = await storage.downloadFile(files[0].commp);
        const downloadedContent = new TextDecoder().decode(downloadedData);
        console.log('Downloaded content:', downloadedContent);
    }

    // 6. Check backend status
    console.log('\nChecking backend status...');
    const status = await storage.getBackendStatus();
    console.log('Backend status:', status);
}

main().catch(console.error);

