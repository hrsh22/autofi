// Synapse SDK cost parameters (Filecoin Calibration testnet)
// Source: https://synapse-sdk-docs.netlify.app/developer-guides/storage/storage-costs/

export const SYNAPSE_COSTS = {
    // Rate: ongoing cost per byte per epoch
    // Placeholder values - should be updated with actual testnet values from Synapse contracts
    BYTES_RATE: 100n,
    
    // Lockup: upfront deposit per byte (returned when storage ends)
    BYTES_LOCKUP: 1000n,
    
    // Time constants
    EPOCH_DURATION_SECONDS: 30,
    EPOCHS_PER_DAY: 2880n,
    SECONDS_PER_DAY: 86400,
};

/**
 * Calculate storage cost using Synapse formula
 * 
 * Formula from Synapse SDK:
 * totalCost = (fileSize × bytesRate × durationEpochs) + (fileSize × bytesLockup)
 * 
 * Where:
 * - fileSize: size of the file in bytes
 * - bytesRate: ongoing cost per byte per epoch
 * - durationEpochs: storage duration in epochs (durationDays × EPOCHS_PER_DAY)
 * - bytesLockup: upfront deposit per byte
 * 
 * @param fileSizeBytes File size in bytes
 * @param durationDays Storage duration in days
 * @returns Total cost in USDFC wei
 */
export function calculateStorageCost(fileSizeBytes: number, durationDays: number): bigint {
    const durationEpochs = BigInt(durationDays) * SYNAPSE_COSTS.EPOCHS_PER_DAY;
    const fileSize = BigInt(fileSizeBytes);
    
    // Rate cost: ongoing cost over the storage period
    const rateCost = fileSize * SYNAPSE_COSTS.BYTES_RATE * durationEpochs;
    
    // Lockup cost: upfront deposit (returned when storage ends)
    const lockupCost = fileSize * SYNAPSE_COSTS.BYTES_LOCKUP;
    
    return rateCost + lockupCost;
}

