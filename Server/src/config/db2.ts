import odbc, { Connection } from 'odbc';

/**
 * DB2 Connection Configuration
 */
interface DB2Config {
    connectionString: string;
    poolSize?: number;
    timeout?: number;
}

export const SCHEMA = process.env.DB2_LIBRARY || 'RANDM_LCL';

export function getSchema(): string { return process.env.DB2_LIBRARY || 'RANDM_LCL'; }

/**
 * Transaction Manager for handling ACID operations
 */
export class Transaction {
    private connection: Connection;
    private isActive: boolean = false;
    private startTime: Date = new Date();

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Begin transaction
     */
    public async begin(): Promise<void> {
        try {
            // DB2 uses implicit transactions by default, but we can set isolation level
            await this.connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            this.isActive = true;
            this.startTime = new Date();
            console.log('[Transaction] ✓ Transaction started');
        } catch (error) {
            console.error('[Transaction] Failed to begin transaction:', error);
            throw error;
        }
    }

    /**
     * Execute query within transaction
     */
    public async execute<T = any>(sql: string, params?: any[]): Promise<T[]> {
        if (!this.isActive) {
            throw new Error('Transaction not active. Call begin() first');
        }

        try {
            const results = await this.connection.query(sql, params || []);
            console.log(`[Transaction] ✓ Query executed: ${sql.substring(0, 50)}...`);
            return results as T[];
        } catch (error) {
            console.error('[Transaction] Query failed:', error);
            throw error;
        }
    }

    /**
     * Commit transaction
     */
    public async commit(): Promise<void> {
        if (!this.isActive) {
            throw new Error('No active transaction to commit');
        }

        try {
            await this.connection.query('COMMIT');
            this.isActive = false;
            const duration = Date.now() - this.startTime.getTime();
            console.log(`[Transaction] ✓ COMMIT successful (${duration}ms)`);
        } catch (error) {
            console.error('[Transaction] Commit failed:', error);
            throw error;
        }
    }

    /**
     * Rollback transaction
     */
    public async rollback(): Promise<void> {
        if (!this.isActive) {
            console.warn('[Transaction] No active transaction to rollback');
            return;
        }

        try {
            await this.connection.query('ROLLBACK');
            this.isActive = false;
            const duration = Date.now() - this.startTime.getTime();
            console.log(`[Transaction] ✓ ROLLBACK successful (${duration}ms)`);
        } catch (error) {
            console.error('[Transaction] Rollback failed:', error);
            throw error;
        }
    }

    /**
     * Check if transaction is active
     */
    public isTransactionActive(): boolean {
        return this.isActive;
    }

    /**
     * Get transaction duration in milliseconds
     */
    public getDuration(): number {
        return Date.now() - this.startTime.getTime();
    }
}

/**
 * DB2 Connection Pool Manager
 * Handles pooled connections for production use
 */
export class DB2 {
    private static instance: DB2;
    private pool: any = null;
    private config: DB2Config;
    private isConnected: boolean = false;

    private constructor(config: DB2Config) {
        this.config = {
            poolSize: 10,
            timeout: 30000,
            ...config,
        };
    }

    /**
     * Get or create singleton instance
     */
    public static getInstance(config?: DB2Config): DB2 {
        if (!DB2.instance) {
            if (!config) {
                throw new Error('DB2 configuration required for first initialization');
            }
            DB2.instance = new DB2(config);
        }
        return DB2.instance;
    }

    /**
     * Initialize connection pool
     */
    public async initialize(): Promise<void> {
        try {
            if (this.isConnected) {
                console.warn('[DB2] Pool already initialized');
                return;
            }

            this.pool = await odbc.pool(this.config.connectionString);
            this.isConnected = true;
            console.log('[DB2] ✓ Connection pool initialized successfully');
        } catch (error) {
            console.error('[DB2] ✗ Failed to initialize connection pool:', error);
            throw error;
        }
    }

    /**
     * Get pooled connection
     */
    public async getPool(): Promise<any> {
        if (!this.pool) {
            await this.initialize();
        }
        return this.pool as any;
    }

    /**
     * Execute query using pool
     */
    public async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        try {
            const pool = await this.getPool();
            const results = await pool.query(sql, params || []);
            return results as T[];
        } catch (error) {
            console.error('[DB2] Query execution failed:', error);
            throw error;
        }
    }

    /**
     * Execute query with single result
     */
    public async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
        const results = await this.query<T>(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Close connection pool
     */
    public async close(): Promise<void> {
        try {
            if (this.pool) {
                await this.pool.close();
                this.pool = null;
                this.isConnected = false;
                console.log('[DB2] ✓ Connection pool closed');
            }
        } catch (error) {
            console.error('[DB2] Error closing pool:', error);
            throw error;
        }
    }

    /**
     * Health check
     */
    public async healthCheck(): Promise<boolean> {
        try {
            const pool = await this.getPool();
            await pool.query('SELECT 1 FROM SYSIBM.DUAL');
            return true;
        } catch (error) {
            console.error('[DB2] Health check failed:', error);
            return false;
        }
    }

    /**
     * Get connection status
     */
    public isPoolConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Get transaction for ACID operations
     * Returns a Transaction object for managing commits and rollbacks
     */
    public async getTransaction(): Promise<Transaction> {
        try {
            // Get a dedicated connection from pool for the transaction
            const pool = await this.getPool();
            const connection = await pool.connect();
            const transaction = new Transaction(connection);
            await transaction.begin();
            return transaction;
        } catch (error) {
            console.error('[DB2] Failed to create transaction:', error);
            throw error;
        }
    }

    /**
     * Execute function within a transaction with automatic rollback on error
     * If function succeeds, transaction commits automatically
     * If function throws, transaction rolls back automatically
     */
    public async withTransaction<T>(
        callback: (tx: Transaction) => Promise<T>
    ): Promise<T> {
        const transaction = await this.getTransaction();

        try {
            const result = await callback(transaction);
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

/**
 * Direct connection function for ad-hoc queries
 * Use for development or one-off operations
 */
export async function db(connectionString?: string): Promise<Connection> {
    try {
        const connStr =
            connectionString ||
            process.env.DB2_CONNECTION_STRING ||
            getDefaultConnectionString();

        const connection = await odbc.connect(connStr);
        console.log('[DB2] ✓ Direct connection established');
        return connection;
    } catch (error) {
        console.error('[DB2] Failed to establish direct connection:', error);
        throw error;
    }
}

/**
 * Create transaction from direct connection
 * Useful for one-off transactional operations
 */
export async function createTransaction(
    connectionString?: string
): Promise<Transaction> {
    try {
        const connection = await db(connectionString);
        const transaction = new Transaction(connection);
        await transaction.begin();
        return transaction;
    } catch (error) {
        console.error('[DB2] Failed to create transaction:', error);
        throw error;
    }
}

/**
 * Get default connection string based on environment
 */
function getDefaultConnectionString(): string {
    // Use DB2_CONNECTION_STRING and DB2_LIBRARY from .env
    const connectionString = process.env.DB2_CONNECTION_STRING || '';
    const library = process.env.DB2_LIBRARY || '';

    if (!connectionString) {
        throw new Error('DB2_CONNECTION_STRING not set in .env');
    }
    if (!library) {
        throw new Error('DB2_LIBRARY not set in .env');
    }

    // Append library to connection string if not present
    let finalConnectionString = connectionString;
    if (!/DefaultLibraries=/i.test(connectionString)) {
        finalConnectionString += `;DefaultLibraries=${library}`;
    }
    return finalConnectionString;
}

/**
 * Initialize DB2 pool on application startup
 */
export async function initializeDB2Pool(): Promise<DB2> {
    const connectionString = getDefaultConnectionString();

    console.log("Connection String - ", connectionString);


    if (!connectionString) {
        throw new Error('No DB2 connection string configured');
    }

    console.log("Database Lib", SCHEMA);


    const db2Instance = DB2.getInstance({ connectionString });
    await db2Instance.initialize();
    return db2Instance;
}

/**
 * Close DB2 pool on application shutdown
 */
export async function closeDB2Pool(): Promise<void> {
    const db2Instance = DB2.getInstance();
    await db2Instance.close();
}

export default DB2;
