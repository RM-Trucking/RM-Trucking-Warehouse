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
