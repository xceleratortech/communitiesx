import { db } from '@/server/db';
import { communityMembers, users } from '@/server/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';

export const getUserPermission = async (userId: string) => {
    try {
        const [user] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                orgId: users.orgId,
            })
            .from(users)
            .where(eq(users.id, userId));

        if (!user) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'User not found',
            });
        }

        const appRole = user.role;
        const orgRole = user.orgId
            ? appRole === 'admin'
                ? 'admin'
                : 'member'
            : null;

        const communityRows = await db
            .select({
                communityId: communityMembers.communityId,
                role: communityMembers.role,
                orgId: users.orgId,
            })
            .from(communityMembers)
            .innerJoin(users, eq(communityMembers.userId, users.id))
            .where(eq(communityMembers.userId, userId));

        const communityRoles = communityRows.map((r) => ({
            communityId: r.communityId.toString(),
            role: r.role,
            orgId: r.orgId,
        }));

        return {
            appRole,
            orgRole,
            communityRoles,
            userDetails: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                orgId: user.orgId,
            },
        };
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch user permissions',
        });
    }
};
