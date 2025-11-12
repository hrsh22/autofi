# Frontend Demo: Synapse SDK (Testnet)

Classic demo UI that showcases using our SDK from a user's wallet on testnet:

- Connect wallet (Base Sepolia)
- Fund credits (use OnlySwaps to convert ERC20 tokens to USDFC)
- Upload a file with duration and cost estimate (Synapse formula)
- List and download files stored on Filecoin Calibration

## Prerequisites

- Backend running locally: `http://localhost:3001`
- SDK built at `../sdk/dist`
- Testnet:
    - Source: Base Sepolia (84532) with RUSD
    - Destination: Filecoin Calibration (314159)

## Setup

```bash
# from repo root (ensure SDK is built)
cd sdk && npm run build

# then in frontend
cd ../frontend
npm install
cp .env.local.example .env.local # then edit values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Env Vars

Create `frontend/.env.local`:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
```
