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
