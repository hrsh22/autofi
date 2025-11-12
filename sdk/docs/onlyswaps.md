# OnlySwaps SDK Documentation

The `@autofi/onlyswaps` module provides a type-safe, developer-friendly SDK for executing cross-chain token swaps using the OnlySwaps protocol. This SDK wraps `onlyswaps-js` and provides enhanced type safety, route discovery, and simplified APIs.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Type Safety](#type-safety)
- [API Reference](#api-reference)
- [Supported Chains & Tokens](#supported-chains--tokens)
- [Examples](#examples)
- [Error Handling](#error-handling)

## Overview

OnlySwaps is a trustless, intent-based cross-chain transfer protocol that uses BLS threshold signatures for verification. The SDK provides:

- **Type-safe APIs** with full TypeScript support and IDE autocomplete
- **Route discovery** to find supported swap pairs
- **Symbol-based swapping** - no need to manually resolve token addresses
- **Automatic token mapping** for cross-chain swaps
- **Execution polling** to wait for swap completion
- **Comprehensive error handling** with helpful messages

## Installation

```bash
npm install @autofi
```

The SDK uses `viem` for blockchain interactions and `onlyswaps-js` internally. Both are included as dependencies.

## Quick Start

```typescript
import { OnlySwapsService, getRouterAddress, CHAIN_MAP, OnlySwapsChainId, OnlySwapsTokenSymbol } from "@autofi/onlyswaps";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// 1. Set up viem clients
const account = privateKeyToAccount("0x...");
const sourceChain = CHAIN_MAP[84532]; // Base Sepolia
const publicClient = createPublicClient({
    chain: sourceChain,
    transport: http("https://sepolia.base.org")
});
const walletClient = createWalletClient({
    account,
    chain: sourceChain,
    transport: http("https://sepolia.base.org")
});

// 2. Create service
const routerAddress = getRouterAddress(84532);
const onlySwaps = new OnlySwapsService({
    publicClient: publicClient as any,
    walletClient: walletClient as any,
    routerAddress: routerAddress!
});

// 3. Execute swap by symbol
const fees = await onlySwaps.fetchRecommendedFeesBySymbol({
    env: "testnet",
    srcChainId: 84532,
    dstChainId: 43113,
    tokenSymbol: "RUSD",
    amount: 1000000000000000000n // 1 RUSD
});

const result = await onlySwaps.swapBySymbol({
    env: "testnet",
    srcChainId: 84532,
    dstChainId: 43113,
    tokenSymbol: "RUSD",
    amount: 1000000000000000000n,
    recipient: account.address,
    solverFee: fees.solverFee
});

console.log("Swap request ID:", result.requestId);
```

## Type Safety

The SDK provides strong TypeScript types for better developer experience:

### Chain IDs

```typescript
import type { OnlySwapsChainId, MainnetChainId, TestnetChainId } from "@autofi/onlyswaps";

// Type-safe chain IDs
const mainnetChain: MainnetChainId = 8453; // ✅ Base
const testnetChain: TestnetChainId = 84532; // ✅ Base Sepolia
const invalid: OnlySwapsChainId = 999; // ❌ Type error
```

### Token Symbols

```typescript
import type { OnlySwapsTokenSymbol } from "@autofi/onlyswaps";

// Type-safe token symbols
const token: OnlySwapsTokenSymbol = "USDT"; // ✅
const invalid: OnlySwapsTokenSymbol = "BTC"; // ❌ Type error
```

### Chain Map

```typescript
import { CHAIN_MAP } from "@autofi/onlyswaps";

// Type-safe chain lookup
const chain = CHAIN_MAP[84532]; // Returns viem Chain for Base Sepolia
```

## API Reference

### OnlySwapsService

The main service class for executing swaps.

#### Constructor

```typescript
new OnlySwapsService(config: OnlySwapsServiceConfig)
```

**Parameters:**

- `config.publicClient: PublicClient` - viem public client with chain configured
- `config.walletClient: WalletClient` - viem wallet client with account and chain
- `config.routerAddress: \`0x${string}\`` - Router contract address for the source chain

**Example:**

```typescript
const service = new OnlySwapsService({
    publicClient,
    walletClient,
    routerAddress: "0xC69DD549B037215BA1Ea9866FFa59603862bf986"
});
```

#### Methods

##### `fetchRecommendedFees(params: FetchFeesParams): Promise<FetchFeesResult>`

Fetch recommended fees for a swap using token addresses.

**Parameters:**

```typescript
{
    srcChainId: number;
    dstChainId: number;
    srcToken: `0x${string}`;
    dstToken: `0x${string}`;
    amount: bigint;
}
```

**Returns:**

```typescript
{
    solverFee: bigint;
    networkFee: bigint;
    totalFee: bigint;
    transferAmount: bigint;
    approvalAmount: bigint;
}
```

##### `fetchRecommendedFeesBySymbol(params): Promise<FetchFeesResult>`

Fetch recommended fees using token symbols (automatically resolves addresses).

**Parameters:**

```typescript
{
    env: "testnet" | "mainnet";
    srcChainId: number;
    dstChainId: number;
    tokenSymbol: OnlySwapsTokenSymbol;
    amount: bigint;
}
```

**Example:**

```typescript
const fees = await service.fetchRecommendedFeesBySymbol({
    env: "testnet",
    srcChainId: 84532,
    dstChainId: 43113,
    tokenSymbol: "RUSD",
    amount: 1000000000000000000n
});
```

##### `swap(params: SwapParams): Promise<SwapResult>`

Execute a cross-chain swap using token addresses.

**Parameters:**

```typescript
{
    srcChainId: number;
    dstChainId: number;
    srcToken: `0x${string}`;
    dstToken: `0x${string}`;
    amount: bigint;
    recipient: `0x${string}`;
    solverFee: bigint;
}
```

**Returns:**

```typescript
{
    requestId: `0x${string}`;
}
```

##### `swapBySymbol(params): Promise<SwapResult>`

Execute a cross-chain swap using token symbols (automatically resolves addresses).

**Parameters:**

```typescript
{
    env: "testnet" | "mainnet";
    srcChainId: number;
    dstChainId: number;
    tokenSymbol: OnlySwapsTokenSymbol;
    amount: bigint;
    recipient: `0x${string}`;
    solverFee: bigint;
}
```

**Example:**

```typescript
const result = await service.swapBySymbol({
    env: "testnet",
    srcChainId: 84532,
    dstChainId: 43113,
    tokenSymbol: "RUSD",
    amount: 1000000000000000000n,
    recipient: "0x...",
    solverFee: fees.solverFee
});
```

##### `fetchRequestParams(requestId): Promise<RequestParams>`

Fetch request parameters and execution status.

**Parameters:**

- `requestId: \`0x${string}\`` - Swap request ID

**Returns:**

```typescript
{
    sender: `0x${string}`;
    recipient: `0x${string}`;
    tokenIn: `0x${string}`;
    tokenOut: `0x${string}`;
    amountIn: bigint;
    amountOut: bigint;
    srcChainId: number;
    dstChainId: number;
    verificationFee: bigint;
    solverFee: bigint;
    executed: boolean; // true when verified by dcipher committee
    requestedAt: Date;
}
```

##### `fetchFulfillmentReceipt(requestId): Promise<FulfillmentReceipt>`

Fetch fulfillment receipt (solver completion status).

**Parameters:**

- `requestId: \`0x${string}\`` - Swap request ID

**Returns:**

```typescript
{
    requestId: `0x${string}`;
    fulfilled: boolean; // true when solver completed transfer
    solver?: `0x${string}`;
    recipient?: `0x${string}`;
    amountOut?: bigint;
    fulfilledAt?: Date;
}
```

##### `waitForExecution(requestId, options?): Promise<{ params, fulfillment }>`

Wait for swap execution (dcipher committee verification) by polling.

**Parameters:**

- `requestId: \`0x${string}\`` - Swap request ID
- `options.timeoutMs?: number` - Timeout in milliseconds (default: 300000 = 5 minutes)
- `options.intervalMs?: number` - Polling interval in milliseconds (default: 5000 = 5 seconds)
- `options.onProgress?: (status) => void` - Progress callback

**Returns:**

```typescript
{
    params: RequestParams;
    fulfillment: FulfillmentReceipt;
}
```

**Example:**

```typescript
const result = await service.waitForExecution(requestId, {
    timeoutMs: 300000,
    intervalMs: 5000,
    onProgress: (status) => {
        console.log(`Elapsed: ${status.elapsed}ms, Executed: ${status.executed}`);
    }
});
```

### Discovery Functions

#### `listSupportedPairs(env): SupportedPair[]`

List all supported swap pairs for the given environment.

**Parameters:**

- `env: 'testnet' | 'mainnet'`

**Returns:**

```typescript
Array<{
    srcChainId: number;
    dstChainId: number;
    tokenSymbol: string;
    srcTokenAddress: `0x${string}`;
    dstTokenAddress: `0x${string}`;
}>;
```

#### `isRouteSupported(args): boolean`

Check if a specific route is supported.

**Parameters:**

```typescript
{
    env: "testnet" | "mainnet";
    srcChainId: number;
    dstChainId: number;
    tokenSymbol: string;
}
```

#### `resolveTokenMapping(args): { srcTokenAddress, dstTokenAddress }`

Resolve token addresses for a route. Throws `UnsupportedRouteError` if route is not supported.

**Parameters:**

```typescript
{
    env: "testnet" | "mainnet";
    srcChainId: number;
    dstChainId: number;
    tokenSymbol: string;
}
```

#### `suggestAlternatives(args): SupportedPair[]`

Get alternative routes from a source chain with a specific token.

**Parameters:**

```typescript
{
    env: "testnet" | "mainnet";
    srcChainId: number;
    tokenSymbol: string;
}
```

#### `listTokenSymbolsForChain(env, chainId): OnlySwapsTokenSymbol[]`

List all supported token symbols for a chain in the given environment.

**Parameters:**

- `env: 'testnet' | 'mainnet'`
- `chainId: number`

**Example:**

```typescript
const tokens = listTokenSymbolsForChain("testnet", 84532);
// Returns: ['RUSD']
```

#### `getRouterAddress(chainId): \`0x${string}\` | undefined`

Get the router contract address for a chain.

**Parameters:**

- `chainId: number`

## Supported Chains & Tokens

### Mainnet Networks

| Network             | Chain ID | Router Address                               |
| ------------------- | -------- | -------------------------------------------- |
| Arbitrum One        | 42161    | `0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C` |
| Avalanche C-Chain   | 43114    | `0x4cB630aAEA9e152db83A846f4509d83053F21078` |
| Base                | 8453     | `0x4cB630aAEA9e152db83A846f4509d83053F21078` |
| Binance Smart Chain | 56       | `0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C` |
| Ethereum            | 1        | `0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C` |
| Filecoin            | 314      | `0x6f9f1c10B2a9f1d5a4cFb55f87aa419ad5b25470` |
| Linea               | 59144    | `0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C` |
| Optimism            | 10       | `0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C` |
| Scroll              | 534352   | `0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C` |

### Testnet Networks

| Network        | Chain ID | Router Address                               |
| -------------- | -------- | -------------------------------------------- |
| Arc            | 5042002  | `0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C` |
| Avalanche Fuji | 43113    | `0xC69DD549B037215BA1Ea9866FFa59603862bf986` |
| Base Sepolia   | 84532    | `0xC69DD549B037215BA1Ea9866FFa59603862bf986` |

### Mainnet Tokens

- **USDT** on: Arbitrum, Avalanche, Base, BSC, Ethereum, Linea, Optimism, Scroll
- **USDFC** on: Filecoin

**Special Mapping:** USDT on any mainnet chain can swap to/from USDFC on Filecoin.

### Testnet Tokens

- **RUSD** on: Arc, Avalanche Fuji, Base Sepolia

All testnet routes support bidirectional swaps between any two testnet chains.

## Examples

### Complete Swap Flow

```typescript
import { OnlySwapsService, getRouterAddress, CHAIN_MAP, isRouteSupported, OnlySwapsChainId, OnlySwapsTokenSymbol } from "@autofi/onlyswaps";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const env = "testnet";
const srcChainId: OnlySwapsChainId = 84532; // Base Sepolia
const dstChainId: OnlySwapsChainId = 43113; // Avalanche Fuji
const tokenSymbol: OnlySwapsTokenSymbol = "RUSD";

// Validate route
if (!isRouteSupported({ env, srcChainId, dstChainId, tokenSymbol })) {
    throw new Error("Route not supported");
}

// Set up clients
const account = privateKeyToAccount("0x...");
const chain = CHAIN_MAP[srcChainId];
const publicClient = createPublicClient({
    chain,
    transport: http("https://sepolia.base.org")
});
const walletClient = createWalletClient({
    account,
    chain,
    transport: http("https://sepolia.base.org")
});

// Create service
const routerAddress = getRouterAddress(srcChainId)!;
const onlySwaps = new OnlySwapsService({
    publicClient: publicClient as any,
    walletClient: walletClient as any,
    routerAddress
});

// Fetch fees
const fees = await onlySwaps.fetchRecommendedFeesBySymbol({
    env,
    srcChainId,
    dstChainId,
    tokenSymbol,
    amount: 1000000000000000000n // 1 RUSD
});

// Execute swap
const result = await onlySwaps.swapBySymbol({
    env,
    srcChainId,
    dstChainId,
    tokenSymbol,
    amount: 1000000000000000000n,
    recipient: account.address,
    solverFee: fees.solverFee
});

console.log("Request ID:", result.requestId);

// Wait for execution
const execution = await onlySwaps.waitForExecution(result.requestId, {
    onProgress: (status) => {
        console.log(`Executed: ${status.executed}`);
    }
});

console.log("Swap executed!", execution.params);
```

### Check Swap Status

```typescript
// Fetch current status
const [params, fulfillment] = await Promise.all([onlySwaps.fetchRequestParams(requestId), onlySwaps.fetchFulfillmentReceipt(requestId)]);

console.log("Executed:", params.executed); // Verified by dcipher
console.log("Fulfilled:", fulfillment.fulfilled); // Completed by solver
```

### Discover Available Routes

```typescript
import { listSupportedPairs, listTokenSymbolsForChain } from "@autofi/onlyswaps";

// List all supported pairs
const pairs = listSupportedPairs("testnet");
console.log("Available routes:", pairs);

// List tokens for a specific chain
const tokens = listTokenSymbolsForChain("testnet", 84532);
console.log("Tokens on Base Sepolia:", tokens); // ['RUSD']
```

## Error Handling

The SDK provides custom error classes for better error handling:

### UnsupportedRouteError

Thrown when attempting to use an unsupported route.

```typescript
import { UnsupportedRouteError } from "@autofi/core";

try {
    const mapping = resolveTokenMapping({
        env: "testnet",
        srcChainId: 84532,
        dstChainId: 999, // Invalid chain
        tokenSymbol: "RUSD"
    });
} catch (error) {
    if (error instanceof UnsupportedRouteError) {
        console.error("Route not supported:", error.message);
    }
}
```

### Common Issues

1. **"PublicClient must have a chain configured"**

    - Ensure your viem clients have the `chain` property set
    - Use `CHAIN_MAP[chainId]` to get the correct chain object

2. **"Route not supported"**

    - Check that both source and destination chains support the token
    - Use `listSupportedPairs()` to see available routes
    - Use `listTokenSymbolsForChain()` to see tokens on a specific chain

3. **"Router not found"**
    - Verify the chain ID is supported
    - Check that you're using the correct environment (testnet/mainnet)
