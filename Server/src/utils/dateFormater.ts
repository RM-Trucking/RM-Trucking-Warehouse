/**
 * Convert AS400 TIMESTAMP string or Date to a JavaScript Date (UTC)
 * @param as400Timestamp - e.g. "2026-03-25 11:28:51.558200" or a Date object
 * @returns Date object in UTC
 */
export const toUtcDate = (
    as400Timestamp: string | Date | null | undefined
): Date | null => {
    if (!as400Timestamp) return null;

    if (as400Timestamp instanceof Date) {
        // Already a Date object
        return as400Timestamp;
    }

    // Normalize AS400 TIMESTAMP string
    let normalized = as400Timestamp.trim().replace(" ", "T");

    // Trim fractional seconds to 3 digits (milliseconds)
    normalized = normalized.replace(/(\.\d{3})\d*/, "$1");

    // Append Z to mark UTC
    return new Date(normalized + "Z");
};

/**
 * FORMAT DATE FOR DB2
 * Converts JavaScript Date to DB2 compatible format (YYYY-MM-DD HH:MM:SS)
 * @param date - JavaScript Date object
 * @returns Formatted string: "YYYY-MM-DD HH:MM:SS"
 */
export function formatDateForDB2(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}