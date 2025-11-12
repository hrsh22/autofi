# Simplified Architecture: Pay-Per-Upload Model

## What Changed

**Before**: Complex balance system with credits, deposits, and balance tracking  
**After**: Simple pay-per-upload model - 0.1 USDFC per file

## New Flow

```
User wants to upload file
    ↓
SDK bridges 0.1 USDFC from user wallet → backend wallet (OnlySwaps)
    ↓
SDK waits for bridge completion
    ↓
SDK uploads file to backend with bridgeRequestId
    ↓
Backend uploads file to Filecoin (Synapse SDK)
    ↓
Backend stores file metadata with payment info
    ↓
User can download file anytime
```

## Key Simplifications

### 1. No Balance Tracking

**Removed:**

- `user_balances` table
- `storage_purchases` table
- Balance credit/debit operations
- Balance check endpoint
- Webhook endpoint

**Kept:**

- `user_files` table only
- File metadata tracking
- Download functionality

### 2. Direct Payment Per Upload

**Before:**

- Deposit 5 USDFC once
- Track balance
- Deduct costs per upload
- Re-deposit when low

**After:**

- Bridge 0.1 USDFC per upload
- No balance to track
- No re-deposit logic
- Simple and predictable

### 3. Simplified Database

**New schema:**

```sql
CREATE TABLE user_files (
    id TEXT PRIMARY KEY,
    user_address TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT NOT NULL,
    commp TEXT,                      -- Filecoin content ID
    provider_id TEXT,                 -- Storage provider
    bridge_request_id TEXT,           -- OnlySwaps transaction ID
    payment_amount TEXT,              -- 0.1 USDFC per upload
    uploaded_at INTEGER
);
```

Just one table tracking files with their payment info.

## Updated API

### Backend Endpoints

**Removed:**

- ❌ `GET /api/user/balance/:address`
- ❌ `POST /api/webhook/bridge-complete`

**Kept:**

- ✅ `POST /api/initiate-storage` - Upload file (now requires bridgeRequestId)
- ✅ `GET /api/files/:userAddress` - List files
- ✅ `GET /api/download/:commp` - Download file
- ✅ `GET /api/status` - Health check
- ✅ `GET /health` - Server health

### SDK Methods

**Removed:**

- ❌ `getUserBalance()`

**Kept:**

- ✅ `uploadFile()` - Upload with auto-bridge
- ✅ `listFiles()` - List user's files
- ✅ `downloadFile()` - Download by CommP
- ✅ `getBackendStatus()` - Health check

## Upload Flow Details

### 1. SDK Side

```typescript
async uploadFile(params: UploadFileParams): Promise<UploadResult> {
  // Step 1: Bridge 0.1 USDFC to backend
  const bridge = await this.bridgePayment({
    userAddress,
    sourceChainId,
    sourceTokenSymbol, // USDT or RUSD
  });

  // Step 2: Wait for bridge completion
  await onlySwaps.waitForExecution(bridge.requestId);

  // Step 3: Upload file with bridge proof
  const formData = new FormData();
  formData.append('file', fileBlob);
  formData.append('userAddress', userAddress);
  formData.append('bridgeRequestId', bridge.requestId);
  formData.append('paymentAmount', '0.1 USDFC');

  const response = await fetch('/api/initiate-storage', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}
```

### 2. Backend Side

```typescript
async initiateUpload() {
  // Validate bridge payment was made
  if (!bridgeRequestId || !paymentAmount) {
    throw new Error('Payment required');
  }

  // Upload to Filecoin immediately
  const result = await synapse.uploadFile(fileBuffer, userAddress, fileName);

  // Store file metadata with payment info
  await db.createUserFile({
    commp: result.commp,
    bridge_request_id: bridgeRequestId,
    payment_amount: paymentAmount,
    ...
  });
}
```

## Benefits

### Simpler

- ✅ No balance tracking database tables
- ✅ No credit/debit operations
- ✅ No balance reconciliation logic
- ✅ Fewer API endpoints
- ✅ Easier to understand

### More Predictable

- ✅ Fixed cost: 0.1 USDFC per upload
- ✅ No balance state to maintain
- ✅ No "insufficient balance" errors
- ✅ Payment happens per upload (pay-as-you-go)

### Easier to Debug

- ✅ Each file has its bridge transaction ID
- ✅ Direct 1:1 mapping: upload → payment
- ✅ No complex balance state
- ✅ Fewer failure modes

## Cost Comparison

### Old Model

- Bridge: 5 USDFC once
- Upload 10 files: 0 additional bridges
- Total bridges: 1
- User experience: Deposit upfront, use credits

### New Model

- Bridge: 0.1 USDFC per file
- Upload 10 files: 10 bridges
- Total bridges: 10
- User experience: Pay per use

**Trade-off:**

- More bridge transactions (higher OnlySwaps fees)
- But simpler architecture and no balance management

For hackathon demo: Simpler is better!

## Configuration

### Constants

```typescript
// Payment per upload
export const PAYMENT_PER_UPLOAD_USDFC = parseUnits("0.1", 18); // 0.1 USDFC

// Filecoin chain
export const FILECOIN_CHAIN_ID = 314;
```

### Environment Variables

**Backend:**

```bash
FILECOIN_PRIVATE_KEY=0x...
BACKEND_FILECOIN_ADDRESS=0x...
FILECOIN_RPC_URL=wss://api.node.glif.io/rpc/v1  # Must be WebSocket!
PORT=3001
DATABASE_PATH=./storage.db
```

**SDK:**

```bash
# For examples/testing only
BACKEND_FILECOIN_ADDRESS=0x...  # Backend wallet address
PRIVATE_KEY=0x...               # User's private key
BACKEND_URL=http://localhost:3001
```

## Important Notes

### WebSocket RPC Required

Filecoin **requires WebSocket** RPC URLs:

- ✅ `wss://api.node.glif.io/rpc/v1` (mainnet)
- ✅ `wss://api.calibration.node.glif.io/rpc/v1` (testnet)
- ❌ `https://rpc.ankr.com/filecoin` (doesn't work for contract calls)

The code now auto-converts HTTPS to WSS and validates the protocol.

### Synapse SDK API

Key method signatures discovered:

- `Synapse.create({ privateKey, rpcURL })` - Initialize
- `synapse.getNetwork()` - Returns 'mainnet' | 'calibration'
- `synapse.payments.accountInfo()` - No params, uses signer's address
- `storage.upload(buffer, { metadata })` - Returns { pieceCid, ... }
- `result.pieceCid.toString()` - Get CommP string

### Payment Verification

The backend currently trusts the bridgeRequestId from the SDK. For production:

- Verify the bridge actually happened
- Check the recipient matches backend address
- Validate the amount is correct
- Query OnlySwaps contracts to confirm

For hackathon: Trust-based is fine.

## Testing

### 1. Start Backend

```bash
cd backend
npm install
npm run build

# Make sure .env has:
# - FILECOIN_PRIVATE_KEY
# - BACKEND_FILECOIN_ADDRESS
# - FILECOIN_RPC_URL=wss://api.node.glif.io/rpc/v1

npm run dev
```

### 2. Test Upload

```bash
cd sdk
npm run build

# Update examples/synapse-storage.ts with your private key
node dist/examples/synapse-storage.js
```

### 3. Verify

```bash
# Check backend status
curl http://localhost:3001/api/status

# List user files
curl http://localhost:3001/api/files/0xYourAddress

# Download file
curl http://localhost:3001/api/download/bafkzcib... -o file.txt
```

## Files Modified

### Backend

- ✅ `src/db/schema.sql` - Simplified to 1 table
- ✅ `src/db/database.ts` - Removed balance operations
- ✅ `src/services/upload.ts` - Removed balance checking
- ✅ `src/routes/storage.ts` - Removed balance endpoints
- ✅ `src/services/synapse.ts` - Fixed accountInfo() calls
- ✅ `src/scripts/setup-wallet.ts` - Added network detection (deleted by user)

### SDK

- ✅ `src/synapse/constants.ts` - Changed to 0.1 USDFC per upload
- ✅ `src/synapse/types.ts` - Removed balance interfaces
- ✅ `src/synapse/client.ts` - Simplified to bridge per upload
- ✅ `examples/synapse-storage.ts` - Updated example

## Summary

The architecture is now **much simpler**:

- Pay 0.1 USDFC per upload (bridged on-demand)
- No balance tracking or state management
- Single database table for file metadata
- Fewer API endpoints
- Easier to test and debug

This is perfect for a hackathon demo! 🎉
