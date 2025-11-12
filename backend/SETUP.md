# Backend Wallet Setup Guide

This guide walks you through setting up the backend wallet for the cross-chain Filecoin storage system.

## Prerequisites

- Node.js 20+ installed
- Access to Filecoin Calibration testnet (for testing)
- Testnet FIL for gas fees
- Testnet USDFC tokens

## Step 1: Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Your Filecoin wallet private key (keep this secret!)
FILECOIN_PRIVATE_KEY=0x...

# Your Filecoin wallet address
BACKEND_FILECOIN_ADDRESS=0x...

# Server port
PORT=3001

# Node environment
NODE_ENV=development

# Database path
DATABASE_PATH=./storage.db
```

### Getting a Filecoin Wallet

If you don't have a Filecoin wallet yet, you can generate one using ethers:

```javascript
import { ethers } from 'ethers';

const wallet = ethers.Wallet.createRandom();
console.log('Private Key:', wallet.privateKey);
console.log('Address:', wallet.address);
```

**⚠️ Security Warning**: Never commit your private key to git. The `.env` file should be in `.gitignore`.

## Step 2: Fund Your Wallet

### Get Testnet FIL

1. Visit the Filecoin Calibration faucet: https://faucet.calibration.fildev.network/
2. Enter your wallet address
3. Request testnet FIL (needed for gas fees)

### Get Testnet USDFC

You'll need USDFC tokens to interact with Synapse SDK. You can:

1. Bridge testnet USDT to Filecoin using OnlySwaps testnet
2. Or contact the Synapse team for testnet USDFC tokens

## Step 3: Install Dependencies

```bash
cd backend
npm install
```

## Step 4: Initialize Synapse SDK

Create and run the wallet setup script to deposit USDFC and approve Synapse service:

```bash
npm run setup-wallet
```

This script will:
1. Connect to Synapse SDK
2. Deposit 100 USDFC into Synapse payments contract
3. Approve Pandora service provider with allowances:
   - Rate: 50 USDFC per epoch
   - Lockup: 5000 USDFC total

### Manual Setup (if script fails)

If the automated script doesn't work, you can manually initialize Synapse:

```typescript
import { Synapse } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

const synapse = await Synapse.create({
  privateKey: process.env.FILECOIN_PRIVATE_KEY,
  rpcURL: 'wss://api.calibration.node.glif.io/rpc/v1',
});

// Deposit USDFC
const USDFC_ADDRESS = '0x...'; // Calibration USDFC token address
await synapse.payments.deposit(
  ethers.parseUnits('100', 18),
  USDFC_ADDRESS
);

// Approve Pandora service
const PANDORA_ADDRESS = '0x...'; // Get from Synapse docs
await synapse.payments.approveService(
  PANDORA_ADDRESS,
  ethers.parseUnits('50', 18),   // 50 USDFC per epoch
  ethers.parseUnits('5000', 18)  // 5000 USDFC lockup
);
```

## Step 5: Start the Backend Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## Step 6: Verify Setup

Check the backend status:

```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":...}

curl http://localhost:3001/api/status
# Should return Synapse balance and allowance info
```

## Monitoring Your Backend Wallet

### Check Balance

The backend will log its balance on startup. You can also check it via:

```bash
curl http://localhost:3001/api/status
```

This returns:
```json
{
  "status": "healthy",
  "synapse": {
    "balance": "100000000000000000000",  // 100 USDFC in wei
    "allowance": "100000000000000000000"
  }
}
```

### When to Refill

Monitor the backend wallet balance periodically. When it runs low:

1. Bridge more USDFC to your backend wallet
2. Run the deposit script again to add funds to Synapse

## Troubleshooting

### "Insufficient balance" errors

- Check that you have FIL for gas: `cast balance $BACKEND_FILECOIN_ADDRESS --rpc-url https://api.calibration.node.glif.io/rpc/v1`
- Check that you have USDFC tokens in your wallet
- Verify Synapse deposit was successful

### "Synapse SDK not initialized" errors

- Ensure your private key is correct and has the `0x` prefix
- Verify you're connected to the correct network (calibration testnet)
- Check that the RPC URL is accessible

### Database errors

- Ensure the DATABASE_PATH directory exists and is writable
- Delete `storage.db` and restart to reset the database

## Production Considerations

For production deployment:

1. **Use a dedicated wallet**: Don't use a personal wallet
2. **Secure private keys**: Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
3. **Monitor balance**: Set up alerts when balance drops below threshold
4. **Auto-rebalancing**: Implement automated refilling when balance is low
5. **Rate limiting**: Add rate limits to prevent abuse
6. **Authentication**: Add API authentication (currently open for hackathon demo)

## Network Configuration

### Calibration Testnet (Default)

- Chain ID: 314159
- RPC: `wss://api.calibration.node.glif.io/rpc/v1`
- Faucet: https://faucet.calibration.fildev.network/

### Filecoin Mainnet

- Chain ID: 314
- RPC: `wss://api.node.glif.io/rpc/v1`
- Update RPC URL in `backend/src/services/synapse.ts`

## Support

If you encounter issues:

1. Check the backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure you have sufficient testnet tokens
4. Consult Synapse SDK documentation: https://synapse-sdk-docs.netlify.app/

## Next Steps

Once your backend is running:

1. Test with the SDK: See `sdk/examples/` for usage examples
2. Deploy the backend to a server (Railway, Render, etc.)
3. Update `backendUrl` in SDK client configuration to point to your deployed backend

