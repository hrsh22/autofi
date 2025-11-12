# AutoFi

Exports (single package with subpaths):

- `@autofi` (core types, errors, env/network config)
- `@autofi/onlyswaps` (OnlySwaps: routes, preflight, estimation, service)
- `@autofi/filecoin` (Synapse + pin client)
- `@autofi/sdk` (orchestrators)
- `@autofi/agent` (user-run agent)

## Environment

- `AUTOFI_ENV` = `development` | `production`
- Pinning: `PIN_ENDPOINT`, `PIN_TOKEN`
- Agent PK/RPC (optional when not injecting clients):
    - `PRIVATE_KEY`, `BASE_RPC_URL`, `FILECOIN_RPC_URL`

Network modes:

- Development: testnets; OnlySwaps supports RUSD routes only; Filecoin Calibration purchases supported via `purchase-only` mode if pre-funded.
- Production: mainnets; OnlySwaps uses mapped tokens (e.g., Base USDT ↔ Filecoin USDFC).

References:

- OnlySwaps networks/tokens: [docs.dcipher.network/networks/onlyswaps](https://docs.dcipher.network/networks/onlyswaps)
- OnlySwaps intro: [docs.dcipher.network/applications/onlyswaps/introduction/](https://docs.dcipher.network/applications/onlyswaps/introduction/)
- Filecoin Onchain Cloud: [synapse.filecoin.services/intro/about/](https://synapse.filecoin.services/intro/about/)

## Quickstart

Install (workspace root):

```bash
npm install
npm run build
```

Use orchestrator:

```ts
import { StorageTopUpOrchestrator } from "@autofi/sdk";
import { PinClient } from "@autofi/filecoin";

const orchestrator = new StorageTopUpOrchestrator();
const pin = new PinClient({ endpoint: process.env.PIN_ENDPOINT!, token: process.env.PIN_TOKEN! });

const plan = await orchestrator.run({
    env: (process.env.AUTOFI_ENV as "development" | "production") ?? "development",
    mode: "purchase-only", // dev on Calibration; use 'full' when OnlySwaps route is supported
    reason: "capacity-topup",
    tokenSymbol: "RUSD",
    srcChainId: 84532,
    dstChainId: 43113,
    amount: 1000000000000000000n,
    owner: "0x0000000000000000000000000000000000000000",
    // wire your implementations:
    // createIntent, waitForFulfillment, purchaseStorage
    // @ts-expect-error example only
    createIntent: async () => ({ intentId: "demo", srcChainId: 84532, dstChainId: 43113, tokenSymbol: "RUSD", amount: 1n }),
    // @ts-expect-error example only
    purchaseStorage: async (req) => ({ txHash: "0x", gbPurchased: req.gb }),
    purchaseGb: 5,
    pin,
    dryRun: true
});
console.log(plan);
```

Run agent on user machine:

```ts
import { AutoFiAgent } from "@autofi/agent";

const agent = new AutoFiAgent({
    privateKey: process.env.PRIVATE_KEY!,
    env: (process.env.AUTOFI_ENV as "development" | "production") ?? "development",
    rpc: { base: process.env.BASE_RPC_URL!, filecoin: process.env.FILECOIN_RPC_URL! },
    policy: { storageThreshold: 0.9, purchaseAmount: 5 }
});
agent.start();
```

## Build

```bash
npm run build
```

## License

MIT
