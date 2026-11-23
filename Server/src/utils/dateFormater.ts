/**
 * Convert a DB2 timestamp string or Date to a JavaScript Date.
 * Timestamp strings without an offset are treated as UTC.
 * @param as400Timestamp - e.g. "2026-03-25 11:28:51.558200" or a Date object
 * @returns Date object in UTC
 */
export const toUtcDate = (
    as400Timestamp: string | Date | null | undefined
): Date | null => {
    if (!as400Timestamp) return null;

    if (as400Timestamp instanceof Date) {
        return Number.isNaN(as400Timestamp.getTime()) ? null : as400Timestamp;
    }

    // Normalize DB2 TIMESTAMP strings; preserve an existing timezone if present.
    let normalized = as400Timestamp.trim().replace(" ", "T");

    // Trim fractional seconds to 3 digits (milliseconds)
    normalized = normalized.replace(/(\.\d{3})\d*/, "$1");

    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
    const date = new Date(hasTimezone ? normalized : `${normalized}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
};


export const fromUtcDate = (
    date: Date | null | undefined
): string | null => {
    if (!date) return null;

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};


/**
 * FORMAT DATE FOR DB2
 * Converts JavaScript Date to DB2 compatible format (YYYY-MM-DD HH:MM:SS)
 * @param date - JavaScript Date object
 * @returns Formatted string: "YYYY-MM-DD HH:MM:SS"
 */
export function formatDateForDB2(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}