# FilBridge - Test Scripts

This folder contains scripts to demonstrate and test the credit-based Filecoin storage system.

## Overview

The filbridge SDK provides a credit-based system for storing files on Filecoin from any blockchain. Users fund their account once with USDFC, then use those credits to upload files. Storage costs are calculated using Synapse SDK's exact formula based on file size and storage duration.

## Credit System

### How It Works

1. **Fund Credits**: Bridge USDFC from your wallet (e.g., Base + USDT) to the backend wallet
2. **Upload Files**: Each upload deducts credits based on file size and storage duration
3. **Transparent Costs**: Costs calculated using Synapse's formula: `(fileSize × bytesRate × durationEpochs) + (fileSize × bytesLockup)`

### Cost Calculation

```
totalCost = (fileSize × bytesRate × durationEpochs) + (fileSize × bytesLockup)

Where:
- fileSize: File size in bytes
- bytesRate: Ongoing cost per byte per epoch
- durationEpochs: Storage duration (days × 2880 epochs/day)
- bytesLockup: Upfront deposit per byte (returned when storage ends)
```

## Prerequisites

### 1. Backend Running

```bash
cd ../backend
npm run dev
```

Backend should be healthy on `http://localhost:3001`

### 2. SDK Built

```bash
cd ../sdk
npm run build
```

### 3. Environment Setup

Create a `.env` file in the `test` folder:

```bash
# Your Base wallet private key (must have RUSD for funding)
BASE_SEPOLIA_PRIVATE_KEY=0x...
```

### 4. Wallet Funded

Your wallet needs:

- **Base mainnet RUSD** (for funding credits + OnlySwaps fees)
- **Base ETH** (for gas fees)

## Available Scripts

### 1. Fund Credits

Bridge USDFC to fund your credit account:

```bash
npm run fund-credits -- <amount_in_usdfc>
```

**Example:**

```bash
npm run fund-credits -- 1.5
```

This bridges 1.5 USDFC worth of tokens from your Base wallet.

**Direct usage:**

```bash
tsx fund-credits.ts 1.5
```

### 2. Check Credits

View your credit balance and transaction history:

```bash
npm run check-credits -- [user_address]
```

**Examples:**

```bash
# Use address from env
npm run check-credits

# Specify address
npm run check-credits -- 0xYOUR_ADDRESS
```

**Output:**

- Current balance (in wei and USDFC)
- Transaction history (deposits and deductions)

### 3. Upload File

Upload a file to Filecoin using your credits:

```bash
npm run upload-file -- <file_path> [storage_duration_days]
```

**Examples:**

```bash
# Upload for 30 days (default)
npm run upload-file -- ./test-upload.json

# Upload for 90 days
npm run upload-file -- ./test-upload.json 90
```

**Features:**

- Shows estimated cost before upload
- Checks credit balance
- Fails gracefully if insufficient credits
- Shows remaining balance after upload

### 4. List Files

List all files uploaded by a user:

```bash
npm run list-files -- <user_address>
```

**Example:**

```bash
npm run list-files -- 0xYOUR_ADDRESS
```

**Shows:**

- File name and size
- Storage duration and cost
- CommP (Filecoin piece CID)
- Provider ID
- Upload timestamp

### 5. Download File

Download a file from Filecoin by its CommP:

```bash
npm run download-file -- <commp> [output_path]
```

**Examples:**

```bash
# Preview only
npm run download-file -- baga6ea4cf...

# Save to file
npm run download-file -- baga6ea4cf... ./downloaded.json

# Save to directory
npm run download-file -- baga6ea4cf... ./downloads/
```

### 6. Backend Status

Check backend health and Synapse balance:

```bash
npm run status
```

Shows:

- Backend status (healthy/unhealthy)
- Synapse balance
- Synapse allowance

### 7. Full Demo

Complete end-to-end demo (not yet updated for credit system):

```bash
npm run demo
```

## Typical Workflow

### First Time Setup

1. **Fund your account:**

    ```bash
    npm run fund-credits -- 2.0
    ```

2. **Check balance:**
    ```bash
    npm run check-credits
    ```

### Upload Files

1. **Upload a file:**

    ```bash
    npm run upload-file -- ./my-file.json 30
    ```

2. **List your files:**

    ```bash
    npm run list-files -- 0xYOUR_ADDRESS
    ```

3. **Download a file:**
    ```bash
    npm run download-file -- <commp> ./my-file-downloaded.json
    ```

### Monitor Usage

1. **Check remaining balance:**

    ```bash
    npm run check-credits
    ```

2. **View transaction history:**
    ```bash
    npm run check-credits -- 0xYOUR_ADDRESS
    ```

## Environment Variables

All scripts support these environment variables:

- `BASE_SEPOLIA_PRIVATE_KEY`: Your wallet private key (required for funding and uploading)

## Troubleshooting

### "Insufficient credits"

You need to fund your account:

```bash
npm run fund-credits -- 1.0
```

Check status:

```bash
npm run status
```

### "File not found after upload"

The file might still be processing on Filecoin. Wait a few seconds and try listing files again.

## Cost Examples

Assuming placeholder rates (update with actual Synapse mainnet values):

- `BYTES_RATE`: 100 wei per byte per epoch
- `BYTES_LOCKUP`: 1000 wei per byte
- `EPOCHS_PER_DAY`: 2880 epochs

**Example: 1 KB file for 30 days**

```
File size: 1024 bytes
Duration: 30 days × 2880 epochs/day = 86,400 epochs

Rate cost: 1024 × 100 × 86,400 = 8,847,360,000 wei
Lockup cost: 1024 × 1000 = 1,024,000 wei
Total: 8,848,384,000 wei ≈ 0.0000088 USDFC
```

## Files in This Folder

- `demo.ts` - Full end-to-end demo
- `fund-credits.ts` - Fund your credit account
- `check-credits.ts` - Check balance and history
- `upload-file.ts` - Upload files using credits
- `list-files.ts` - List user's files
- `download-file.ts` - Download files by CommP
- `status.ts` - Check backend status
