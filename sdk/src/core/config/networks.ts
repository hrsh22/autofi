import type { ChainIds, Environment } from '../types.js';

export function resolveChainIds(env: Environment): ChainIds {
  if (env === 'testnet') {
    return {
      baseSepolia: 84532,
      filecoinCalibration: 314159,
    };
  }
  return {
    base: 8453,
    filecoin: 314,
  };
}


