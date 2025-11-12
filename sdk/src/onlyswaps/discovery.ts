import type { Environment } from '../core/types.js';
import { UnsupportedRouteError } from '../core/errors.js';
import {
  NETWORKS,
  TOKENS,
  TOKENS_BY_CHAIN,
  OnlySwapsTokenSymbol,
  OnlySwapsChainId,
} from './constants.js';

export interface SupportedPair {
  srcChainId: number;
  dstChainId: number;
  tokenSymbol: string;
  srcTokenAddress: `0x${string}`;
  dstTokenAddress: `0x${string}`;
}

export function listSupportedPairs(env: Environment): SupportedPair[] {
  const isTestnetEnv = env === 'testnet';
  const isTestnet = (n: (typeof NETWORKS)[number]) => ('testnet' in n ? (n as any).testnet === true : false);
  const allowedChains = new Set(
    NETWORKS.filter(n => (isTestnetEnv ? isTestnet(n) : !isTestnet(n))).map(n => n.chainId)
  );

  // Group tokens by symbol for the selected environment
  const symbolToTokens = new Map<OnlySwapsTokenSymbol, { chainId: OnlySwapsChainId; address: `0x${string}` }[]>();
  for (const t of TOKENS) {
    if (!allowedChains.has(t.chainId)) continue;
    const list = symbolToTokens.get(t.symbol) ?? [];
    list.push({ chainId: t.chainId, address: t.address });
    symbolToTokens.set(t.symbol, list);
  }

  const pairs: SupportedPair[] = [];

  // For each symbol, produce all directional pairs where both chains have the symbol.
  for (const [symbol, list] of symbolToTokens) {
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const a = list[i];
        const b = list[j];
        if (!allowedChains.has(a.chainId) || !allowedChains.has(b.chainId)) continue;
        pairs.push({
          srcChainId: a.chainId,
          dstChainId: b.chainId,
          tokenSymbol: symbol,
          srcTokenAddress: a.address,
          dstTokenAddress: b.address,
        });
      }
    }
  }

  // Special case: Mainnet USDT <-> Filecoin USDFC mapping (if both chains exist in current env)
  // This enables Base/Optimism/etc. USDT to map to Filecoin USDFC.
  if (!isTestnetEnv) {
    const filecoinChainId = 314;
    const filecoinTokens = TOKENS_BY_CHAIN[filecoinChainId] ?? [];
    const usdfc = filecoinTokens.find(t => t.symbol === 'USDFC');
    if (usdfc) {
      // For every USDT token, add directional pairs to/from Filecoin USDFC
      for (const [symbol, list] of symbolToTokens) {
        if (symbol !== 'USDT') continue;
        for (const t of list) {
          if (t.chainId === filecoinChainId) continue;
          pairs.push({
            srcChainId: t.chainId,
            dstChainId: filecoinChainId,
            tokenSymbol: 'USDT', // canonical symbol for the pair
            srcTokenAddress: t.address,
            dstTokenAddress: usdfc.address,
          });
          pairs.push({
            srcChainId: filecoinChainId,
            dstChainId: t.chainId,
            tokenSymbol: 'USDT',
            srcTokenAddress: usdfc.address,
            dstTokenAddress: t.address,
          });
        }
      }
    }
  }

  return pairs;
}

export function getRouterAddress(chainId: number): `0x${string}` | undefined {
  const net = NETWORKS.find(n => n.chainId === chainId);
  return net?.router as `0x${string}` | undefined;
}

export function isRouteSupported(args: {
  env: Environment;
  srcChainId: number;
  dstChainId: number;
  tokenSymbol: string;
}): boolean {
  return listSupportedPairs(args.env).some(
    p =>
      p.srcChainId === args.srcChainId &&
      p.dstChainId === args.dstChainId &&
      p.tokenSymbol === args.tokenSymbol
  );
}

export function resolveTokenMapping(args: {
  env: Environment;
  srcChainId: number;
  dstChainId: number;
  tokenSymbol: string;
}): { srcTokenAddress: `0x${string}`; dstTokenAddress: `0x${string}` } {
  // Prefer a direct match first (same symbol on both chains within env)
  const direct = listSupportedPairs(args.env).find(
    p =>
      p.srcChainId === args.srcChainId &&
      p.dstChainId === args.dstChainId &&
      p.tokenSymbol === args.tokenSymbol
  );
  if (direct) {
    return {
      srcTokenAddress: direct.srcTokenAddress,
      dstTokenAddress: direct.dstTokenAddress,
    };
  }

  // Mainnet special mapping: USDT on non-Filecoin <-> USDFC on Filecoin
  if (args.env === 'mainnet' && args.tokenSymbol === 'USDT') {
    const filecoinChainId = 314;
    const isSrcFilecoin = args.srcChainId === filecoinChainId;
    const isDstFilecoin = args.dstChainId === filecoinChainId;
    if (isSrcFilecoin || isDstFilecoin) {
      const srcTokens = TOKENS_BY_CHAIN[args.srcChainId] ?? [];
      const dstTokens = TOKENS_BY_CHAIN[args.dstChainId] ?? [];
      const src =
        (isSrcFilecoin ? srcTokens.find(t => t.symbol === 'USDFC') : srcTokens.find(t => t.symbol === 'USDT')) ??
        undefined;
      const dst =
        (isDstFilecoin ? dstTokens.find(t => t.symbol === 'USDFC') : dstTokens.find(t => t.symbol === 'USDT')) ??
        undefined;
      if (src && dst) {
        return { srcTokenAddress: src.address, dstTokenAddress: dst.address };
      }
    }
  }

  throw new UnsupportedRouteError('Unsupported route/token mapping', { args });
}

export function suggestAlternatives(args: {
  env: Environment;
  srcChainId: number;
  tokenSymbol: string;
}): SupportedPair[] {
  return listSupportedPairs(args.env).filter(
    p => p.srcChainId === args.srcChainId && p.tokenSymbol === args.tokenSymbol
  );
}

export function listTokenSymbolsForChain(env: Environment, chainId: number): OnlySwapsTokenSymbol[] {
  const isTestnetEnv = env === 'testnet';
  const isTestnet = (n: (typeof NETWORKS)[number]) => ('testnet' in n ? (n as any).testnet === true : false);
  const allowed = NETWORKS.some(n => n.chainId === chainId && (isTestnetEnv ? isTestnet(n) : !isTestnet(n)));
  if (!allowed) return [];
  const tokens = TOKENS_BY_CHAIN[chainId] ?? [];
  const symbols = new Set<OnlySwapsTokenSymbol>();
  for (const t of tokens) symbols.add(t.symbol);
  return Array.from(symbols);
}


