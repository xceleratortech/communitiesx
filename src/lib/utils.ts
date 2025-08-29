import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Check if a user is an org admin for a specific community
 * @param user - The user object from session
 * @param communityOrgId - The orgId of the community
 * @returns boolean indicating if user is org admin for this community
 */
export function isOrgAdminForCommunity(
    user: { role?: string | null; orgId?: string | null } | null | undefined,
    communityOrgId: string | null | undefined,
): boolean {
    return !!(
        user?.role === 'admin' &&
        user?.orgId &&
        communityOrgId &&
        user.orgId === communityOrgId
    );
}

/**
 * Checks if HTML content is empty or contains only whitespace/empty elements
 * @param html - HTML string to check
 * @returns true if the content is empty or contains only empty elements
 */
export function isHtmlContentEmpty(html: string): boolean {
    if (!html || html.trim() === '') return true;

    // Remove HTML tags and check if the remaining text is empty
    const textContent = html.replace(/<[^>]*>/g, '').trim();
    if (textContent === '') return true;

    // Check for common empty HTML patterns
    const emptyPatterns = [
        /^<p><\/p>$/,
        /^<p>\s*<\/p>$/,
        /^<div><\/div>$/,
        /^<div>\s*<\/div>$/,
        /^<br\s*\/?>$/,
        /^<br\s*\/?>\s*<br\s*\/?>$/,
    ];

    return emptyPatterns.some((pattern) => pattern.test(html.trim()));
}

/**
 * Calculates and returns a human-readable relative time string
 * @param date - The date to calculate relative time from
 * @returns A string like "2 hours ago", "3 days ago", etc.
 */
export function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

/**
 * Validates and normalizes community role values to ensure they are safe
 * @param role - The role value to validate
 * @param validRoles - Array of valid role values
 * @param defaultValue - Default value to return if role is invalid
 * @returns A safe role value or the default
 */
export function validateRole<T extends string>(
    role: string | null | undefined,
    validRoles: readonly T[],
    defaultValue: T,
): T {
    if (!role || typeof role !== 'string') {
        return defaultValue;
    }

    return validRoles.includes(role as T) ? (role as T) : defaultValue;
}

/**
 * Validates and normalizes community post creation minimum role
 * @param role - The role value from the database
 * @returns A safe role value, defaults to 'member'
 */
export function validatePostCreationMinRole(
    role: string | null | undefined,
): 'member' | 'moderator' | 'admin' {
    return validateRole(
        role,
        ['member', 'moderator', 'admin'] as const,
        'member',
    );
}

/**
 * Validates and normalizes community type
 * @param type - The type value from the database
 * @returns A safe type value, defaults to 'public'
 */
export function validateCommunityType(
    type: string | null | undefined,
): 'public' | 'private' {
    return validateRole(type, ['public', 'private'] as const, 'public');
}
