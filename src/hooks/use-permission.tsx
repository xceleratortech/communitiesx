'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/providers/trpc-provider';
import {
    getAllPermissions,
    hasPermission,
    PermissionAction,
    PermissionContext,
} from '@/lib/permissions/permission';

interface CommunityRoleRecord {
    communityId: string;
    role: string;
    orgId: string | null;
}

interface UserDetails {
    id: string;
    name: string;
    email: string;
    role: string;
    orgId: string | null;
}

interface PermissionData {
    appRole: string | null;
    orgRole: string | null;
    communityRoles: CommunityRoleRecord[];
    userDetails: UserDetails | null;
    isLoading: boolean;
    error: string | null;
}

export function usePermission() {
    const [data, setData] = useState<PermissionData>({
        appRole: null,
        orgRole: null,
        communityRoles: [],
        userDetails: null,
        isLoading: true,
        error: null,
    });

    const {
        data: fetched,
        isLoading,
        error,
    } = trpc.users.getPermissions.useQuery();

    useEffect(() => {
        if (fetched) {
            setData({
                appRole: fetched.appRole ?? null,
                orgRole: fetched.orgRole ?? null,
                communityRoles: fetched.communityRoles ?? [],
                userDetails: fetched.userDetails ?? null,
                isLoading: false,
                error: null,
            });
        }
        if (error) {
            setData((prev) => ({
                ...prev,
                isLoading: false,
                error: error.message,
            }));
        }
    }, [fetched, error]);

    const isAppAdmin = () =>
        hasPermission('app', data.appRole, '*' as PermissionAction);

    const checkAppPermission = (action: PermissionAction) =>
        isAppAdmin() || hasPermission('app', data.appRole, action);

    const checkOrgPermission = (action: PermissionAction) => {
        // Super admins can perform any org action
        if (isAppAdmin()) return true;

        return hasPermission('org', data.orgRole, action);
    };

    const checkCommunityPermission = (
        communityId: string,
        action: PermissionAction,
    ): boolean => {
        // Super admins can perform any community action
        if (isAppAdmin()) return true;

        // Find the user's community membership record
        const record = data.communityRoles.find(
            (c) => c.communityId === communityId,
        );
        if (record) {
            const communityPerms = getAllPermissions('community', [
                record.role,
            ]);
            const orgPerms = getAllPermissions('org', [data.orgRole]);
            if (
                communityPerms.includes(action) ||
                orgPerms.includes(action) ||
                communityPerms.includes('*') ||
                orgPerms.includes('*')
            ) {
                return true;
            }
        }

        // --- ORG ADMIN OVERRIDE LOGIC ---
        // If user is org admin, check if the community belongs to their org

        if (
            data.orgRole === 'admin' &&
            data.userDetails?.orgId &&
            record?.orgId === data.userDetails.orgId
        ) {
            // Only allow if the community's orgId matches the user's orgId
            return hasPermission('org', data.orgRole, action);
        }

        return false;
    };

    const checkPermission = (
        context: PermissionContext,
        action: PermissionAction,
        resourceId?: string,
    ): boolean => {
        switch (context) {
            case 'app':
                return checkAppPermission(action);

            case 'org':
                return checkOrgPermission(action);

            case 'community':
                if (!resourceId) return false;
                return checkCommunityPermission(resourceId, action);

            default:
                return false;
        }
    };

    return {
        ...data,
        isAppAdmin,
        checkPermission,
        checkAppPermission,
        checkOrgPermission,
        checkCommunityPermission,
        getCommunityRole: (communityId: string) =>
            data.communityRoles.find((c) => c.communityId === communityId)
                ?.role ?? null,
        getCommunityPermissions: (communityId: string) => {
            if (isAppAdmin()) return ['*'];
            const rec = data.communityRoles.find(
                (c) => c.communityId === communityId,
            );
            if (!rec) return [];
            const union = new Set([
                ...getAllPermissions('community', [rec.role]),
                ...getAllPermissions('org', [data.orgRole]),
            ]);
            return [...union];
        },
    };
}
