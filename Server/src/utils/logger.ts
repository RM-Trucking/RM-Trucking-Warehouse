/**
 * Simple Logger utility for application logging
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    private formatMessage(level: LogLevel, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level}] [${this.context}] ${message}${dataStr}`;
    }

    debug(message: string, data?: any): void {
        console.log(this.formatMessage(LogLevel.DEBUG, message, data));
    }

    info(message: string, data?: any): void {
        console.log(this.formatMessage(LogLevel.INFO, message, data));
    }

    warn(message: string, data?: any): void {
        console.warn(this.formatMessage(LogLevel.WARN, message, data));
    }

    error(message: string, error?: any): void {
        const errorData = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : error;
        console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
    }
}
