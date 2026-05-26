import './config/env'; // load env first
import express, { Express, Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerOptions } from './config/swagger';
import { join } from 'path';
import { existsSync } from 'fs';
import routes from './routes';
import cors from 'cors';
import { initializeDB2Pool, closeDB2Pool, getSchema } from './config/db2';
import { setupStatusEventHandlers, setupAuditLogEventHandlers } from './utils/email';


// ============================================================================
// CONFIGURATION
// ============================================================================

interface ServerConfig {
    port: number;
    env: string;
    isProduction: boolean;
    isDevelopment: boolean;
    database: {
        connectionString: string;
        environment: string;
    };
}

/**
 * Get port based on environment
 */
function getPort(): number {
    const environment = process.env.ENVIRONMENT || 'local';

    // Command-line override takes precedence
    if (process.env.PORT) {
        return parseInt(process.env.PORT, 10);
    }

    // Environment-based port defaults
    switch (environment) {
        case 'prod':
            return 7501;
        case 'uat':
            return 6501;
        case 'qa':
            return 5501;
        case 'local':
            return 4001
        default:
            return 3001;
    }
}


const port = getPort();
const SCHEMA = getSchema();

const serverConfig: ServerConfig = {
    port,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',
    database: {
        connectionString: process.env.DB2_CONNECTION_STRING || '',
        environment: process.env.ENVIRONMENT || process.env.NODE_ENV || 'development'
    }
};

// Validate configuration
if (isNaN(serverConfig.port) || serverConfig.port < 1 || serverConfig.port > 65535) {
    console.error('❌ Invalid PORT configuration. Must be between 1 and 65535');
    process.exit(1);
}
if (!serverConfig.database.connectionString) {
    console.error('❌ Database connection string not configured');
    process.exit(1);
}

// Initialize Express app
const app: Express = express();
const PORT: number = serverConfig.port;
const NODE_ENV: string = serverConfig.env;

// ============================================================================
// MIDDLEWARE
// ============================================================================

if (process.env.FREIGHT_IMAGE_PATH)
    app.use("/api/uploads/warehouse/freight-image", express.static(process.env.FREIGHT_IMAGE_PATH));

if (process.env.BAD_FREIGHT_IMAGE_PATH)
    app.use("/api/uploads/warehouse/bad-freight-image", express.static(process.env.BAD_FREIGHT_IMAGE_PATH));

// CORS middleware
app.use(cors({
    origin: '*', // You can restrict this to specific origins if needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
}));

// Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware (for tracing)
app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    (req as any).id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
});

// Enhanced request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = (req as any).id;

    // Log request
    const logData = {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    };

    // Capture response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
        const duration = Date.now() - startTime;
        console.log(JSON.stringify({
            ...logData,
            status: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        }));
        return originalJson(body);
    };

    next();
});

// Async error handler utility for routes/controllers
const use = (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================================
// SWAGGER SETUP
// ============================================================================
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: serverConfig.database.environment,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    });
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
    res.status(200).json({
        service: 'R&M Trucking Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
    });
});


//Test Api

// app.get('/api/permissions', async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const conn = await db();
//         const sql = `
//             SELECT
//                 "permissionId",
//                 "moduleName",
//                 "permissionName"
//             FROM "Permissions"
//         `;
//         const result = await conn.query(sql);
//         res.json({ success: true, data: result });
//     } catch (err) {
//         next(err);
//     }
// });


// Register all routes via common route handler
// This automatically mounts all module routes (auth, maintenance, warehouse-form, etc.)
app.use('/api', routes);


// SERVE REACT/FRONTEND STATIC BUILD
// Avoid using '*' route patterns (incompatible with path-to-regexp used by Express 5)
// Serve static files and fall back to index.html for client-side routing
// ============================================================================
const DIST_FOLDER = join(process.cwd(), '../frontend');

if (existsSync(DIST_FOLDER)) {
    console.log(`Serving static frontend from: ${DIST_FOLDER}`);
    app.use(express.static(DIST_FOLDER, { maxAge: '1y' }));

    // SPA fallback: only for GET requests that are not API or health checks
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/api/docs')) {
            const indexPath = join(DIST_FOLDER, 'index.html');
            if (existsSync(indexPath)) {
                return res.sendFile(indexPath);
            }
        }
        next();
    });
} else {
    console.warn(`Frontend build not found at: ${DIST_FOLDER}`);
}

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 handler (must be before error handler)
app.use((req: Request, res: Response) => {
    const requestId = (req as any).id;
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        requestId,
        timestamp: new Date().toISOString(),
    });
});

// Global error handling middleware (must be last)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).id;

    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId,
        error: err.message,
        stack: serverConfig.isDevelopment ? err.stack : undefined,
        method: req.method,
        path: req.path,
        ip: req.ip
    }, null, 2));

    res.status(500).json({
        error: 'Internal Server Error',
        message: serverConfig.isDevelopment ? err.message : 'An unexpected error occurred',
        requestId,
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

let server: Server | null = null;
let db2PoolInitialized = false;

/**
 * Start server
 */
async function startServer(): Promise<void> {
    try {
        // Initialize DB2 pool
        await initializeDB2Pool();
        db2PoolInitialized = true;
        console.log('DB2 pool initialized');

        // Initialize email event handlers
        setupStatusEventHandlers();
        console.log('Email handlers initialized');

        // Initialize audit log event handlers
        setupAuditLogEventHandlers();
        console.log('Audit log handlers initialized');
    } catch (err) {
        console.error('❌ Failed to initialize DB2 pool:', err);
        process.exit(1);
    }

    server = app.listen(PORT, () => {
        console.log(`Server started on http://localhost:${PORT} | Env: ${NODE_ENV} | DB: ${serverConfig.database.environment} | Started: ${new Date().toISOString()}`);
        console.log(`Port - ${process.env.PORT} | Database Lib - ${SCHEMA}`)
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use`);
            process.exit(1);
        }
        console.error('❌ Server error:', err.message);
        process.exit(1);
    });
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n📍 ${signal} received - starting graceful shutdown...`);

    if (!server) {
        if (db2PoolInitialized) {
            try {
                await closeDB2Pool();
                console.log('✓ DB2 pool closed');
            } catch (err) {
                console.error('Error closing DB2 pool:', err);
            }
        }
        process.exit(0);
    }

    // Set timeout for forceful shutdown (30 seconds)
    const shutdownTimeout = setTimeout(() => {
        console.error('❌ Graceful shutdown timeout - forcing exit');
        process.exit(1);
    }, 30000);

    server.close(async () => {
        clearTimeout(shutdownTimeout);
        console.log('✓ HTTP server closed');

        if (db2PoolInitialized) {
            try {
                await closeDB2Pool();
                console.log('✓ DB2 pool closed');
            } catch (err) {
                console.error('Error closing DB2 pool:', err);
            }
        }

        console.log('✓ All resources cleaned up');
        process.exit(0);
    });

    // Close any open connections after timeout
    setTimeout(() => {
        console.error('❌ Forced shutdown - closing all connections');
        process.exit(1);
    }, 35000);
}

// ============================================================================
// PROCESS EVENT HANDLERS
// ============================================================================

// Graceful shutdown on SIGTERM (Docker, Kubernetes)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    console.error('❌ Uncaught Exception:', err.message);
    console.error(err.stack);
    process.exit(1);
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});

// ============================================================================
// START SERVER
// ============================================================================

startServer();

export default app;
