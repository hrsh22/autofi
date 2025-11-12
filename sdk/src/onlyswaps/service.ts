import type { PublicClient, WalletClient } from 'viem';
import { ViemChainBackend, RouterClient, fetchRecommendedFees } from 'onlyswaps-js';
import type { Environment } from '../core/types.js';
import type { OnlySwapsTokenSymbol } from './constants.js';
import { resolveTokenMapping, getRouterAddress } from './discovery.js';

export interface OnlySwapsServiceConfig {
    publicClient: PublicClient;
    walletClient: WalletClient;
    routerAddress: `0x${string}`;
}

export interface FetchFeesParams {
    srcChainId: number;
    dstChainId: number;
    srcToken: `0x${string}`;
    dstToken: `0x${string}`;
    amount: bigint;
}

export interface FetchFeesResult {
    solverFee: bigint;
    networkFee: bigint;
    totalFee: bigint;
    transferAmount: bigint;
    approvalAmount: bigint;
}

export interface SwapParams {
    srcChainId: number;
    dstChainId: number;
    srcToken: `0x${string}`;
    dstToken: `0x${string}`;
    amount: bigint;
    recipient: `0x${string}`;
    solverFee: bigint;
}

export interface SwapResult {
    requestId: `0x${string}`;
}

export interface RequestParams {
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
    executed: boolean;
    requestedAt: Date;
}

export interface FulfillmentReceipt {
    requestId: `0x${string}`;
    fulfilled: boolean;
    solver?: `0x${string}`;
    recipient?: `0x${string}`;
    amountOut?: bigint;
    fulfilledAt?: Date;
}

/**
 * OnlySwaps service that wraps onlyswaps-js internally.
 * Users interact with our SDK, which uses onlyswaps-js under the hood.
 */
export class OnlySwapsService {
    private router: RouterClient;
    private readonly accountAddress: `0x${string}`;
    private destRouterCache?: { chainId: number; client: RouterClient };
    private readonly walletClient: WalletClient;

    constructor(config: OnlySwapsServiceConfig) {
        const accountAddress = config.walletClient.account?.address;
        if (!accountAddress) {
            throw new Error('WalletClient must have an account with an address');
        }
        this.accountAddress = accountAddress as `0x${string}`;

        if (!config.publicClient.chain) {
            throw new Error('PublicClient must have a chain configured');
        }

        if (!config.walletClient.chain) {
            throw new Error('WalletClient must have a chain configured');
        }

        // ViemChainBackend expects clients with non-nullable chains
        // We've validated above that both clients have chains
        // The onlyswaps-js library types are stricter than viem's public types
        // Since we've validated the chains exist, we can safely pass the clients
        this.walletClient = config.walletClient;

        const backend = new ViemChainBackend(
            accountAddress,
            config.publicClient as any,
            config.walletClient as any
        );
        this.router = new RouterClient({ routerAddress: config.routerAddress }, backend);
    }

    /**
     * Fetch recommended fees for a swap
     */
    async fetchRecommendedFees(params: FetchFeesParams): Promise<FetchFeesResult> {
        const feeResponse = await fetchRecommendedFees({
            sourceToken: params.srcToken,
            destinationToken: params.dstToken,
            sourceChainId: BigInt(params.srcChainId),
            destinationChainId: BigInt(params.dstChainId),
            amount: params.amount,
        });

        return {
            solverFee: BigInt(feeResponse.fees.solver),
            networkFee: BigInt(feeResponse.fees.network),
            totalFee: BigInt(feeResponse.fees.total),
            transferAmount: BigInt(feeResponse.transferAmount),
            approvalAmount: BigInt(feeResponse.approvalAmount),
        };
    }

    /**
     * Fetch recommended fees for a swap by token symbol.
     * Resolves token addresses from constants based on environment and chain IDs.
     */
    async fetchRecommendedFeesBySymbol(params: {
        env: Environment;
        srcChainId: number;
        dstChainId: number;
        tokenSymbol: OnlySwapsTokenSymbol;
        amount: bigint;
    }): Promise<FetchFeesResult> {
        const mapping = resolveTokenMapping({
            env: params.env,
            srcChainId: params.srcChainId,
            dstChainId: params.dstChainId,
            tokenSymbol: params.tokenSymbol,
        });
        return this.fetchRecommendedFees({
            srcChainId: params.srcChainId,
            dstChainId: params.dstChainId,
            srcToken: mapping.srcTokenAddress,
            dstToken: mapping.dstTokenAddress,
            amount: params.amount,
        });
    }

    /**
     * Execute a cross-chain swap
     */
    async swap(params: SwapParams): Promise<SwapResult> {
        const result = await this.router.swap({
            srcToken: params.srcToken,
            destToken: params.dstToken,
            amount: params.amount,
            fee: params.solverFee,
            destChainId: BigInt(params.dstChainId),
            recipient: params.recipient,
        });

        return {
            requestId: result.requestId as `0x${string}`,
        };
    }

    /**
     * Execute a cross-chain swap by token symbol.
     * Resolves token addresses from constants based on environment and chain IDs.
     */
    async swapBySymbol(params: {
        env: Environment;
        srcChainId: number;
        dstChainId: number;
        tokenSymbol: OnlySwapsTokenSymbol;
        amount: bigint;
        recipient: `0x${string}`;
        solverFee: bigint;
    }): Promise<SwapResult> {
        const mapping = resolveTokenMapping({
            env: params.env,
            srcChainId: params.srcChainId,
            dstChainId: params.dstChainId,
            tokenSymbol: params.tokenSymbol,
        });
        return this.swap({
            srcChainId: params.srcChainId,
            dstChainId: params.dstChainId,
            srcToken: mapping.srcTokenAddress,
            dstToken: mapping.dstTokenAddress,
            amount: params.amount,
            recipient: params.recipient,
            solverFee: params.solverFee,
        });
    }

    /**
     * Fetch request parameters and status
     */
    async fetchRequestParams(requestId: `0x${string}`): Promise<RequestParams> {
        const params = await this.router.fetchRequestParams(requestId);

        // Convert timestamp to Date if needed
        const requestedAtValue = params.requestedAt;
        let requestedAt: Date;
        if (requestedAtValue === null || requestedAtValue === undefined) {
            // If no timestamp provided, use current time as fallback
            requestedAt = new Date();
        } else if (typeof requestedAtValue === 'number' || typeof requestedAtValue === 'bigint') {
            const timestamp = Number(requestedAtValue);
            // Handle case where timestamp might be 0 or very small (likely already in milliseconds)
            if (timestamp === 0) {
                requestedAt = new Date(); // Use current time if timestamp is 0
            } else if (timestamp < 1000000000) {
                // If timestamp is less than year 2001, assume it's in seconds
                requestedAt = new Date(timestamp * 1000);
            } else if (timestamp < 1000000000000) {
                // If timestamp is less than year 2001 in milliseconds, assume seconds
                requestedAt = new Date(timestamp * 1000);
            } else {
                // Otherwise assume milliseconds
                requestedAt = new Date(timestamp);
            }
        } else if (requestedAtValue && typeof requestedAtValue === 'object' && 'getTime' in requestedAtValue) {
            requestedAt = requestedAtValue as Date;
        } else {
            requestedAt = new Date();
        }

        return {
            sender: params.sender as `0x${string}`,
            recipient: params.recipient as `0x${string}`,
            tokenIn: params.tokenIn as `0x${string}`,
            tokenOut: params.tokenOut as `0x${string}`,
            amountIn: BigInt(params.amountIn),
            amountOut: BigInt(params.amountOut),
            srcChainId: Number(params.srcChainId),
            dstChainId: Number(params.dstChainId),
            verificationFee: BigInt(params.verificationFee),
            solverFee: BigInt(params.solverFee),
            executed: params.executed,
            requestedAt,
        };
    }

    /**
     * Fetch fulfillment receipt
     */
    async fetchFulfillmentReceipt(requestId: `0x${string}`): Promise<FulfillmentReceipt> {
        const receipt = await this.router.fetchFulfilmentReceipt(requestId);

        // Convert timestamp to Date if needed
        const fulfilledAtValue = receipt.fulfilledAt;
        const fulfilledAt = fulfilledAtValue
            ? typeof fulfilledAtValue === 'number' || typeof fulfilledAtValue === 'bigint'
                ? new Date(Number(fulfilledAtValue) * 1000)
                : fulfilledAtValue && typeof fulfilledAtValue === 'object' && 'getTime' in fulfilledAtValue
                    ? (fulfilledAtValue as Date)
                    : undefined
            : undefined;

        return {
            requestId: receipt.requestId as `0x${string}`,
            fulfilled: receipt.fulfilled,
            solver: receipt.solver as `0x${string}` | undefined,
            recipient: receipt.recipient as `0x${string}` | undefined,
            amountOut: receipt.amountOut ? BigInt(receipt.amountOut) : undefined,
            fulfilledAt,
        };
    }

    /**
     * Wait for a swap to be executed (verified by dcipher committee) or fulfilled (tokens received).
     * Returns when either condition is met - fulfilled is checked first since it means tokens were received.
     * @param requestId The swap request ID
     * @param options Polling options
     * @returns The request parameters and fulfillment receipt once executed or fulfilled
     */
    async waitForExecution(
        requestId: `0x${string}`,
        options: {
            timeoutMs?: number;
            intervalMs?: number;
            onProgress?: (status: { elapsed: number; fulfilled: boolean; executed: boolean }) => void;
            // Optional: more accurate destination-chain status using OnlySwaps SDK
            destPublicClient?: PublicClient;
            dstChainId?: number;
        } = {}
    ): Promise<{ params: RequestParams; fulfillment: FulfillmentReceipt }> {
        const { timeoutMs = 300000, intervalMs = 5000, onProgress } = options; // 5min timeout, 5s interval
        const startTime = Date.now();

        // Helper to fetch receipt from destination router using onlyswaps-js (if provided)
        const fetchDestReceipt = async (): Promise<FulfillmentReceipt | undefined> => {
            if (!options.destPublicClient || !options.dstChainId) return undefined;
            // Reuse cached client per dstChainId
            if (!this.destRouterCache || this.destRouterCache.chainId !== options.dstChainId) {
                const destRouterAddress = getRouterAddress(options.dstChainId);
                if (!destRouterAddress) return undefined;
                const destBackend = new ViemChainBackend(
                    this.accountAddress,
                    options.destPublicClient as any,
                    // Wallet client is not used for static calls, safe to reuse
                    this.walletClient as any
                );
                this.destRouterCache = {
                    chainId: options.dstChainId,
                    client: new RouterClient({ routerAddress: destRouterAddress }, destBackend),
                };
            }
            const receipt = await this.destRouterCache.client.fetchFulfilmentReceipt(requestId);
            // Normalize to our FulfillmentReceipt shape
            const fulfilledAtValue = (receipt as any).fulfilledAt;
            const fulfilledAt =
                fulfilledAtValue && (typeof fulfilledAtValue === 'bigint' || typeof fulfilledAtValue === 'number')
                    ? new Date(Number(fulfilledAtValue) * 1000)
                    : undefined;
            return {
                requestId: (receipt as any).requestId as `0x${string}`,
                fulfilled: (receipt as any).fulfilled as boolean,
                solver: (receipt as any).solver as `0x${string}` | undefined,
                recipient: (receipt as any).recipient as `0x${string}` | undefined,
                amountOut: (receipt as any).amountOut ? BigInt((receipt as any).amountOut) : undefined,
                fulfilledAt,
            };
        };

        // Check initial status - might already be executed or fulfilled
        try {
            const [initialFulfillment, initialParams] = await Promise.all([
                this.fetchFulfillmentReceipt(requestId),
                this.fetchRequestParams(requestId),
            ]);

            // Return if executed (verified by dcipher) or fulfilled (tokens received)
            if (initialParams.executed || initialFulfillment.fulfilled) {
                return { params: initialParams, fulfillment: initialFulfillment };
            }
            // If destination public client is provided, check fulfillment on destination router too
            const destReceipt = await fetchDestReceipt();
            if (destReceipt?.fulfilled) {
                return { params: initialParams, fulfillment: destReceipt };
            }
        } catch (error) {
            // If initial check fails, continue with polling
            // This might happen if the request is very new
        }

        while (true) {
            const elapsed = Date.now() - startTime;

            if (elapsed > timeoutMs) {
                // Fetch final status before throwing to provide better error message
                try {
                    const [finalFulfillment, finalParams] = await Promise.all([
                        this.fetchFulfillmentReceipt(requestId),
                        this.fetchRequestParams(requestId),
                    ]);
                    throw new Error(
                        `Swap execution timeout after ${timeoutMs}ms. Final status: executed=${finalParams.executed}, fulfilled=${finalFulfillment.fulfilled}`
                    );
                } catch (error) {
                    if (error instanceof Error && error.message.includes('timeout')) {
                        throw error;
                    }
                    throw new Error(`Swap execution timeout after ${timeoutMs}ms`);
                }
            }

            try {
                // Check both fulfillment and execution status
                const [fulfillment, params] = await Promise.all([
                    this.fetchFulfillmentReceipt(requestId),
                    this.fetchRequestParams(requestId),
                ]);

                if (onProgress) {
                    onProgress({
                        elapsed,
                        fulfilled: fulfillment.fulfilled,
                        executed: params.executed,
                    });
                }

                // Return once executed (verified by dcipher committee) or fulfilled (tokens received)
                // Fulfilled is more important since it means the user has received their tokens
                if (params.executed || fulfillment.fulfilled) {
                    return { params, fulfillment };
                }

                // Check destination router (if provided) for earlier fulfillment signal
                const destReceipt = await fetchDestReceipt();
                if (destReceipt?.fulfilled) {
                    return { params, fulfillment: destReceipt };
                }
            } catch (error) {
                // Log error but continue polling (might be temporary network issue)
                // Only throw if we're past timeout
                if (elapsed > timeoutMs - intervalMs) {
                    throw error;
                }
                // Otherwise continue polling
            }

            // Wait before next poll
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
    }
}
