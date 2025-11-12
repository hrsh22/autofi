// OnlySwaps swap example using @autofi/onlyswaps SDK
// - Validates route support against @autofi/onlyswaps constants
// - Resolves token mapping and router address
// - Executes swap using our SDK (which uses onlyswaps-js internally)
// 
// To switch chains/tokens, just modify the privateData constant below!
import {
    isRouteSupported,
    getRouterAddress,
    OnlySwapsService,
    OnlySwapsChainId,
    OnlySwapsTokenSymbol,
    listTokenSymbolsForChain,
    CHAIN_MAP,
} from '../src/onlyswaps/index.js';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http } from 'viem';

// ============================================================================
// CONFIGURATION: Change these values to switch chains/tokens/environments
// ============================================================================
const privateData = {
    // Environment: 'testnet' for testnets, 'mainnet' for mainnets
    env: 'testnet' as 'testnet' | 'mainnet',

    // Private key for signing transactions
    privateKey: '0xdb559ca57e706a34a4c418b7abd6f244e3312556a552833d967097cc3b0e6f4d' as `0x${string}`,

    // RPC URL for the source chain (must match srcChainId)
    // Examples:
    //   Testnet: 'https://sepolia.base.org' (Base Sepolia), 'https://api.avax-test.network/ext/bc/C/rpc' (Fuji)
    //   Mainnet: 'https://mainnet.base.org' (Base), 'https://rpc.ankr.com/avalanche' (Avalanche)
    rpcUrl: 'https://sepolia.base.org',
    // Destination RPC (used for earlier fulfillment detection via destination router)
    dstRpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',

    // Route configuration
    srcChainId: 84532 as OnlySwapsChainId,      // Base Sepolia (testnet)
    dstChainId: 43113 as OnlySwapsChainId,       // Avalanche Fuji (testnet)
    tokenSymbol: 'RUSD' as OnlySwapsTokenSymbol, // Token symbol (RUSD for testnet, USDT/USDFC for mainnet)

    // Swap parameters
    // Note: Use a larger amount (1+ tokens) to avoid high fee percentages from minimum solver fees
    amountWei: 1000000000000000000n, // 1 token (18 decimals for RUSD/USDFC, 6 for USDT)

    // Optional: set recipient; if omitted, defaults to the sender address
    // recipient: '0x0000000000000000000000000000000000000001' as `0x${string}`,
};

async function main() {
    console.log('=== OnlySwaps Swap Example (using @autofi/onlyswaps SDK) ===\n');

    // Derive the sending account from the provided private key
    const account = privateKeyToAccount(privateData.privateKey);
    const recipient = (privateData as any).recipient ?? account.address;
    console.log('Sender address:', account.address);
    console.log('Recipient address:', recipient);
    console.log('Environment:', privateData.env);
    console.log('Route:', `${privateData.srcChainId} → ${privateData.dstChainId} (${privateData.tokenSymbol})\n`);

    // Validate route support
    const supported = isRouteSupported({
        env: privateData.env,
        srcChainId: privateData.srcChainId,
        dstChainId: privateData.dstChainId,
        tokenSymbol: privateData.tokenSymbol,
    });
    if (!supported) {
        console.error('❌ Route not supported for the selected environment.');
        console.error('\nAvailable tokens for source chain:');
        const availableTokens = listTokenSymbolsForChain(privateData.env, privateData.srcChainId);
        console.error(`  ${availableTokens.join(', ') || 'None'}`);
        console.error('\nSuggested alternatives:');
        const alternatives = listTokenSymbolsForChain(privateData.env, privateData.srcChainId);
        if (alternatives.length > 0) {
            console.error(`  Try token: ${alternatives[0]}`);
        }
        process.exit(1);
    }

    // Get router address
    const routerAddress = getRouterAddress(privateData.srcChainId);
    if (!routerAddress) {
        console.error('❌ Router not found for source chain:', privateData.srcChainId);
        process.exit(1);
    }

    // Get viem chain configuration
    const sourceChain = CHAIN_MAP[privateData.srcChainId];
    if (!sourceChain) {
        console.error(`❌ Viem chain not configured for chain ID: ${privateData.srcChainId}`);
        console.error('Please add the chain to CHAIN_MAP in the example file.');
        process.exit(1);
    }

    console.log('✅ Route validated');
    console.log('Router address:', routerAddress);
    console.log('Source chain:', sourceChain.name);
    console.log('Amount:', privateData.amountWei.toString(), 'wei\n');

    // Set up viem clients with chain configuration
    console.log('=== 1) Setting Up Clients ===');
    const publicClient = createPublicClient({
        chain: sourceChain,
        transport: http(privateData.rpcUrl),
    });
    const destChain = CHAIN_MAP[privateData.dstChainId];
    const destPublicClient = destChain && privateData.dstRpcUrl
        ? createPublicClient({ chain: destChain, transport: http(privateData.dstRpcUrl) })
        : undefined;
    const walletClient = createWalletClient({
        account,
        chain: sourceChain,
        transport: http(privateData.rpcUrl),
    });

    // Create our OnlySwaps service (uses onlyswaps-js internally)
    // Type assertion needed due to viem type resolution across package boundaries
    const onlySwaps = new OnlySwapsService({
        publicClient: publicClient as any,
        walletClient: walletClient as any,
        routerAddress,
    });
    console.log('✅ Clients initialized\n');

    // Fetch recommended fees using the new swapBySymbol method
    console.log('=== 2) Fetching Recommended Fees ===');
    const fees = await onlySwaps.fetchRecommendedFeesBySymbol({
        env: privateData.env,
        srcChainId: privateData.srcChainId,
        dstChainId: privateData.dstChainId,
        tokenSymbol: privateData.tokenSymbol,
        amount: privateData.amountWei,
    });
    console.log('Recommended fees:', {
        solverFee: fees.solverFee.toString(),
        networkFee: fees.networkFee.toString(),
        totalFee: fees.totalFee.toString(),
        transferAmount: fees.transferAmount.toString(),
        approvalAmount: fees.approvalAmount.toString(),
    });
    console.log('');

    // Execute swap using the new swapBySymbol method
    console.log('=== 3) Executing Swap ===');
    const swapResult = await onlySwaps.swapBySymbol({
        env: privateData.env,
        srcChainId: privateData.srcChainId,
        dstChainId: privateData.dstChainId,
        tokenSymbol: privateData.tokenSymbol,
        amount: privateData.amountWei,
        recipient,
        solverFee: fees.solverFee,
    });
    console.log('✅ Swap request submitted!');
    console.log('Request ID:', swapResult.requestId);
    console.log('');

    // Wait for execution (verification by dcipher committee)
    console.log('=== 4) Waiting for Swap Execution ===');

    // Check current status first
    try {
        const [currentParams, currentReceipt] = await Promise.all([
            onlySwaps.fetchRequestParams(swapResult.requestId),
            onlySwaps.fetchFulfillmentReceipt(swapResult.requestId),
        ]);
        console.log('Current status:', {
            executed: currentParams.executed,
            fulfilled: currentReceipt.fulfilled,
            requestedAt: currentParams.requestedAt.toISOString(),
        });

        // If already executed or fulfilled, return immediately
        if (currentParams.executed || currentReceipt.fulfilled) {
            if (currentReceipt.fulfilled) {
                console.log('\n✅ Swap fulfilled! (Tokens received on destination chain)');
            } else {
                console.log('\n✅ Swap executed! (Verified by dcipher committee)');
            }
            console.log('Execution details:', {
                executed: currentParams.executed,
                fulfilled: currentReceipt.fulfilled,
                requestedAt: currentParams.requestedAt.toISOString(),
                amountIn: currentParams.amountIn.toString(),
                amountOut: currentParams.amountOut.toString(),
                verificationFee: currentParams.verificationFee.toString(),
                solverFee: currentParams.solverFee.toString(),
            });
            if (currentReceipt.fulfilled) {
                console.log('Fulfillment details:', {
                    solver: currentReceipt.solver || 'N/A',
                    recipientAmount: currentReceipt.amountOut?.toString() || 'N/A',
                    fulfilledAt: currentReceipt.fulfilledAt?.toISOString() || 'N/A',
                });
            }
            return;
        }
    } catch (error) {
        console.log('Note: Could not fetch initial status, will start polling...');
    }

    console.log('Polling for execution (this may take a few minutes)...\n');

    try {
        const result = await onlySwaps.waitForExecution(swapResult.requestId, {
            timeoutMs: 300000, // 5 minutes
            intervalMs: 5000, // Check every 5 seconds
            destPublicClient,
            dstChainId: privateData.dstChainId,
            onProgress: (status) => {
                const elapsedSec = Math.floor(status.elapsed / 1000);
                process.stdout.write(
                    `\r⏳ Elapsed: ${elapsedSec}s | Executed: ${status.executed ? '✅' : '⏳'} | Fulfilled: ${status.fulfilled ? '✅' : '⏳'}    `
                );
            },
        });

        if (result.fulfillment.fulfilled) {
            console.log('\n\n✅ Swap fulfilled successfully! (Tokens received on destination chain)');
        } else {
            console.log('\n\n✅ Swap executed successfully! (Verified by dcipher committee)');
        }
        console.log('Execution details:', {
            executed: result.params.executed,
            fulfilled: result.fulfillment.fulfilled,
            requestedAt: result.params.requestedAt.toISOString(),
            amountIn: result.params.amountIn.toString(),
            amountOut: result.params.amountOut.toString(),
            verificationFee: result.params.verificationFee.toString(),
            solverFee: result.params.solverFee.toString(),
        });
        if (result.fulfillment.fulfilled) {
            console.log('Fulfillment details:', {
                solver: result.fulfillment.solver || 'N/A',
                recipientAmount: result.fulfillment.amountOut?.toString() || 'N/A',
                fulfilledAt: result.fulfillment.fulfilledAt?.toISOString() || 'N/A',
            });
        }
    } catch (error) {
        console.log('\n\n⚠️  Execution timeout or error');
        console.log('You can check the status later using:');
        console.log(`  onlySwaps.fetchRequestParams('${swapResult.requestId}')`);

        // Show current status
        const [params, receipt] = await Promise.all([
            onlySwaps.fetchRequestParams(swapResult.requestId),
            onlySwaps.fetchFulfillmentReceipt(swapResult.requestId),
        ]);
        console.log('\nCurrent status:', {
            executed: params.executed,
            requestedAt: params.requestedAt.toISOString(),
        });
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
