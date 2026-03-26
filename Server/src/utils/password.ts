import bcrypt from 'bcryptjs';

/**
 * Password utility functions for user management
 */

/**
 * Generate a random password
 * @param length Password length (default: 12)
 * @returns Random password string
 */
export function generatePassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

/**
 * Hash a password using bcrypt (12 rounds)
 * @param password Plain text password
 * @returns Hashed password (synchronous)
 */
export function hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(12);
    return bcrypt.hashSync(password, salt);
}

/**
 * Hash password asynchronously
 * @param password Plain text password
 * @returns Promise with hashed password
 */
export async function hashPasswordAsync(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

/**
 * Verify a password against its hash
 * @param password Plain text password to verify
 * @param hash Stored password hash (bcrypt hash)
 * @returns true if password matches, false otherwise
 */
export function verifyPassword(password: string, hash: string): boolean {
    try {
        return bcrypt.compareSync(password, hash);
    } catch (error) {
        return false;
    }
}

/**
 * Verify password asynchronously
 * @param password Plain text password to verify
 * @param hash Stored password hash (bcrypt hash)
 * @returns Promise with boolean result
 */
export async function verifyPasswordAsync(password: string, hash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        return false;
    }
}

/**
 * Create password hash (same as hashPassword for consistency)
 * @param password Plain text password
 * @returns Hashed password
 */
export function createPasswordHash(password: string): string {
    return hashPassword(password);
}

/**
 * Verify stored password hash
 * @param password Plain text password to verify
 * @param storedHash Stored password hash (bcrypt hash)
 * @returns true if password matches, false otherwise
 */
export function verifyStoredPassword(password: string, storedHash: string): boolean {
    return verifyPassword(password, storedHash);
}
