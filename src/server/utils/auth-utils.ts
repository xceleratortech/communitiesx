import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import {
    checkUserPermission,
    getUserRole,
    ServerPermissions,
} from './permission';
import {
    hasPermission,
    PermissionAction,
    PermissionContext,
} from '@/lib/permissions/permission';
import { auth } from '../auth/server';

export async function getCurrentUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    return user;
}

export async function getCurrentUserPermissions() {
    const user = await requireAuth();
    return ServerPermissions.fromUserId(user.id);
}

export async function requirePermission(
    context: 'app',
    action: PermissionAction,
): Promise<void>;
export async function requirePermission(
    context: 'org',
    action: PermissionAction,
): Promise<void>;
export async function requirePermission(
    context: 'community',
    action: PermissionAction,
    communityId: string,
): Promise<void>;
export async function requirePermission(
    context: PermissionContext,
    action: PermissionAction,
    contextId?: string,
): Promise<void>;

export async function requirePermission(
    context: PermissionContext,
    action: PermissionAction,
    contextId?: string,
) {
    const user = await requireAuth();

    const ok =
        context === 'community'
            ? await checkUserPermission(
                  user.id,
                  'community',
                  action,
                  contextId!,
              )
            : await checkUserPermission(user.id, context, action);

    if (!ok) redirect('/unauthorized');
}

export async function checkCurrentUserPermission(
    context: 'app',
    action: PermissionAction,
): Promise<boolean>;
export async function checkCurrentUserPermission(
    context: 'org',
    action: PermissionAction,
): Promise<boolean>;
export async function checkCurrentUserPermission(
    context: 'community',
    action: PermissionAction,
    communityId: string,
): Promise<boolean>;
export async function checkCurrentUserPermission(
    context: PermissionContext,
    action: PermissionAction,
    contextId?: string,
): Promise<boolean>;

export async function checkCurrentUserPermission(
    context: PermissionContext,
    action: PermissionAction,
    contextId?: string,
) {
    const user = await getCurrentUser();
    if (!user) return false;

    return checkUserPermission(user.id, context, action, contextId);
}

export async function getCurrentUserRole(
    context: 'app',
): Promise<string | null>;
export async function getCurrentUserRole(
    context: 'org',
): Promise<string | null>;
export async function getCurrentUserRole(
    context: 'community',
    communityId: string,
): Promise<string | null>;
export async function getCurrentUserRole(
    context: PermissionContext,
    contextId?: string,
): Promise<string | null>;

export async function getCurrentUserRole(
    context: PermissionContext,
    contextId?: string,
) {
    const user = await getCurrentUser();
    if (!user) return null;

    return getUserRole(user.id, context, contextId);
}

export const getCurrentUserAppRole = () => getCurrentUserRole('app');
export const getCurrentUserOrgRole = () => getCurrentUserRole('org');
export const getCurrentUserCommunityRole = (cid: string) =>
    getCurrentUserRole('community', cid);

export async function requireAppAdmin() {
    const perms = await getCurrentUserPermissions();
    if (!perms.isAppAdmin()) redirect('/unauthorized');
}

export async function checkIsAppAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;
    const perms = await ServerPermissions.fromUserId(user.id);
    return perms.isAppAdmin();
}

export async function hasAnyRoleInCommunity(cid: string) {
    const user = await getCurrentUser();
    if (!user) return false;
    const perms = await ServerPermissions.fromUserId(user.id);
    return perms.hasCommunityRole(cid);
}

export async function checkCurrentUserGeneralPermission(
    context: PermissionContext,
    action: PermissionAction,
    contextId?: string,
) {
    const user = await getCurrentUser();
    if (!user) return false;
    const perms = await ServerPermissions.fromUserId(user.id);
    return perms.checkPermission(context, action, contextId);
}

export async function checkCurrentUserSpecificPermission(
    context: PermissionContext,
    role: string,
    action: PermissionAction,
) {
    const user = await getCurrentUser();
    if (!user) return false;
    return hasPermission(context, role, action);
}

export const getCurrentUserCommunityPermissions = async (cid: string) => {
    const user = await getCurrentUser();
    if (!user) return [];
    const perms = await ServerPermissions.fromUserId(user.id);
    return perms.getCommunityPermissions(cid);
};

export const checkCurrentUserCommunityPermission = (
    cid: string,
    act: PermissionAction,
) => checkCurrentUserPermission('community', act, cid);
export const checkCurrentUserAppPermission = (act: PermissionAction) =>
    checkCurrentUserPermission('app', act);
export const checkCurrentUserOrgPermission = (act: PermissionAction) =>
    checkCurrentUserPermission('org', act);

export async function getCurrentUserPermissionData() {
    const user = await getCurrentUser();
    if (!user) return null;

    const perms = await ServerPermissions.fromUserId(user.id);
    const userDetails = perms.getUserDetails();

    return {
        appRole: perms.getAppRole(),
        orgRole: perms.getOrgRole(),
        communityRoles: perms.getCommunityRoles(),
        userDetails,
        isAppAdmin: perms.isAppAdmin(),
        checkPermission: (
            ctx: PermissionContext,
            act: PermissionAction,
            id?: string,
        ) => perms.checkPermission(ctx, act, id),
        checkAppPermission: (act: PermissionAction) =>
            perms.checkAppPermission(act),
        checkOrgPermission: (act: PermissionAction) =>
            perms.checkOrgPermission(act),
        checkCommunityPermission: (cid: string, act: PermissionAction) =>
            perms.checkCommunityPermission(cid, act),
        getCommunityRole: (cid: string) => perms.getCommunityRole(cid),
        getCommunityPermissions: (cid: string) =>
            perms.getCommunityPermissions(cid),
    };
}

export async function checkCurrentUserMultiplePermissions(
    checks: Array<{
        context: PermissionContext;
        action: PermissionAction;
        contextId?: string;
    }>,
) {
    const user = await getCurrentUser();
    if (!user) return checks.map(() => false);

    const perms = await ServerPermissions.fromUserId(user.id);
    return checks.map((c) =>
        perms.checkPermission(c.context, c.action, c.contextId),
    );
}
