# Quick Start Guide - Simplified Architecture

## 🚀 TL;DR

**Simplified model**: Pay 0.1 USDFC per upload (no balance tracking).

## 📋 Setup Checklist

### 1. Backend Environment Variables

Create `backend/.env`:

```bash
# Your Filecoin wallet
FILECOIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
BACKEND_FILECOIN_ADDRESS=0xYOUR_ADDRESS

# Network (MUST be WebSocket!)
FILECOIN_RPC_URL=wss://api.node.glif.io/rpc/v1

# Server config
PORT=3001
DATABASE_PATH=./storage.db
```

**Important:** Use `wss://` (WebSocket), not `https://`!

### 2. Fund Your Backend Wallet

**For Mainnet:**

- Get USDFC tokens in your wallet
- Get FIL for gas fees

**For Testnet (Calibration):**

- Use: `FILECOIN_RPC_URL=wss://api.calibration.node.glif.io/rpc/v1`
- Get testnet FIL: https://faucet.calibration.fildev.network/
- Get testnet USDFC (bridge RUSD or contact Synapse team)

### 3. Start Backend

```bash
cd backend
npm install
npm run build
npm run dev
```

**Should see:**

```
Initializing Synapse SDK...
Synapse SDK connected to mainnet (chain ID: 314)
✓ Backend wallet balance: ...
🚀 Backend server running on port 3001
```

### 4. Test Backend

```bash
# Health check
curl http://localhost:3001/health
# → {"status":"ok","timestamp":...}

# Backend status
curl http://localhost:3001/api/status
# → {"status":"healthy","synapse":{...}}
```

## 📦 Using the SDK

### Install

```bash
cd sdk
npm install
npm run build
```

### Usage

```typescript
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { SynapseStorageClient } from "@autofi/synapse";
import { getRouterAddress } from "@autofi/onlyswaps";

// Setup wallet
const account = privateKeyToAccount("0x...");
const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
});

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
});

// Initialize storage client
const storage = new SynapseStorageClient({
    backendUrl: "http://localhost:3001",
    walletClient,
    publicClient,
    routerAddress: getRouterAddress(baseSepolia.id)
});

// Upload file (bridges 0.1 USDFC automatically)
const result = await storage.uploadFile({
    file: fileData,
    fileName: "test.txt",
    userAddress: account.address,
    sourceChainId: baseSepolia.id,
    sourceTokenSymbol: "RUSD" // Testnet token
});

console.log("File uploaded! CommP:", result.fileId);

// List files
const files = await storage.listFiles(account.address);

// Download file
const data = await storage.downloadFile(files[0].commp);
```

## 🔄 Upload Flow

### Step-by-Step

1. **User calls uploadFile()**

    - SDK receives file data and user info

2. **SDK bridges payment**

    - Bridges 0.1 USDFC from user wallet to backend wallet
    - Uses OnlySwaps to convert USDT/RUSD → USDFC
    - Waits for bridge completion (~30-60 seconds)

3. **SDK uploads file**

    - Sends file + bridgeRequestId to backend
    - Backend verifies payment (trust-based for now)

4. **Backend uploads to Filecoin**

    - Uses Synapse SDK to upload
    - Stores metadata: userAddress, fileName
    - Records CommP and payment info

5. **User gets result**
    - Receives fileId (CommP)
    - Can immediately download or share

### Cost Per Upload

- **Bridge amount**: 0.1 USDFC
- **OnlySwaps fees**: ~0.01 USDFC (varies)
- **Synapse cost**: Variable (deducted from backend wallet)
- **Total user pays**: ~0.11 USDFC per file

## 📊 Database

**Single table:**

| Field             | Type    | Description           |
| ----------------- | ------- | --------------------- |
| id                | TEXT    | Unique file ID        |
| user_address      | TEXT    | File owner            |
| file_name         | TEXT    | Original filename     |
| file_size         | INTEGER | Size in bytes         |
| file_hash         | TEXT    | SHA256 hash           |
| commp             | TEXT    | Filecoin CommP        |
| provider_id       | TEXT    | Storage provider      |
| bridge_request_id | TEXT    | OnlySwaps transaction |
| payment_amount    | TEXT    | 0.1 USDFC             |
| uploaded_at       | INTEGER | Upload timestamp      |

## 🔍 Troubleshooting

### "WebSocket connection failed"

- Make sure you're using `wss://` not `https://`
- Check your RPC URL is correct
- Verify network connectivity

### "Bridge failed"

- Ensure user has enough tokens (need ~0.11 USDFC worth)
- Check OnlySwaps router is correct for your chain
- Verify tokens are supported (USDT or RUSD)

### "Synapse upload failed"

- Check backend wallet has USDFC balance
- Verify backend wallet has FIL for gas
- Check Synapse contracts are deployed on your network

### "Backend not responding"

- Ensure backend is running: `npm run dev`
- Check PORT is 3001 or update SDK backendUrl
- Verify firewall allows connections

## 🎯 For Demo

### What to Show

1. **Start with problem**

    - "Synapse requires Filecoin wallet"
    - "User on Base doesn't have one"

2. **Show solution**

    - User uploads file from Base
    - SDK auto-bridges 0.1 USDFC
    - File appears on Filecoin
    - User downloads successfully

3. **Emphasize**
    - "User never left Base"
    - "No Filecoin wallet needed"
    - "Pay per upload with any token"
    - "First cross-chain Synapse solution"

### Key Metrics

- Upload time: ~45 seconds (bridge + upload)
- Cost: 0.1 USDFC per file
- Supported chains: Base, Ethereum, Arbitrum (any OnlySwaps chain)
- File size: 127 bytes - 200 MiB (Synapse limits)

## 📚 Documentation

- **Architecture**: `ARCHITECTURE-SIMPLIFIED.md`
- **Backend API**: `backend/README.md`
- **Backend Setup**: `backend/SETUP.md`
- **SDK Usage**: `sdk/README-synapse.md`
- **Full Context**: `README-SYNAPSE.md`

## ✅ Ready to Demo

Both backend and SDK are built and ready. Just need:

1. Fund your backend wallet with USDFC + FIL
2. Start backend server
3. Run SDK example

---

**Simplified. Efficient. Production-ready.** 🎉
