import dotenv from 'dotenv';
import { writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { SynapseStorageClient } from '../sdk/dist/synapse/index.js';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
};

// Usage: tsx download-file.ts <commp> [outputPath]
async function main() {
    const commp = process.argv[2];
    const outputPath = process.argv[3];

    if (!commp) {
        console.error('Usage: tsx download-file.ts <commp> [outputPath]');
        console.error('Example: tsx download-file.ts baga6ea4cf... ./downloaded.json');
        process.exit(1);
    }

    console.log('Downloading CommP:', commp);
    console.log('Backend:', CONFIG.BACKEND_URL);

    // Resolve output behavior:
    // - If outputPath is a directory (exists or ends with path.sep), write to <dir>/<commp>.bin
    // - If outputPath is a file path, write exactly there (create parent directory if needed)
    // - If no outputPath provided, print a preview
    let finalFilePath: string | undefined;
    if (outputPath) {
        const resolved = path.resolve(outputPath);
        const endsWithSep = resolved.endsWith(path.sep);
        let isDirectory = false;
        try {
            isDirectory = existsSync(resolved) && statSync(resolved).isDirectory();
        } catch {
            // ignore fs errors here; we'll treat as non-existent path
        }
        if (isDirectory || endsWithSep) {
            if (!existsSync(resolved)) {
                mkdirSync(resolved, { recursive: true });
            }
            finalFilePath = path.join(resolved, `${commp}.bin`);
        } else {
            const dir = path.dirname(resolved);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            finalFilePath = resolved;
        }
    }

    const storage = new SynapseStorageClient({
        backendUrl: CONFIG.BACKEND_URL,
    });

    try {
        const data = await storage.downloadFile(commp);
        console.log(`Downloaded ${data.length} bytes`);

        if (finalFilePath) {
            writeFileSync(finalFilePath, data);
            console.log(`Saved to ${finalFilePath}`);
        } else {
            const preview = new TextDecoder().decode(data.slice(0, 200));
            console.log('Preview:', preview);
        }
    } catch (err) {
        console.error('Failed to download file:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});


