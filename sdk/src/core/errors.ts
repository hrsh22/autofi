export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class UnsupportedRouteError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'UnsupportedRouteError';
  }
}

export class UnsupportedTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedTokenError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(
    message: string,
    public readonly data: { required: bigint; available: bigint; token: string; chainId: number }
  ) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class AllowanceRequiredError extends Error {
  constructor(
    message: string,
    public readonly data: { required: bigint; current: bigint; token: string; spender: `0x${string}` }
  ) {
    super(message);
    this.name = 'AllowanceRequiredError';
  }
}

export class SwapTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwapTimeoutError';
  }
}


