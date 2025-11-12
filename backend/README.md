# @filbridge/backend

Backend API for cross-chain Filecoin storage via Synapse SDK.

## Overview

This backend acts as a custodial middleware that:

- Receives tokens from users via OnlySwaps bridge
- Manages a pool of USDFC for Synapse storage payments
- Uploads files to Filecoin on behalf of users
- Tracks user balances and file ownership
- Provides file download proxying

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env` and fill in your Filecoin wallet details:

```bash
FILECOIN_PRIVATE_KEY=0x...
BACKEND_FILECOIN_ADDRESS=0x...
PORT=3001
NODE_ENV=development
DATABASE_PATH=./storage.db
```

### 3. Initialize Wallet

```bash
npm run setup-wallet
```

This will:

- Connect to Synapse SDK
- Deposit USDFC (if needed)
- Approve storage providers

### 4. Start Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

## API Endpoints

### GET /health

Health check endpoint.

**Response:**

```json
{
    "status": "ok",
    "timestamp": 1234567890
}
```

### GET /api/status

Backend status and Synapse wallet info.

**Response:**

```json
{
    "status": "healthy",
    "synapse": {
        "balance": "100000000000000000000",
        "allowance": "100000000000000000000"
    }
}
```

### GET /api/user/balance/:address

Get user's balance.

**Response:**

```json
{
    "userAddress": "0x...",
    "balance": "5000000000000000000",
    "totalDeposited": "5000000000000000000",
    "totalSpent": "0",
    "lastUpdated": 1234567890
}
```

### POST /api/initiate-storage

Upload a file. Automatically processes upload if user has sufficient balance.

**Request:**

- Content-Type: `multipart/form-data`
- Fields:
    - `file`: File to upload
    - `userAddress`: User's wallet address
    - `sourceChainId`: Source chain ID
    - `bridgeRequestId` (optional): Bridge transaction ID
    - `amountBridged` (optional): Amount bridged

**Response:**

```json
{
    "fileId": "uuid",
    "purchaseId": "uuid",
    "status": "completed",
    "message": "File uploaded successfully"
}
```

### POST /api/webhook/bridge-complete

Webhook to notify backend of completed bridge.

**Request:**

```json
{
    "bridgeRequestId": "0x...",
    "userAddress": "0x...",
    "amount": "5000000000000000000"
}
```

**Response:**

```json
{
    "success": true,
    "message": "Balance credited successfully"
}
```

### GET /api/files/:userAddress

List all files for a user.

**Response:**

```json
{
    "files": [
        {
            "id": "uuid",
            "fileName": "test.txt",
            "fileSize": 1024,
            "fileHash": "sha256...",
            "commp": "bafkzcib...",
            "providerId": "0x...",
            "cost": "100000000000000000",
            "uploadedAt": 1234567890
        }
    ]
}
```

### GET /api/download/:commp

Download a file by its CommP.

**Response:**
Binary file data with appropriate headers.

## Architecture

### Database Schema

**user_balances**: Track user credit balances

- `user_address` (PRIMARY KEY)
- `balance_usdfc`: Current balance
- `total_deposited`: Lifetime deposits
- `total_spent`: Lifetime spending
- `last_updated`: Last update timestamp

**storage_purchases**: Track bridge transactions

- `id` (PRIMARY KEY)
- `user_address`: User's wallet
- `source_chain_id`: Source chain
- `bridge_request_id`: OnlySwaps bridge ID
- `amount_bridged`: Amount in USDFC
- `status`: pending | bridging | completed | failed
- `created_at`, `updated_at`: Timestamps

**user_files**: Track uploaded files

- `id` (PRIMARY KEY)
- `user_address`: File owner
- `file_name`: Original filename
- `file_size`: Size in bytes
- `file_hash`: SHA256 hash
- `commp`: Filecoin CommP (content identifier)
- `provider_id`: Storage provider address
- `cost_usdfc`: Actual cost
- `uploaded_at`: Upload timestamp

**wallet_state**: Key-value store for backend state

### Services

**SynapseService**: Wraps @filoz/synapse-sdk

- Initialize connection to Filecoin
- Upload files with metadata
- Download files by CommP
- Check balance and allowances

**UploadService**: Handle file upload processing

- Validate user balance
- Calculate actual Synapse costs
- Update database records
- Deduct costs from user balance

**Database**: SQLite access layer

- User balance operations (credit, deduct, query)
- Storage purchase tracking
- File metadata management
- Wallet state persistence

## Development

### Project Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── database.ts      # Database access layer
│   │   └── schema.sql       # SQLite schema
│   ├── routes/
│   │   └── storage.ts       # API routes
│   ├── services/
│   │   ├── synapse.ts       # Synapse SDK wrapper
│   │   └── upload.ts        # Upload processing
│   ├── scripts/
│   │   └── setup-wallet.ts  # Wallet initialization
│   └── server.ts            # Main server
├── package.json
├── tsconfig.json
├── SETUP.md                 # Detailed setup guide
└── README.md                # This file
```

### Testing

Test the API with curl:

```bash
# Health check
curl http://localhost:3001/health

# Backend status
curl http://localhost:3001/api/status

# User balance
curl http://localhost:3001/api/user/balance/0x...

# Upload file
curl -X POST http://localhost:3001/api/initiate-storage \
  -F "file=@test.txt" \
  -F "userAddress=0x..." \
  -F "sourceChainId=84532"

# List files
curl http://localhost:3001/api/files/0x...

# Download file
curl http://localhost:3001/api/download/bafkzcib... -o downloaded.txt
```

## Production Deployment

### Environment Variables

Ensure all required environment variables are set:

- `FILECOIN_PRIVATE_KEY`: Backend wallet private key (keep secure!)
- `BACKEND_FILECOIN_ADDRESS`: Backend wallet address
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: production
- `DATABASE_PATH`: Path to SQLite database
