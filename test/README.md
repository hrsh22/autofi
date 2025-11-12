# Demo Script

This folder contains a demo script that showcases the complete cross-chain Filecoin storage flow.

## What It Demonstrates

1. **Bridge Payment**: Automatically bridges 0.1 USDFC from Base (using USDT) to backend wallet
2. **Upload to Filecoin**: Uploads `test-upload.json` to Filecoin via Synapse SDK
3. **List Files**: Shows all files uploaded by the user
4. **Download**: Downloads the file back from Filecoin and verifies content

## Prerequisites

Before running the demo:

### 1. Backend Running

```bash
cd ../backend
npm run dev
```

Backend should be healthy on `http://localhost:3001`

### 2. Funded Wallet

Your wallet needs:

- **Base mainnet USDT** (~0.15 USDT for the demo + OnlySwaps fees)
- **Base ETH** for gas fees

### 3. Backend Wallet Funded

Backend wallet needs:

- **Filecoin USDFC** (deposited in Synapse)
- **Filecoin FIL** for gas fees

## Configuration

Edit the configuration at the top of `demo.ts`:

```typescript
const CONFIG = {
    // Your wallet private key (must have USDT on Base)
    PRIVATE_KEY: "0x...",

    // Backend API URL
    BACKEND_URL: "http://localhost:3001",

    // Backend Filecoin wallet address
    BACKEND_FILECOIN_ADDRESS: "0x..."

    // Network: base (mainnet)
    // Token: USDT
};
```

## Running the Demo

### 1. Build SDK

```bash
cd ../sdk
npm run build
```

### 2. Compile Demo Script

```bash
cd ../test
npx tsx demo.ts
```

Or compile TypeScript first:

```bash
cd ..
npx tsc test/demo.ts --module esnext --target es2022 --moduleResolution bundler
node test/demo.js
```

## Expected Output

```
╔═══════════════════════════════════════════════════════════════╗
║  @autofi/synapse - Cross-Chain Filecoin Storage Demo         ║
║  Making Synapse SDK accessible from ANY blockchain           ║
╚═══════════════════════════════════════════════════════════════╝

📋 Configuration:
   Network: Base (Chain ID: 8453)
   Token: USDT
   Backend: http://localhost:3001
   File: ./test-upload.json

┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Setting Up Wallet and Clients                        │
└──────────────────────────────────────────────────────────────┘

✓ Wallet loaded: 0x...
✓ Wallet client created for Base
✓ Public client created
✓ OnlySwaps router: 0x...

┌──────────────────────────────────────────────────────────────┐
│ STEP 2: Initializing Synapse Storage Client                  │
└──────────────────────────────────────────────────────────────┘

✓ Synapse Storage Client initialized

┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Checking Backend Status                              │
└──────────────────────────────────────────────────────────────┘

✓ Backend Status: healthy
   Backend Synapse Balance: 100000000000000000000 wei
   Backend Synapse Allowance: 100000000000000000000 wei

┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Reading Test File                                    │
└──────────────────────────────────────────────────────────────┘

✓ File loaded: ./test-upload.json
   Size: 58 bytes
   Content preview: {
    "fileId": "1",
    "fileName": "test-upload.json"
}
...

┌──────────────────────────────────────────────────────────────┐
│ STEP 5: Uploading File to Filecoin                           │
│ (This will automatically bridge 0.1 USDFC from your wallet)  │
└──────────────────────────────────────────────────────────────┘

⏳ Starting upload process...
   User: 0x...
   File: ./test-upload.json
   Payment: 0.1 USDFC (bridged from USDT)

Bridging payment to backend (0.1 USDFC)...
Bridge fees: {...}
Bridge initiated. Request ID: 0x...
Waiting for bridge completion...
Bridge status: executed=false, fulfilled=false, elapsed=5000ms
Bridge status: executed=true, fulfilled=true, elapsed=35000ms
Bridge completed successfully!
Step 2: Uploading file to backend...
Upload complete: {...}

✅ Upload Successful!
   Duration: 42.3s
   File ID: abc-123-def
   Status: completed
   Message: File uploaded successfully

┌──────────────────────────────────────────────────────────────┐
│ STEP 6: Listing User Files                                   │
└──────────────────────────────────────────────────────────────┘

✓ Found 1 file(s) for user 0x...

   File #1:
   ├─ Name: test-upload.json
   ├─ Size: 58 bytes
   ├─ CommP: bafkzcib...
   ├─ Provider: 0x...
   ├─ Payment: 100000000000000000 wei
   ├─ Bridge ID: 0x...
   └─ Uploaded: 2025-11-11T...

┌──────────────────────────────────────────────────────────────┐
│ STEP 7: Downloading File from Filecoin                       │
└──────────────────────────────────────────────────────────────┘

⏳ Downloading file with CommP: bafkzcib...

✅ Download Successful!
   Size: 58 bytes
   ✓ Content verification: PASSED

   Content:
{
    "fileId": "1",
    "fileName": "test-upload.json"
}

╔═══════════════════════════════════════════════════════════════╗
║  ✅ DEMO COMPLETE!                                            ║
╚═══════════════════════════════════════════════════════════════╝

🎉 Success! You just uploaded a file to Filecoin from Base mainnet
   without ever switching networks or needing a Filecoin wallet!

📊 Summary:
   • User stayed on: Base
   • Paid with: USDT
   • Payment amount: 0.1 USDFC (+ OnlySwaps fees)
   • File stored on: Filecoin (via Synapse SDK)
   • Ownership metadata: Recorded on-chain in Filecoin

🔑 Key Innovation:
   This is the FIRST cross-chain Synapse SDK solution!
   Users can access Filecoin storage from ANY blockchain.
```

## Troubleshooting

### "Backend not responding"

```bash
# Check backend is running
curl http://localhost:3001/health

# Restart if needed
cd ../backend
npm run dev
```

### "Insufficient balance"

Your wallet needs:

- USDT on Base (~0.15 USDT)
- ETH on Base (for gas)

Check balance:

```bash
cast balance $YOUR_ADDRESS --rpc-url https://mainnet.base.org
```

### "Bridge failed"

- Ensure OnlySwaps has liquidity for USDT → USDFC on your chain
- Check your wallet has enough tokens + gas
- Verify the router address is correct

### "File not found after upload"

The file might still be processing on Filecoin. Wait a few seconds and try listing files again.

## For Testnet

To use testnet instead, change CONFIG to:

```typescript
import { baseSepolia } from "viem/chains";

const CONFIG = {
    CHAIN: baseSepolia,
    SOURCE_TOKEN: "RUSD" as const
    // ... rest same
};
```

And set backend to use calibration testnet:

```bash
FILECOIN_RPC_URL=wss://api.calibration.node.glif.io/rpc/v1
```

## Demo Tips

### For Presentations

1. **Preparation (before demo)**:

    - Have backend running and healthy
    - Show `curl http://localhost:3001/api/status`
    - Show your wallet on Base (has USDT)

2. **During demo**:

    - Run script with `npx tsx demo.ts`
    - Emphasize each step as it runs
    - Point out: "No network switch required!"
    - Show the bridge happening in real-time

3. **After upload**:
    - Show the file in list with CommP
    - Download to prove it's on Filecoin
    - Emphasize: "Never touched Filecoin directly"

### Key Talking Points

- "First cross-chain Synapse SDK solution"
- "Users stay on their preferred chain"
- "Pay with any token (USDT, USDC, etc.)"
- "No Filecoin wallet needed"
- "Custodial middleware abstracts complexity"

## Files

- `demo.ts` - Main demo script (edit config at top)
- `test-upload.json` - Sample file to upload
- `README.md` - This file

## Next Steps

After successful demo:

1. Try uploading different files
2. Test from different chains (Ethereum, Arbitrum, etc.)
3. Show multiple uploads from same user
4. Demonstrate file sharing via CommP

---

**Ready to showcase cross-chain Filecoin storage!** 🚀

## Additional Scripts

Besides `demo.ts`, this folder includes focused scripts to showcase individual features of the Synapse storage flow.

### list-files.ts — List files for a user

- Lists all uploaded files linked to a `userAddress`.
- Reads `BACKEND_URL` from env (defaults to `http://localhost:3001`).

Run:

```bash
cd test
npx tsx list-files.ts 0xYOUR_USER_ADDRESS
```

Output includes file `id`, `fileName`, `fileSize`, `commp`, `providerId`, `paymentAmount`, `bridgeRequestId`, and `uploadedAt`.

### download-file.ts — Download by CommP

- Downloads a file using its CommP.
- Second argument behavior:
    - If a file path is provided, saves exactly to that path.
    - If a directory is provided (existing or ending with `/`), saves to `<dir>/<CommP>.bin` (directory is created if missing).
    - If omitted, prints a preview to stdout.

Run:

```bash
cd test
npx tsx download-file.ts <CommP> ./output.json           # save to file
npx tsx download-file.ts <CommP> ./downloads/            # save to ./downloads/<CommP>.bin
npx tsx download-file.ts <CommP>                          # preview only
```

Examples:

- Save to disk: `npx tsx download-file.ts baga6ea4cf... ./downloaded.json`
- Save to directory: `npx tsx download-file.ts baga6ea4cf... ./downloads/`
- Preview only: `npx tsx download-file.ts baga6ea4cf...`

### status.ts — Backend health and Synapse state

- Shows `status`, and if available, `synapse.balance` and `synapse.allowance`.

Run:

```bash
cd test
npx tsx status.ts
```

### upload-file.ts — Upload a file only

- Minimal upload-only flow (no listing, no download).
- Uses your Base wallet address from `BASE_MAINNET_PRIVATE_KEY` to tag ownership metadata.
- Reads `BACKEND_URL` from env.

Run:

```bash
cd test
export BASE_MAINNET_PRIVATE_KEY=0x...   # must be set
npx tsx upload-file.ts ./test-upload.json
```

## NPM Scripts (optional)

For convenience, you can also run via npm scripts:

```bash
cd test
npm run demo
npm run list-files -- 0xYOUR_USER_ADDRESS
npm run download-file -- <CommP> ./output.json
npm run status
npm run upload-file -- ./test-upload.json
```

Environment variables supported:

- `BACKEND_URL` (default `http://localhost:3001`)
- `BASE_MAINNET_PRIVATE_KEY` (required for `upload-file.ts`)
- `USER_ADDRESS` (optional default for `list-files.ts`)
