export const permissions = {
    app: {
        admin: ['*'] as const, // Super admin has all permissions
        user: [] as const,
    },

    org: {
        admin: [
            'view_org',
            'update_org',
            'delete_org',
            'manage_org_members',
            'invite_org_members',

            'view_community',
            'edit_community',
            'delete_community',
            'create_community',
            'manage_community_members',
            'invite_community_members',
            'remove_community_creator',
            'assign_community_admin',

            'create_post',
            'edit_post',
            'delete_post',
            'view_post',

            'create_tag',
            'edit_tag',
            'delete_tag',
            'view_tag',

            'create_badge',
            'edit_badge',
            'delete_badge',
            'view_badge',
            'assign_badge',
            'unassign_badge',
        ] as const,

        member: [
            'view_org',
            'view_community',
            'create_post',
            'view_post',
        ] as const,
    },

    community: {
        admin: [
            'view_community',
            'edit_community',
            'delete_community',
            'manage_community_members',
            'invite_community_members',
            'remove_community_creator',
            'assign_community_admin',

            'create_post',
            'edit_post',
            'delete_post',
            'view_post',
        ] as const,

        moderator: [
            'view_community',
            'edit_community',
            'manage_community_members',
            'invite_community_members',

            'create_post',
            'edit_post',
            'delete_post',
            'view_post',

            'create_tag',
            'edit_tag',
            'delete_tag',
            'view_tag',
        ] as const,

        member: ['view_community', 'create_post', 'view_post'] as const,
    },
} as const;

type ExtractPermissions<T> =
    T extends Record<string, Record<string, readonly (infer U)[]>> ? U : never;

export type PermissionAction = ExtractPermissions<typeof permissions>;
export type PermissionContext = keyof typeof permissions;

export type AppRole = keyof typeof permissions.app;
export type OrgRole = keyof typeof permissions.org;
export type CommunityRole = keyof typeof permissions.community;

/**
 * Permission Hierarchy:
 *
 * 1. SuperAdmin (appRole=admin) - Overrides everything
 * 2. OrgAdmin (orgRole=admin) - Overrides CommunityAdmin for their org's communities
 * 3. CommunityAdmin - Manages their specific community
 * 4. CommunityModerator - Limited community management
 * 5. CommunityMember - Basic community access
 *
 * Hierarchy Rules:
 * - SuperAdmin can perform any action in any context
 * - OrgAdmin can perform any community action for communities in their organization
 * - CommunityAdmin can perform any action within their community
 * - Lower roles inherit permissions from higher roles in their context
 */

/**
 * Check if a role can override another role in the hierarchy
 */
export function canOverrideRole(
    context: PermissionContext,
    userRole: string | null | undefined,
    targetRole: string | null | undefined,
    orgRole?: string | null | undefined,
    appRole?: string | null | undefined,
): boolean {
    if (!userRole || !targetRole) return false;

    // SuperAdmin can override any role in any context
    if (appRole === 'admin') return true;

    // OrgAdmin can override any role in their org's communities
    if (orgRole === 'admin' && context === 'community') {
        return true; // OrgAdmin can override any community role
    }

    // OrgAdmin can override lower org roles
    if (userRole === 'admin' && context === 'org') {
        return (
            targetRole === 'admin' ||
            targetRole === 'moderator' ||
            targetRole === 'member'
        );
    }

    // CommunityAdmin can override lower community roles
    if (userRole === 'admin' && context === 'community') {
        return targetRole === 'moderator' || targetRole === 'member';
    }

    // CommunityModerator can override community members
    if (userRole === 'moderator' && context === 'community') {
        return targetRole === 'member';
    }

    return false;
}

/**
 * Get the effective role for a user in a specific context
 * This considers the hierarchy and overrides
 */
export function getEffectiveRole(
    context: PermissionContext,
    userRole: string | null | undefined,
    orgRole?: string | null | undefined,
    appRole?: string | null | undefined,
): string | null {
    if (!userRole) return null;

    // SuperAdmin has highest priority - can override any role in any context
    if (appRole === 'admin') return 'admin';

    // OrgAdmin can act as CommunityAdmin for their org's communities
    if (orgRole === 'admin' && context === 'community') {
        return 'admin'; // OrgAdmin should always be treated as admin in their org's communities
    }

    return userRole;
}

export function hasPermission(
    context: PermissionContext,
    role: string | undefined | null,
    action: PermissionAction,
): boolean {
    if (!role) return false;

    const ctxMap = permissions[context];
    if (!(role in ctxMap)) return false;

    const allowed = ctxMap[role as keyof typeof ctxMap] as readonly string[];
    return allowed.includes('*') || allowed.includes(action);
}

export function hasAnyPermission(
    context: PermissionContext,
    roles: (string | null | undefined)[],
    action: PermissionAction,
): boolean {
    return roles.some((r) => hasPermission(context, r, action));
}

export function getAllPermissions(
    context: PermissionContext,
    roles: (string | null | undefined)[],
): string[] {
    const out = new Set<string>();

    roles.forEach((r) => {
        if (!r) return;
        const ctxMap = permissions[context];
        if (!(r in ctxMap)) return;
        const list = ctxMap[r as keyof typeof ctxMap] as readonly string[];
        if (list.includes('*')) {
            (Object.values(ctxMap) as readonly string[][])
                .flat()
                .forEach((p) => out.add(p));
        } else {
            list.forEach((p) => out.add(p));
        }
    });

    return [...out];
}
