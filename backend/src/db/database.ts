import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface UserFile {
    id: string;
    user_address: string;
    file_name: string;
    file_size: number;
    file_hash: string;
    commp: string | null;
    provider_id: string | null;
    bridge_request_id: string | null;
    payment_amount: string | null;
    uploaded_at: number | null;
}

export class Database {
    private db: sqlite3.Database;

    constructor(dbPath: string) {
        this.db = new sqlite3.Database(dbPath);
        this.db.run('PRAGMA foreign_keys = ON');
    }

    async initialize(): Promise<void> {
        const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

        return new Promise((resolve, reject) => {
            this.db.exec(schema, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // User File Operations (simplified - no balance tracking)
    async createUserFile(file: Omit<UserFile, 'uploaded_at'>): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO user_files (id, user_address, file_name, file_size, file_hash, commp, provider_id, bridge_request_id, payment_amount, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [file.id, file.user_address, file.file_name, file.file_size, file.file_hash, file.commp, file.provider_id, file.bridge_request_id, file.payment_amount, null],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getUserFile(id: string): Promise<UserFile | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_files WHERE id = ?',
                [id],
                (err, row: UserFile | undefined) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    async updateUserFile(id: string, updates: Partial<Pick<UserFile, 'commp' | 'provider_id' | 'uploaded_at'>>): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.commp !== undefined) {
            fields.push('commp = ?');
            values.push(updates.commp);
        }
        if (updates.provider_id !== undefined) {
            fields.push('provider_id = ?');
            values.push(updates.provider_id);
        }
        if (updates.uploaded_at !== undefined) {
            fields.push('uploaded_at = ?');
            values.push(updates.uploaded_at);
        }

        if (fields.length === 0) {
            return Promise.resolve();
        }

        values.push(id);

        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE user_files SET ${fields.join(', ')} WHERE id = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getUserFiles(userAddress: string): Promise<UserFile[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM user_files WHERE user_address = ? ORDER BY uploaded_at DESC',
                [userAddress],
                (err, rows: UserFile[]) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async getFileByCommp(commp: string): Promise<UserFile | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_files WHERE commp = ?',
                [commp],
                (err, row: UserFile | undefined) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

