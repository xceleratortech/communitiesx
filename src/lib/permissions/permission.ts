export const permissions = {
    app: {
        admin: ['*'] as const,
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
