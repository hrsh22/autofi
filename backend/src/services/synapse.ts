import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';

export interface SynapseUploadResult {
    commp: string;
    providerId: string;
}

export interface SynapseDiagnostics {
    isConnected: boolean;
    lastHeartbeat: number | null;
    lastReconnect: number | null;
    reconnectCount: number;
    lastError: string | null;
}

export class SynapseService {
    private synapse: Synapse | null = null;
    private connectPromise: Promise<Synapse> | null = null;
    private resetPromise: Promise<void> | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;

    private readonly privateKey: string;
    private readonly backendAddress: string;
    private readonly rpcURL: string;
    private readonly heartbeatInterval = 45000; // Keep the connection alive with a 45s heartbeat
    private readonly forcedReconnectInterval = 60000; // Force a reconnect every 60 seconds

    private lastHeartbeat: number | null = null;
    private lastReconnect: number | null = null;
    private reconnectCount = 0;
    private lastError: string | null = null;
    private refreshPromise: Promise<void> | null = null;

    constructor(privateKey: string, backendAddress: string) {
        this.privateKey = privateKey;
        this.backendAddress = backendAddress;

        // Prefer explicit env override; otherwise default to SDK's recommended HTTP endpoint
        const configuredURL = RPC_URLS.calibration.websocket;
        this.rpcURL = configuredURL;

        if (!this.rpcURL.startsWith('wss://')) {
            throw new Error('Filecoin requires WebSocket RPC (wss://). Please use wss://filecoin-calibration.drpc.org for testnet');
        }
    }

    async initialize(): Promise<void> {
        await this.getSynapse();
    }

    getDiagnostics(): SynapseDiagnostics {
        return {
            isConnected: this.synapse !== null,
            lastHeartbeat: this.lastHeartbeat,
            lastReconnect: this.lastReconnect,
            reconnectCount: this.reconnectCount,
            lastError: this.lastError,
        };
    }

    async uploadFile(
        fileBuffer: Buffer,
        userAddress: string,
        fileName: string
    ): Promise<SynapseUploadResult> {
        return this.withConnection('uploadFile', async (synapse) => {
            console.log(`Uploading file ${fileName} for user ${userAddress}...`);

            const storage = await synapse.createStorage({ withCDN: true });
            const result = await storage.upload(fileBuffer, {
                metadata: {
                    userAddress: userAddress
                }
            });

            console.log(`File uploaded successfully. PieceCID: ${result.pieceCid}`);

            return {
                commp: result.pieceCid.toString(),
                providerId: (result as any).serviceProvider || (result as any).provider || 'unknown',
            };
        });
    }

    async downloadFile(commp: string): Promise<Buffer> {
        return this.withConnection('downloadFile', async (synapse) => {
            console.log(`Downloading file with CommP: ${commp}...`);
            const data = await synapse.download(commp);
            console.log(`File downloaded successfully. Size: ${data.length} bytes`);
            return Buffer.from(data);
        });
    }

    async getBalance(): Promise<bigint> {
        return this.withConnection('getBalance', async (synapse) => {
            const accountInfo = await synapse.payments.accountInfo();
            return accountInfo.funds;
        });
    }

    async getAllowance(): Promise<bigint> {
        return this.withConnection('getAllowance', async (synapse) => {
            const accountInfo = await synapse.payments.accountInfo();
            return accountInfo.availableFunds;
        });
    }

    async getStorageInfo() {
        return this.withConnection('getStorageInfo', async (synapse) => {
            return await synapse.getStorageInfo();
        });
    }

    getInstance(): Synapse {
        if (!this.synapse) {
            throw new Error('Synapse SDK not initialized');
        }
        return this.synapse;
    }

    private async withConnection<T>(operation: string, fn: (synapse: Synapse) => Promise<T>): Promise<T> {
        const execute = async (attempt: number): Promise<T> => {
            await this.refreshConnectionIfNeeded();
            const synapse = await this.getSynapse();

            try {
                const result = await fn(synapse);
                this.lastHeartbeat = Date.now();
                this.lastError = null;
                return result;
            } catch (error) {
                this.lastError = error instanceof Error ? error.message : String(error);
                console.warn(`[${new Date().toISOString()}] Synapse ${operation} failed (attempt ${attempt + 1})`, error);

                await this.resetConnection();

                if (attempt === 0) {
                    console.log(`[${new Date().toISOString()}] Retrying Synapse ${operation} after reconnect...`);
                    return execute(1);
                }

                throw error;
            }
        };

        return execute(0);
    }

    private async getSynapse(): Promise<Synapse> {
        if (this.synapse) {
            return this.synapse;
        }

        if (this.connectPromise) {
            return this.connectPromise;
        }

        this.connectPromise = this.createSynapse();

        try {
            const instance = await this.connectPromise;
            this.synapse = instance;
            this.lastHeartbeat = Date.now();
            this.lastReconnect = Date.now();
            this.lastError = null;
            this.startHeartbeat();
            return instance;
        } finally {
            this.connectPromise = null;
        }
    }

    private async createSynapse(): Promise<Synapse> {
        let attempt = 0;
        let lastError: unknown = null;

        while (attempt < 5) {
            attempt += 1;

            try {
                console.log(`[${new Date().toISOString()}] Connecting to Synapse (attempt ${attempt})...`);
                const instance = await Synapse.create({
                    privateKey: this.privateKey,
                    rpcURL: this.rpcURL,
                });

                const network = instance.getNetwork();
                const chainId = instance.getChainId();
                console.log(`[${new Date().toISOString()}] Synapse SDK connected to ${network} (chain ID: ${chainId})`);

                return instance;
            } catch (error) {
                lastError = error;
                this.lastError = error instanceof Error ? error.message : String(error);
                console.error(`[${new Date().toISOString()}] Failed to connect to Synapse (attempt ${attempt})`, error);
                await this.sleep(Math.min(1000 * attempt, 5000));
            }
        }

        throw lastError instanceof Error ? lastError : new Error('Failed to connect to Synapse SDK');
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatTimer = setInterval(() => {
            void this.performHeartbeat();
        }, this.heartbeatInterval);

        void this.performHeartbeat();
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private async performHeartbeat(): Promise<void> {
        const synapse = this.synapse;
        if (!synapse) {
            return;
        }

        try {
            synapse.getNetwork();
            this.lastHeartbeat = Date.now();
            await this.refreshConnectionIfNeeded();
        } catch (error) {
            console.warn(`[${new Date().toISOString()}] Synapse heartbeat failed, scheduling reconnect...`, error);
            this.lastError = error instanceof Error ? error.message : String(error);
            await this.resetConnection();
        }
    }

    private async resetConnection(): Promise<void> {
        if (this.resetPromise) {
            await this.resetPromise;
            return;
        }

        this.reconnectCount += 1;

        this.resetPromise = (async () => {
            this.stopHeartbeat();

            const synapse = this.synapse;
            this.synapse = null;
            this.lastHeartbeat = null;
            this.lastReconnect = null;

            if (synapse && typeof (synapse as any).destroy === 'function') {
                try {
                    await (synapse as any).destroy();
                } catch (error) {
                    console.warn(`[${new Date().toISOString()}] Failed to destroy Synapse instance during reset`, error);
                }
            }
        })();

        try {
            await this.resetPromise;
        } finally {
            this.resetPromise = null;
        }
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async refreshConnectionIfNeeded(): Promise<void> {
        if (!this.synapse || this.forcedReconnectInterval <= 0) {
            return;
        }

        if (this.lastReconnect === null) {
            return;
        }

        const elapsed = Date.now() - this.lastReconnect;
        if (elapsed < this.forcedReconnectInterval) {
            return;
        }

        if (this.refreshPromise) {
            await this.refreshPromise;
            return;
        }

        this.refreshPromise = (async () => {
            console.log(`[${new Date().toISOString()}] Forced Synapse reconnect after ${Math.round(elapsed / 1000)}s to maintain freshness`);
            await this.resetConnection();
            await this.getSynapse();
        })();

        try {
            await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }
}

