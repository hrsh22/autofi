import { Synapse } from '@filoz/synapse-sdk';

export interface SynapseUploadResult {
    commp: string;
    providerId: string;
}

export class SynapseService {
    private synapse: Synapse | null = null;
    private privateKey: string;
    private backendAddress: string;
    private isInitialized = false;

    constructor(privateKey: string, backendAddress: string) {
        this.privateKey = privateKey;
        this.backendAddress = backendAddress;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing Synapse SDK...');

        // Create Synapse instance
        // IMPORTANT: Filecoin requires WebSocket (wss://) for contract calls
        // HTTPS RPCs don't support all Filecoin contract interactions properly
        // For mainnet: wss://api.node.glif.io/rpc/v1
        // For calibration testnet: wss://api.calibration.node.glif.io/rpc/v1
        let rpcURL = process.env.FILECOIN_RPC_URL || 'wss://api.node.glif.io/rpc/v1';

        // Auto-convert HTTPS to WebSocket if user provided HTTPS
        if (rpcURL.startsWith('https://')) {
            console.log('Converting HTTPS RPC to WebSocket (required for Filecoin)');
            rpcURL = rpcURL.replace('https://', 'wss://');
        }

        if (!rpcURL.startsWith('wss://')) {
            throw new Error('Filecoin requires WebSocket RPC (wss://). Please use wss://api.node.glif.io/rpc/v1 for mainnet or wss://api.calibration.node.glif.io/rpc/v1 for testnet');
        }

        this.synapse = await Synapse.create({
            privateKey: this.privateKey,
            rpcURL: rpcURL,
        });

        const network = this.synapse.getNetwork();
        const chainId = this.synapse.getChainId();
        console.log(`Synapse SDK connected to ${network} (chain ID: ${chainId})`);

        this.isInitialized = true;
        console.log('Synapse SDK initialized successfully');
    }

    async uploadFile(
        fileBuffer: Buffer,
        userAddress: string,
        fileName: string
    ): Promise<SynapseUploadResult> {
        if (!this.synapse) {
            throw new Error('Synapse SDK not initialized');
        }

        console.log(`Uploading file ${fileName} for user ${userAddress}...`);

        // Create storage context with CDN support
        const storage = await this.synapse.createStorage({ withCDN: true });

        // Upload with metadata
        const result = await storage.upload(fileBuffer, {
            metadata: {
                userAddress: userAddress,
                fileName: fileName,
            }
        });

        console.log(`File uploaded successfully. PieceCID: ${result.pieceCid}`);

        return {
            commp: result.pieceCid.toString(),
            providerId: (result as any).serviceProvider || (result as any).provider || 'unknown',
        };
    }

    async downloadFile(commp: string): Promise<Buffer> {
        if (!this.synapse) {
            throw new Error('Synapse SDK not initialized');
        }

        console.log(`Downloading file with CommP: ${commp}...`);

        const data = await this.synapse.download(commp);

        console.log(`File downloaded successfully. Size: ${data.length} bytes`);

        return Buffer.from(data);
    }

    async getBalance(): Promise<bigint> {
        if (!this.synapse) {
            throw new Error('Synapse SDK not initialized');
        }

        // accountInfo() uses the signer's address automatically and defaults to USDFC token
        const accountInfo = await this.synapse.payments.accountInfo();

        return accountInfo.funds;
    }

    async getAllowance(): Promise<bigint> {
        if (!this.synapse) {
            throw new Error('Synapse SDK not initialized');
        }

        // accountInfo() uses the signer's address automatically and defaults to USDFC token
        const accountInfo = await this.synapse.payments.accountInfo();

        // Return available funds (balance minus locked)
        return accountInfo.availableFunds;
    }

    async getStorageInfo() {
        if (!this.synapse) {
            throw new Error('Synapse SDK not initialized');
        }

        return await this.synapse.getStorageInfo();
    }

    getInstance(): Synapse {
        if (!this.synapse) {
            throw new Error('Synapse SDK not initialized');
        }
        return this.synapse;
    }
}

