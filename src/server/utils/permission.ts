import {
    getAllPermissions,
    hasPermission,
    PermissionAction,
    PermissionContext,
} from '@/lib/permissions/permission';
import { getUserPermission } from '../trpc/services/user-service';

interface UserPermissionData {
    appRole: string | null;
    orgRole: string | null;
    communityRoles: Array<{
        communityId: string;
        role: string;
        orgId: string | null;
    }>;
    userDetails: {
        id: string;
        name: string;
        email: string;
        role: string;
        orgId: string | null;
    } | null;
}

export class ServerPermissions {
    private permissionData: UserPermissionData;

    private constructor(permissionData: UserPermissionData) {
        this.permissionData = permissionData;
    }

    static async fromUserId(userId: string) {
        const data = await getUserPermission(userId);

        return new ServerPermissions({
            appRole: data.appRole ?? null,
            orgRole: data.orgRole ?? null,
            communityRoles: data.communityRoles ?? [],
            userDetails: data.userDetails,
        });
    }

    isAppAdmin(): boolean {
        return hasPermission(
            'app',
            this.permissionData.appRole,
            '*' as PermissionAction,
        );
    }

    checkAppPermission(action: PermissionAction): boolean {
        return (
            this.isAppAdmin() ||
            hasPermission('app', this.permissionData.appRole, action)
        );
    }

    checkOrgPermission(action: PermissionAction): boolean {
        // Super admins can perform any org action
        if (this.isAppAdmin()) return true;

        return hasPermission('org', this.permissionData.orgRole, action);
    }

    checkCommunityPermission(
        communityId: string,
        action: PermissionAction,
    ): boolean {
        // Super admins can perform any community action
        if (this.isAppAdmin()) return true;

        const rec = this.permissionData.communityRoles.find(
            (c) => c.communityId === communityId,
        );
        if (!rec) return false;

        const allowed = new Set<string>([
            ...getAllPermissions('community', [rec.role]),
            ...getAllPermissions('org', [this.permissionData.orgRole]),
        ]);

        return allowed.has('*') || allowed.has(action);
    }

    checkPermission(
        context: PermissionContext,
        action: PermissionAction,
        contextId?: string,
    ): boolean {
        switch (context) {
            case 'app':
                return this.checkAppPermission(action);
            case 'org':
                return this.checkOrgPermission(action);
            case 'community':
                if (!contextId)
                    throw new Error(
                        'communityId is required for community context',
                    );
                return this.checkCommunityPermission(contextId, action);
            default:
                return false;
        }
    }

    getAppRole() {
        return this.permissionData.appRole;
    }
    getOrgRole() {
        return this.permissionData.orgRole;
    }
    getCommunityRole(communityId: string) {
        return (
            this.permissionData.communityRoles.find(
                (c) => c.communityId === communityId,
            )?.role ?? null
        );
    }
    getCommunityRoles() {
        return this.permissionData.communityRoles;
    }
    getCommunityPermissions(communityId: string): string[] {
        if (this.isAppAdmin()) return ['*'];

        const rec = this.permissionData.communityRoles.find(
            (c) => c.communityId === communityId,
        );
        if (!rec) return [];

        const perms = new Set<string>([
            ...getAllPermissions('community', [rec.role]),
            ...getAllPermissions('org', [this.permissionData.orgRole]),
        ]);
        return [...perms];
    }
    hasCommunityRole(cid: string) {
        return this.permissionData.communityRoles.some(
            (c) => c.communityId === cid,
        );
    }
    getUserDetails() {
        return this.permissionData.userDetails;
    }
}

export async function checkUserPermission(
    userId: string,
    context: PermissionContext,
    action: PermissionAction,
    contextId?: string,
): Promise<boolean>;
export async function checkUserPermission(
    userId: string,
    context: 'community',
    action: PermissionAction,
    communityId: string,
): Promise<boolean>;
export async function checkUserPermission(
    userId: string,
    context: 'app',
    action: PermissionAction,
): Promise<boolean>;
export async function checkUserPermission(
    userId: string,
    context: 'org',
    action: PermissionAction,
): Promise<boolean>;

export async function checkUserPermission(
    userId: string,
    context: PermissionContext,
    action: PermissionAction,
    contextId?: string,
) {
    const perms = await ServerPermissions.fromUserId(userId);
    return perms.checkPermission(context, action, contextId);
}

export async function getUserRole(
    userId: string,
    context: PermissionContext,
    contextId?: string,
): Promise<string | null>;
export async function getUserRole(
    userId: string,
    context: 'community',
    communityId: string,
): Promise<string | null>;
export async function getUserRole(
    userId: string,
    context: 'app',
): Promise<string | null>;
export async function getUserRole(
    userId: string,
    context: 'org',
): Promise<string | null>;

export async function getUserRole(
    userId: string,
    context: PermissionContext,
    contextId?: string,
): Promise<string | null> {
    const perms = await ServerPermissions.fromUserId(userId);

    switch (context) {
        case 'app':
            return perms.getAppRole();
        case 'org':
            return perms.getOrgRole();
        case 'community':
            if (!contextId)
                throw new Error(
                    'communityId is required for community context',
                );
            return perms.getCommunityRole(contextId);
        default:
            return null;
    }
}
