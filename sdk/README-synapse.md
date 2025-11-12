# @autofi/synapse

Cross-chain Filecoin storage SDK powered by Synapse SDK and OnlySwaps.

## Overview

`@autofi/synapse` makes Filecoin storage accessible from **any blockchain**. Users can upload files to Filecoin without switching networks, managing FIL tokens, or understanding Synapse payment complexity.

### Key Features

✅ **Cross-chain uploads** - Upload from Base, Ethereum, Arbitrum, etc.  
✅ **No Filecoin wallet needed** - Users stay on their preferred chain  
✅ **Automatic bridging** - Auto-converts USDT/USDC to USDFC via OnlySwaps  
✅ **Balance tracking** - Deposit once, upload multiple files  
✅ **Simple API** - Single method call for upload  
✅ **Filecoin storage** - Files stored on Filecoin via Synapse SDK  

## Installation

```bash
npm install @autofi
```

## Quick Start

### 1. Setup Backend

First, deploy the backend API (see `backend/README.md`):

```bash
cd backend
npm install
npm run setup-wallet
npm run dev
```

### 2. Initialize SDK

```typescript
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { SynapseStorageClient } from '@autofi/synapse';
import { getRouterAddress } from '@autofi/onlyswaps';

// Setup wallet
const account = privateKeyToAccount('0x...');
const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
});

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
});

// Initialize storage client
const storage = new SynapseStorageClient({
    backendUrl: 'http://localhost:3001',
    walletClient,
    publicClient,
    routerAddress: getRouterAddress(baseSepolia.id),
});
```

### 3. Upload Files

```typescript
// Upload a file (automatically bridges if needed)
const fileData = new TextEncoder().encode('Hello, Filecoin!');

const result = await storage.uploadFile({
    file: fileData,
    fileName: 'hello.txt',
    userAddress: account.address,
    sourceChainId: baseSepolia.id,
    sourceTokenSymbol: 'RUSD', // Testnet token
});

console.log('Upload complete!');
console.log('File ID:', result.fileId);
console.log('Status:', result.status);
```

### 4. List and Download Files

```typescript
// List user's files
const files = await storage.listFiles(account.address);
console.log(`You have ${files.length} files`);

// Download a file
if (files[0].commp) {
    const data = await storage.downloadFile(files[0].commp);
    console.log('Downloaded:', new TextDecoder().decode(data));
}
```

## API Reference

### SynapseStorageClient

Main client for interacting with cross-chain Filecoin storage.

#### Constructor

```typescript
new SynapseStorageClient(config: SynapseStorageConfig)
```

**Parameters:**
- `backendUrl` (string): Backend API URL
- `walletClient` (WalletClient, optional): Viem wallet client for signing transactions
- `publicClient` (PublicClient, optional): Viem public client for reading blockchain state
- `routerAddress` (`0x${string}`, optional): OnlySwaps router address

#### Methods

##### `uploadFile(params: UploadFileParams): Promise<UploadResult>`

Upload a file to Filecoin. Automatically bridges tokens if user balance is insufficient.

**Parameters:**
- `file` (File | Uint8Array | Buffer): File data to upload
- `fileName` (string): Original filename
- `userAddress` (`0x${string}`): User's wallet address
- `sourceChainId` (number): Source blockchain ID
- `sourceTokenSymbol` ('USDT' | 'RUSD'): Token to bridge

**Returns:**
```typescript
{
    fileId: string;
    purchaseId?: string;
    status: 'completed' | 'awaiting_deposit' | 'processing';
    message: string;
}
```

##### `getUserBalance(userAddress: `0x${string}`): Promise<UserBalance>`

Check user's storage credit balance.

**Returns:**
```typescript
{
    userAddress: string;
    balance: string;        // USDFC in wei
    totalDeposited: string; // Lifetime deposits
    totalSpent: string;     // Lifetime spending
    lastUpdated: number;    // Unix timestamp
}
```

##### `listFiles(userAddress: `0x${string}`): Promise<UserFile[]>`

List all files uploaded by a user.

**Returns:**
```typescript
[{
    id: string;
    fileName: string;
    fileSize: number;
    fileHash: string;
    commp: string | null;      // Filecoin content identifier
    providerId: string | null;  // Storage provider address
    cost: string | null;        // Cost in USDFC
    uploadedAt: number | null;  // Unix timestamp
}]
```

##### `downloadFile(commp: string): Promise<Uint8Array>`

Download a file from Filecoin by its CommP (content identifier).

**Returns:** File data as Uint8Array

##### `getBackendStatus(): Promise<BackendStatus>`

Check backend health and wallet status.

**Returns:**
```typescript
{
    status: 'healthy' | 'unhealthy';
    synapse?: {
        balance: string;    // Backend wallet balance
        allowance: string;  // Available funds
    };
    error?: string;
}
```

## How It Works

### Architecture Flow

```
User on Base (with USDT)
    ↓
1. SDK checks user balance
    ↓
2. If low, bridge 5 USDFC to backend wallet via OnlySwaps
    ↓
3. Backend receives USDFC
    ↓
4. SDK uploads file to backend
    ↓
5. Backend uploads to Filecoin via Synapse SDK
    ↓
6. Backend deducts actual cost from user balance
    ↓
7. User can download via CommP
```

### Balance System

- **Initial deposit**: User's first upload triggers a 5 USDFC bridge
- **Credit balance**: Each deposit adds to user's balance
- **Pay-per-use**: Each upload deducts actual Synapse cost
- **Multiple uploads**: Users can upload multiple files without re-bridging
- **Auto-recharge**: SDK auto-bridges when balance drops below 1 USDFC

### File Metadata

Files uploaded to Synapse include metadata:
- **userAddress**: Owner's wallet address (stored on-chain)
- **fileName**: Original filename

This ensures ownership is verifiable on Filecoin itself, not just in the backend database.

## Examples

### Upload from Base

```typescript
import { SynapseStorageClient } from '@autofi/synapse';
import { baseSepolia } from 'viem/chains';

const storage = new SynapseStorageClient({
    backendUrl: 'http://localhost:3001',
    walletClient,
    publicClient,
    routerAddress: getRouterAddress(baseSepolia.id),
});

const result = await storage.uploadFile({
    file: myFileData,
    fileName: 'document.pdf',
    userAddress: account.address,
    sourceChainId: baseSepolia.id,
    sourceTokenSymbol: 'RUSD',
});
```

### Upload Browser File

```typescript
// In a web app
async function handleFileUpload(file: File) {
    const result = await storage.uploadFile({
        file: file,
        fileName: file.name,
        userAddress: userAddress,
        sourceChainId: chainId,
        sourceTokenSymbol: 'USDT',
    });
    
    console.log(`File uploaded! CommP: ${result.fileId}`);
}
```

### Download and Save

```typescript
const files = await storage.listFiles(userAddress);
const latestFile = files[0];

if (latestFile.commp) {
    const data = await storage.downloadFile(latestFile.commp);
    
    // In Node.js
    import { writeFileSync } from 'fs';
    writeFileSync(latestFile.fileName, data);
    
    // In browser
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = latestFile.fileName;
    a.click();
}
```

### Check Balance Before Upload

```typescript
const balance = await storage.getUserBalance(userAddress);
const balanceInUSDFC = BigInt(balance.balance) / BigInt(10 ** 18);

console.log(`Balance: ${balanceInUSDFC} USDFC`);

if (BigInt(balance.balance) < parseUnits('1', 18)) {
    console.log('Low balance - upload will trigger auto-bridge');
}

await storage.uploadFile({...});
```

## Configuration

### Constants

```typescript
import { 
    BRIDGE_AMOUNT_USDFC,       // 5 USDFC (default bridge amount)
    MINIMUM_BALANCE_THRESHOLD, // 1 USDFC (auto-bridge trigger)
    FILECOIN_CHAIN_ID          // 314 (Filecoin mainnet)
} from '@autofi/synapse';
```

### Backend URL

- **Development**: `http://localhost:3001`
- **Production**: Your deployed backend URL

## Limitations

### Current

- **Custodial**: Backend controls storage (requires trust)
- **Fixed bridge amount**: 5 USDFC per bridge (not dynamic)
- **No encryption**: Files stored in plaintext
- **File size limits**: Min 127 bytes, Max 200 MiB (Synapse SDK limits)
- **Testnet only**: Currently configured for Calibration testnet

### Roadmap

- [ ] Client-side encryption with user keys
- [ ] Dynamic pricing based on file size
- [ ] Account abstraction for decentralized custody
- [ ] Auto-rebalancing of backend wallet
- [ ] Mainnet support
- [ ] Multi-file batch uploads
- [ ] File sharing and access control

## Networks

### Supported Source Chains (Testnet)

- Base Sepolia (84532)
- Avalanche Fuji (43113)
- Arc Testnet (5042002)

### Target Chain

- Filecoin Calibration (314159)
- Filecoin Mainnet (314) - coming soon

### Supported Tokens

- **Testnet**: RUSD (OnlySwaps testnet token)
- **Mainnet**: USDT, USDC (coming soon)

## Troubleshooting

### "OnlySwaps not initialized"

Ensure you pass `walletClient`, `publicClient`, and `routerAddress` to the constructor.

### "BACKEND_FILECOIN_ADDRESS not configured"

The backend address should be returned from the backend status endpoint. For now, set it as an environment variable.

### "Insufficient balance"

User needs to wait for bridge completion or deposit more tokens.

### "Upload failed"

- Check backend is running
- Verify backend has USDFC and FIL for gas
- Check network connectivity

### "Failed to fetch user balance"

- Ensure backend URL is correct
- Check backend is accessible
- Verify CORS is enabled on backend

## Testing

Run the example:

```bash
cd sdk
npm install
npm run build

# Set environment variables
export PRIVATE_KEY=0x...
export BACKEND_URL=http://localhost:3001

# Run example
node dist/examples/synapse-storage.js
```

## Contributing

This is a hackathon project built for the Synapse SDK cross-chain bounty. Contributions welcome!

## License

MIT

