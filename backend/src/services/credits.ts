import { Database } from '../db/database.js';
import { calculateStorageCost } from '../constants.js';
import { v4 as uuidv4 } from 'uuid';

export class CreditService {
    constructor(private db: Database) {}

    /**
     * Get user's current credit balance
     */
    async getBalance(userAddress: string): Promise<bigint> {
        const credit = await this.db.getUserCredit(userAddress);
        return credit ? BigInt(credit.balance) : 0n;
    }

    /**
     * Add credits to user account (from bridge deposit)
     */
    async addCredits(
        userAddress: string,
        amount: bigint,
        bridgeRequestId: string
    ): Promise<void> {
        const currentBalance = await this.getBalance(userAddress);
        const newBalance = currentBalance + amount;

        // Create or update user credit record
        const existing = await this.db.getUserCredit(userAddress);
        if (existing) {
            await this.db.updateUserCreditBalance(userAddress, newBalance.toString());
        } else {
            await this.db.createUserCredit({
                user_address: userAddress,
                balance: newBalance.toString(),
            });
        }

        // Log transaction
        await this.db.createCreditTransaction({
            id: uuidv4(),
            user_address: userAddress,
            type: 'deposit',
            amount: amount.toString(),
            file_id: null,
            bridge_request_id: bridgeRequestId,
            description: `Deposited ${amount} USDFC wei via bridge ${bridgeRequestId}`,
        });

        console.log(`Added ${amount} credits to ${userAddress}. New balance: ${newBalance}`);
    }

    /**
     * Deduct credits for file upload
     * Returns error if insufficient balance
     */
    async deductCredits(
        userAddress: string,
        cost: bigint,
        fileId: string,
        fileName: string,
        durationDays: number
    ): Promise<{ success: boolean; error?: string; currentBalance?: bigint; requiredAmount?: bigint }> {
        const currentBalance = await this.getBalance(userAddress);

        if (currentBalance < cost) {
            return {
                success: false,
                error: 'Insufficient credits',
                currentBalance,
                requiredAmount: cost,
            };
        }

        const newBalance = currentBalance - cost;
        await this.db.updateUserCreditBalance(userAddress, newBalance.toString());

        // Log transaction
        await this.db.createCreditTransaction({
            id: uuidv4(),
            user_address: userAddress,
            type: 'deduct',
            amount: cost.toString(),
            file_id: fileId,
            bridge_request_id: null,
            description: `Storage cost for ${fileName} (${durationDays} days)`,
        });

        console.log(`Deducted ${cost} credits from ${userAddress} for file ${fileId}. New balance: ${newBalance}`);

        return { success: true };
    }

    /**
     * Calculate storage cost for a file
     */
    calculateCost(fileSizeBytes: number, durationDays: number): bigint {
        return calculateStorageCost(fileSizeBytes, durationDays);
    }
}

