# FilBridge SDK

**Cross-chain Filecoin storage made simple. Upload from any blockchain, no Filecoin wallet needed.**

FilBridge SDK combines **Synapse** (Filecoin storage) and **OnlySwaps** (cross-chain bridging) to make decentralized storage accessible from any blockchain.

## 🎯 What Problem Does It Solve?

Using Filecoin storage traditionally requires:

- ❌ Filecoin wallet and FIL tokens
- ❌ Switching networks
- ❌ Complex payment setup
- ❌ Understanding Synapse protocol details

**FilBridge solves this** by letting users:

- ✅ Stay on their preferred chain (Base, Ethereum, Arbitrum, etc.)
- ✅ Fund credits using ERC20 tokens (USDT/USDC) - converted to USDFC via OnlySwaps
- ✅ Upload files with a single method call
- ✅ Pay-per-use pricing based on file size and storage duration
- ✅ No Filecoin knowledge required

## ✨ Key Features

- **🌐 Cross-chain uploads** - Upload from Base, Ethereum, Arbitrum, and more
- **💳 Manual credit funding** - Use OnlySwaps to convert ERC20 tokens to USDFC credits
- **📦 Simple API** - One method call: `uploadFile()`
- **🔐 Decentralized storage** - Files stored on Filecoin via Synapse SDK
- **💰 Credit system** - Fund credits, then upload multiple files
- **💵 Pay-per-use** - Costs calculated based on file size and storage duration
- **📊 Balance tracking** - Monitor credits and transaction history
- **🔍 File management** - List and download files by CommP

## 🏗️ Architecture

```
User on Base (with USDT)
    ↓
1. Fund Credits (Manual)
    ├─ User calls fundCredits()
    ├─ OnlySwaps bridges ERC20 → USDFC
    └─ Credits added to user balance
    ↓
2. Upload File
    ├─ SDK calculates cost (file size × duration)
    ├─ Checks user credit balance
    ├─ Uploads to backend
    └─ Backend deducts cost from credits
    ↓
Backend API
    ├─ Uploads to Filecoin (Synapse SDK)
    └─ Stores file metadata
    ↓
Filecoin Storage
    └─ Files stored with metadata
```

## 🎨 Demo

### Setup Locally

```bash
# 1. Build the SDK
cd sdk
npm install
cp .env.example .env
npm run build

# 2. Start the backend
cd ../backend
npm install
cp .env.example .env
npm run dev           # Starts on http://localhost:3001

# 3. Start the frontend
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

### SDK Usage Example

```typescript
import { SynapseStorageClient } from "@filbridge/synapse";
import { getRouterAddress } from "@filbridge/onlyswaps";
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { baseSepolia } from "wagmi/chains";

// Initialize clients
const storage = new SynapseStorageClient({
    backendUrl: "http://localhost:3001",
    walletClient,
    publicClient,
    routerAddress: getRouterAddress(baseSepolia.id)
});

// 1. Fund credits (convert ERC20 to USDFC via OnlySwaps)
await storage.fundCredits({
    amount: parseUnits("10", 18), // 10 USDFC
    userAddress: account.address,
    sourceChainId: baseSepolia.id,
    sourceTokenSymbol: "RUSD" // or "USDT"/"USDC" on mainnet
});

// 2. Upload file (cost deducted from credits)
const result = await storage.uploadFile({
    file: fileData,
    fileName: "document.pdf",
    userAddress: account.address,
    storageDurationDays: 30 // Cost calculated: file size × duration
});

// List files
const files = await storage.listFiles(account.address);

// Download file
const data = await storage.downloadFile(files[0].commp);
```

## 📚 SDK Modules

- **`@filbridge/synapse`** - Filecoin storage client
- **`@filbridge/onlyswaps`** - Cross-chain token bridging
- **`@filbridge/core`** - Shared types and utilities

## 🛠️ Tech Stack

- **Synapse SDK** - Filecoin storage integration
- **OnlySwaps** - Cross-chain token bridging
