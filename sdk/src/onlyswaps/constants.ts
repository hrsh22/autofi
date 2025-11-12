import type { Chain } from 'viem';
import {
    arbitrum,
    avalanche,
    base,
    bsc,
    mainnet,
    filecoin,
    linea,
    optimism,
    scroll,
    baseSepolia,
    avalancheFuji,
} from 'viem/chains';

export interface OnlySwapsNetwork {
    chainId: number;
    router: `0x${string}`;
    testnet?: boolean;
}

export interface OnlySwapsToken {
    symbol: 'USDT' | 'USDFC' | 'RUSD';
    chainId: number;
    address: `0x${string}`;
    decimals?: number;
    testnet?: boolean;
}

// Mainnet networks (docs)
// https://docs.dcipher.network/networks/onlyswaps
export const MAINNET_NETWORKS = [
    { chainId: 42161, router: '0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C' as const }, // Arbitrum One
    { chainId: 43114, router: '0x4cB630aAEA9e152db83A846f4509d83053F21078' as const }, // Avalanche C-Chain
    { chainId: 8453, router: '0x4cB630aAEA9e152db83A846f4509d83053F21078' as const },  // Base
    { chainId: 56, router: '0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C' as const },    // BSC
    { chainId: 1, router: '0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C' as const },      // Ethereum
    { chainId: 314, router: '0x6f9f1c10B2a9f1d5a4cFb55f87aa419ad5b25470' as const },     // Filecoin
    { chainId: 59144, router: '0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C' as const },   // Linea
    { chainId: 10, router: '0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C' as const },      // Optimism
    { chainId: 534352, router: '0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C' as const },  // Scroll
] as const satisfies readonly OnlySwapsNetwork[];

// Testnet networks (docs)
export const TESTNET_NETWORKS = [
    { chainId: 5042002, router: '0x8F224903363E1DD8B66b9f83DE37f48E5d10f33C' as const, testnet: true }, // Arc
    { chainId: 43113, router: '0xC69DD549B037215BA1Ea9866FFa59603862bf986' as const, testnet: true },   // Avalanche Fuji
    { chainId: 84532, router: '0xC69DD549B037215BA1Ea9866FFa59603862bf986' as const, testnet: true },   // Base Sepolia
] as const satisfies readonly OnlySwapsNetwork[];

export const NETWORKS = [
    ...MAINNET_NETWORKS,
    ...TESTNET_NETWORKS,
] as const satisfies readonly OnlySwapsNetwork[];

// Tokens (docs)
// Mainnet
export const MAINNET_TOKENS = [
    { symbol: 'USDFC', chainId: 314, address: '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045' as const },
    { symbol: 'USDT', chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as const },
    { symbol: 'USDT', chainId: 43114, address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' as const },
    { symbol: 'USDT', chainId: 8453, address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' as const },
    { symbol: 'USDT', chainId: 56, address: '0x55d398326f99059ff775485246999027b3197955' as const },
    { symbol: 'USDT', chainId: 1, address: '0xdac17f958d2ee523a2206206994597c13d831ec7' as const },
    { symbol: 'USDT', chainId: 59144, address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93' as const },
    { symbol: 'USDT', chainId: 10, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' as const },
    { symbol: 'USDT', chainId: 534352, address: '0xf55bec9cafdbe8730f096aa55dad6d22d44099df' as const },
] as const satisfies readonly OnlySwapsToken[];

// Testnet (RUSD faucet token)
export const TESTNET_TOKENS = [
    { symbol: 'RUSD', chainId: 5042002, address: '0xeEFEBadf8f73192D210a64C97bC032C51f995666' as const, testnet: true }, // Arc
    { symbol: 'RUSD', chainId: 43113, address: '0x908e1D85604E0e9e703d52D18f3f3f604Fe7Bb1b' as const, testnet: true },   // Fuji
    { symbol: 'RUSD', chainId: 84532, address: '0x908e1D85604E0e9e703d52D18f3f3f604Fe7Bb1b' as const, testnet: true },  // Base Sepolia
] as const satisfies readonly OnlySwapsToken[];

export const TOKENS = [
    ...MAINNET_TOKENS,
    ...TESTNET_TOKENS,
] as const satisfies readonly OnlySwapsToken[];

// Helpful type unions for IDE suggestions
export type OnlySwapsChainId = typeof NETWORKS[number]['chainId'];
export type OnlySwapsTokenSymbol = typeof TOKENS[number]['symbol'];
export type MainnetChainId = typeof MAINNET_NETWORKS[number]['chainId'];
export type TestnetChainId = typeof TESTNET_NETWORKS[number]['chainId'];

export type TokenForChain<C extends OnlySwapsChainId> = Extract<typeof TOKENS[number], { chainId: C }>;
export type TokenAddressForChain<C extends OnlySwapsChainId> = TokenForChain<C>['address'];

// Quick lookup helpers
export const TOKENS_BY_CHAIN: Record<number, readonly OnlySwapsToken[]> = (() => {
    const map: Record<number, OnlySwapsToken[]> = {};
    for (const t of TOKENS) {
        if (!map[t.chainId]) map[t.chainId] = [];
        map[t.chainId].push(t);
    }
    return Object.freeze(map);
})();

/**
 * Map of OnlySwaps chain IDs to viem Chain objects.
 * Used for creating viem clients with proper chain configuration.
 */
export const CHAIN_MAP: Record<OnlySwapsChainId, Chain> = {
    // Mainnets
    42161: arbitrum,
    43114: avalanche,
    8453: base,
    56: bsc,
    1: mainnet,
    314: filecoin,
    59144: linea,
    10: optimism,
    534352: scroll,
    // Testnets
    5042002: baseSepolia, // Arc testnet uses Base Sepolia config
    43113: avalancheFuji,
    84532: baseSepolia,
} as const;
