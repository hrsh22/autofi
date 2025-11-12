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
    storage_duration_days: number;
    storage_cost: string;
    uploaded_at: number | null;
}

export interface UserCredit {
    user_address: string;
    balance: string;
    created_at: number;
    updated_at: number;
}

export interface CreditTransaction {
    id: string;
    user_address: string;
    type: 'deposit' | 'deduct';
    amount: string;
    file_id: string | null;
    bridge_request_id: string | null;
    description: string;
    created_at: number;
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

    // User File Operations (credit-based)
    async createUserFile(file: Omit<UserFile, 'uploaded_at'>): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO user_files (id, user_address, file_name, file_size, file_hash, commp, provider_id, storage_duration_days, storage_cost, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [file.id, file.user_address, file.file_name, file.file_size, file.file_hash, file.commp, file.provider_id, file.storage_duration_days, file.storage_cost, null],
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

    // User Credit Operations
    async getUserCredit(userAddress: string): Promise<UserCredit | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_credits WHERE user_address = ?',
                [userAddress],
                (err, row: UserCredit | undefined) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    async createUserCredit(credit: Omit<UserCredit, 'created_at' | 'updated_at'>): Promise<void> {
        const now = Date.now();
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO user_credits (user_address, balance, created_at, updated_at) VALUES (?, ?, ?, ?)',
                [credit.user_address, credit.balance, now, now],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async updateUserCreditBalance(userAddress: string, newBalance: string): Promise<void> {
        const now = Date.now();
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE user_credits SET balance = ?, updated_at = ? WHERE user_address = ?',
                [newBalance, now, userAddress],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Credit Transaction Operations
    async createCreditTransaction(tx: Omit<CreditTransaction, 'created_at'>): Promise<void> {
        const now = Date.now();
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO credit_transactions (id, user_address, type, amount, file_id, bridge_request_id, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [tx.id, tx.user_address, tx.type, tx.amount, tx.file_id, tx.bridge_request_id, tx.description, now],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getCreditTransactions(userAddress: string, limit?: number): Promise<CreditTransaction[]> {
        const query = limit
            ? 'SELECT * FROM credit_transactions WHERE user_address = ? ORDER BY created_at DESC LIMIT ?'
            : 'SELECT * FROM credit_transactions WHERE user_address = ? ORDER BY created_at DESC';

        const params = limit ? [userAddress, limit] : [userAddress];

        return new Promise((resolve, reject) => {
            this.db.all(
                query,
                params,
                (err, rows: CreditTransaction[]) => {
                    if (err) reject(err);
                    else resolve(rows || []);
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

