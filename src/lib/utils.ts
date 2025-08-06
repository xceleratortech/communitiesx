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
