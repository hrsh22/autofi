# @autofi/synapse - Cross-Chain Filecoin Storage SDK

**Make Filecoin storage accessible from ANY blockchain.**

Built for the Synapse SDK Cross-Chain Bounty at the Filecoin hackathon.

## 🎯 Problem

The official Synapse SDK requires:
- ❌ User must have a Filecoin wallet
- ❌ User must have FIL tokens for gas
- ❌ User must be on Filecoin network
- ❌ Complex setup and payment management

## ✨ Solution

Our SDK provides a custodial middleware that:
- ✅ Users stay on their preferred chain (Base, Ethereum, etc.)
- ✅ No Filecoin wallet needed
- ✅ Pay with USDT/USDC (auto-converts to USDFC)
- ✅ One method call: `uploadFile()`
- ✅ Files stored on Filecoin with on-chain ownership metadata

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User on Base (with USDT)                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  @autofi/synapse SDK (Client)                           │
│  - Check user balance                                    │
│  - Auto-bridge if needed (OnlySwaps)                    │
│  - Upload file to backend                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Backend API (Express + SQLite)                         │
│  - Receive USDFC from bridge                            │
│  - Track user balances                                  │
│  - Upload to Filecoin via Synapse SDK                   │
│  - Deduct actual costs                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Filecoin Storage (via Synapse SDK)                     │
│  - Files stored with metadata (userAddress, fileName)   │
│  - Retrievable via CommP                                │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Start Backend

```bash
cd backend
npm install

# Setup environment
cp .env.example .env
# Add your FILECOIN_PRIVATE_KEY and BACKEND_FILECOIN_ADDRESS

# Initialize Synapse wallet
npm run setup-wallet

# Start server
npm run dev
```

Backend runs on `http://localhost:3001`

### 2. Use SDK

```bash
cd sdk
npm install
npm run build
```

```typescript
import { SynapseStorageClient } from '@autofi/synapse';

// Initialize
const storage = new SynapseStorageClient({
    backendUrl: 'http://localhost:3001',
    walletClient,
    publicClient,
    routerAddress,
});

// Upload file (auto-bridges if needed)
const result = await storage.uploadFile({
    file: fileData,
    fileName: 'hello.txt',
    userAddress: account.address,
    sourceChainId: 84532, // Base Sepolia
    sourceTokenSymbol: 'RUSD',
});

console.log('File uploaded! CommP:', result.fileId);

// List files
const files = await storage.listFiles(account.address);

// Download file
const data = await storage.downloadFile(files[0].commp);
```

## 📦 What's Included

### Client SDK (`sdk/src/synapse/`)

- **SynapseStorageClient**: Main client class
- **Auto-bridging**: Automatically bridges tokens when balance low
- **Balance management**: Track credits, deposits, spending
- **Simple API**: uploadFile(), listFiles(), downloadFile()

### Backend API (`backend/`)

- **Express server**: RESTful API
- **SQLite database**: User balances, files, purchases
- **Synapse integration**: Upload/download via @filoz/synapse-sdk
- **Cost tracking**: Query actual Synapse costs per upload
- **OnlySwaps webhook**: Credit user balance on bridge completion

### Key Features

1. **Deposit Once, Upload Multiple**: Users deposit 5 USDFC once, then upload files until balance exhausted
2. **Actual Cost Tracking**: Backend queries Synapse allowance before/after upload to calculate real cost
3. **On-Chain Ownership**: File metadata includes userAddress stored on Filecoin
4. **Auto-Recharge**: SDK auto-bridges when user balance drops below 1 USDFC

## 📊 Flow Diagram

### First Upload (with bridge)

```
User Balance: 0 USDFC
     ↓
SDK detects low balance → Bridge 5 USDFC to backend
     ↓
Wait for bridge completion (OnlySwaps.waitForExecution)
     ↓
Notify backend → Credit user +5 USDFC
     ↓
Upload file to backend
     ↓
Backend uploads to Synapse (cost: 0.1 USDFC)
     ↓
Deduct from user balance: 5 - 0.1 = 4.9 USDFC
     ↓
User Balance: 4.9 USDFC
```

### Subsequent Uploads (no bridge needed)

```
User Balance: 4.9 USDFC
     ↓
SDK checks balance → Sufficient
     ↓
Upload file directly to backend
     ↓
Backend uploads to Synapse (cost: 0.1 USDFC)
     ↓
Deduct from user balance: 4.9 - 0.1 = 4.8 USDFC
     ↓
User Balance: 4.8 USDFC
```

## 🔧 Technical Details

### Balance System

**Database Table: `user_balances`**
```sql
CREATE TABLE user_balances (
    user_address TEXT PRIMARY KEY,
    balance_usdfc TEXT NOT NULL,     -- Current credits
    total_deposited TEXT NOT NULL,   -- Lifetime deposits
    total_spent TEXT NOT NULL,       -- Lifetime spending
    last_updated INTEGER NOT NULL
);
```

**Operations:**
- `creditBalance()`: Add USDFC when bridge completes
- `deductBalance()`: Subtract actual Synapse cost after upload
- `getUserBalance()`: Check current balance

### Cost Calculation

```typescript
// Before upload
const allowanceBefore = await synapse.payments.getAllowance(backendAddress);

// Upload to Filecoin
await storage.upload(fileBuffer, { metadata: { userAddress, fileName } });

// After upload
const allowanceAfter = await synapse.payments.getAllowance(backendAddress);

// Calculate actual cost
const cost = allowanceBefore - allowanceAfter;
```

### File Metadata on Filecoin

```typescript
await storage.upload(fileBuffer, {
    metadata: {
        userAddress: '0x...',  // Ownership recorded on-chain
        fileName: 'test.txt'    // Original filename
    }
});
```

This ensures ownership is verifiable on Filecoin itself, not just in our database.

## 📝 API Endpoints

### Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/status` | Backend wallet status |
| GET | `/api/user/balance/:address` | Get user balance |
| POST | `/api/initiate-storage` | Upload file |
| POST | `/api/webhook/bridge-complete` | Credit user after bridge |
| GET | `/api/files/:userAddress` | List user files |
| GET | `/api/download/:commp` | Download file |

### SDK Methods

| Method | Description |
|--------|-------------|
| `uploadFile()` | Upload file (auto-bridges if needed) |
| `getUserBalance()` | Check user's credit balance |
| `listFiles()` | Get all user's files |
| `downloadFile()` | Download file by CommP |
| `getBackendStatus()` | Check backend health |

## 🧪 Testing

### Run Example

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Run SDK example
cd sdk
export PRIVATE_KEY=0x...
npm run build
node dist/examples/synapse-storage.js
```

### Manual Testing

```bash
# Check backend status
curl http://localhost:3001/api/status

# Get user balance
curl http://localhost:3001/api/user/balance/0xYourAddress

# Upload file
curl -X POST http://localhost:3001/api/initiate-storage \
  -F "file=@test.txt" \
  -F "userAddress=0xYourAddress" \
  -F "sourceChainId=84532"

# List files
curl http://localhost:3001/api/files/0xYourAddress

# Download file
curl http://localhost:3001/api/download/bafkzcib... -o downloaded.txt
```

## 🎯 Bounty Requirements

### ✅ Makes Synapse SDK Cross-Chain Compatible

1. **Users don't need Filecoin wallets** - Stay on preferred chain ✓
2. **Works from any chain** - Base, Ethereum, Arbitrum, etc. ✓
3. **No FIL required** - Backend handles all Filecoin interactions ✓
4. **Simple API** - One method call for upload ✓

### ✅ Innovation

- **Custodial middleware** architecture
- **OnlySwaps bridge integration** for seamless token conversion
- **Balance credit system** for efficient multi-upload
- **On-chain ownership** via Synapse metadata

### ✅ Production-Grade Code

- TypeScript with full type safety
- Error handling and validation
- Database-backed state management
- Clean separation of concerns
- Comprehensive documentation

## 📚 Documentation

- **[Backend Setup Guide](backend/SETUP.md)** - Wallet initialization
- **[Backend README](backend/README.md)** - API reference
- **[SDK README](sdk/README-synapse.md)** - SDK usage guide
- **[SDK Example](sdk/examples/synapse-storage.ts)** - Working example

## 🔮 Future Enhancements

### For Production

- [ ] Client-side encryption
- [ ] Dynamic pricing based on file size
- [ ] Account abstraction for non-custodial solution
- [ ] Auto-rebalancing of backend wallet
- [ ] Rate limiting and authentication
- [ ] Multi-file batch uploads
- [ ] File sharing and access control

### Mainnet Support

- [ ] Filecoin mainnet deployment
- [ ] Real USDT/USDC support
- [ ] Multiple storage provider selection
- [ ] Cost optimization strategies

## 🏆 Demo Script

### Setup (1 minute)

1. Show user on Base Sepolia with RUSD tokens
2. Show backend running with Synapse initialized
3. Show empty user balance (0 USDFC)

### Flow (2 minutes)

1. **Problem**: "Synapse requires Filecoin wallet. User doesn't have one."
2. **Upload**: User uploads 1MB file via SDK
   - SDK detects 0 balance
   - Auto-bridges 5 USDFC to backend
   - Backend credits user balance
   - File uploads to Filecoin via Synapse
   - Cost deducted: 4.9 USDFC remaining
3. **Status**: Show file with CommP in user's list
4. **Download**: Download file instantly from Filecoin
5. **Second Upload**: Upload another file (no bridge needed!)
   - Uses remaining 4.9 USDFC balance
   - Instant upload (no bridge delay)

### Emphasis (30 seconds)

- "**First cross-chain Synapse storage solution**"
- "**User never left Base, never needed FIL**"
- "**Custodial middleware abstracts ALL complexity**"
- "**Built in 2 days, production-ready architecture**"

## 👥 Team

Built by AutoFi for the Filecoin x Synapse SDK hackathon.

## 📄 License

MIT

---

**🚀 Making Filecoin storage accessible to EVERY blockchain user.**

