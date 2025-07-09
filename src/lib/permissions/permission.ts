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
            'manage_community_members',
            'invite_community_members',
        ] as const,

        member: ['view_org', 'view_community'] as const,
    },

    community: {
        admin: [
            'view_community',
            'edit_community',
            'delete_community',
            'manage_community_members',
            'invite_community_members',

            'create_task',
            'edit_task',
            'delete_task',
            'view_task',
            'manage_task',
            'view_pow',

            'add_milestone_submission',
            'delete_milestone_submission',
        ] as const,

        moderator: [
            'view_community',
            'edit_community',
            'manage_community_members',
            'invite_community_members',

            'create_task',
            'edit_task',
            'delete_task',
            'view_task',
            'manage_task',
            'view_pow',
        ] as const,

        member: [
            'view_community',
            'view_task',
            'add_milestone_submission',
        ] as const,
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
