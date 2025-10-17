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

    // If contains media (images or our video placeholders), treat as non-empty
    const hasImage = /<img\b[^>]*src=/i.test(html);
    const hasVideoPlaceholder = /\[VIDEO:[^\]]+\]/i.test(html);
    const hasYouTubeEmbed = /data-youtube-video/i.test(html);
    if (hasImage || hasVideoPlaceholder || hasYouTubeEmbed) return false;

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
 * Formats a date input into a human-readable relative time string
 * @param dateInput - The date to format (string, number, or Date)
 * @returns A string like "Just now", "2 minutes ago", "3 hours ago", etc.
 */
export function formatRelativeTime(dateInput: string | number | Date): string {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? '' : 's'} ago`;
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

/**
 * Formats a number into a compact notation (e.g., 1.2K, 3.4M)
 * @param num - The number to format
 * @returns A formatted string with compact notation
 */
export function formatCount(num: number): string {
    return new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(num);
}

/**
 * Generates initials from a name (first letter of first and last word)
 * @param name - The name to generate initials from
 * @returns The initials in uppercase, or empty string if no name provided
 */
export function getInitials(name?: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * Interface for member avatar data
 */
export interface MemberAvatar {
    src?: string;
    initials?: string;
}

/**
 * Encodes an R2 key for use in a public URL by URL-encoding each path segment
 * This handles characters like @, &, and spaces while preserving path structure
 * @param key - The R2 key to encode
 * @returns The URL-encoded key
 */
export function encodeR2KeyForUrl(key: string): string {
    return key.split('/').map(encodeURIComponent).join('/');
}

/**
 * Generates member avatar data from community members
 * @param members - Array of community members
 * @param limit - Maximum number of avatars to generate (default: 3)
 * @returns Array of member avatar data
 */
export function generateMemberAvatars(
    members: Array<{ user?: { name?: string; image?: string | null } }>,
    limit: number = 3,
): MemberAvatar[] {
    return members.slice(0, limit).map((member) => {
        const imageId = member?.user?.image;
        // Normalize image URL: accept full URLs, legacy /api/images paths, or bare keys
        let imageUrl: string | undefined = undefined;
        if (imageId) {
            if (imageId.startsWith('http')) {
                imageUrl = imageId;
            } else if (imageId.startsWith('/api/images/')) {
                imageUrl = imageId;
            } else if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
                imageUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${encodeR2KeyForUrl(imageId)}`;
            } else {
                imageUrl = `/api/images/${imageId}`;
            }
        }

        return {
            src: imageUrl,
            initials: getInitials(member?.user?.name),
        };
    });
}
