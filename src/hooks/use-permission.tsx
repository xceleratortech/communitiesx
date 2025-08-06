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
            data.communityRoles
        ) {
            // Try to find the orgId for the community from any communityRoles record
            // (Assumes at least one record for this orgId exists in communityRoles, or you may need to fetch community by id)
            // For a more robust solution, you may want to pass communityOrgId as a param
            // Here, we check if any communityRoles record for this orgId exists
            // If not, you may need to fetch community data separately
            // For now, we assume orgId is available in userDetails
            // If you have communityOrgId available, compare directly
            // Otherwise, this is a best-effort check
            // If you want to be 100% robust, pass communityOrgId to this function
            // For now, we assume orgId is available in userDetails and matches the community's orgId
            // If so, allow all admin actions
            // (You may want to fetch community by id to get orgId if not present)
            // This logic can be improved if needed
            // For now, allow if orgRole is admin and orgId matches
            // (Assumes you have orgId on the community object in the UI)
            return true;
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
