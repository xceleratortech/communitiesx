import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';
import { db } from '@/server/db';
import {
    attachments,
    communities as communitiesTable,
    posts as postsTable,
    communityMembers,
} from '@/server/db/schema';
import { users } from '@/server/db/auth-schema';
import { and, eq } from 'drizzle-orm';
import { generatePresignedDownloadUrl } from '@/lib/r2';
import { ServerPermissions } from '@/server/utils/permission';
import { isOrgAdminForCommunity, encodeR2KeyForUrl } from '@/lib/utils';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ imageId: string }> },
) {
    try {
        // Get user session with headers
        const session = await getUserSession(request.headers);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );
        }

        const resolvedParams = await params;
        const imageId = parseInt(resolvedParams.imageId);
        if (isNaN(imageId)) {
            return NextResponse.json(
                { error: 'Invalid image ID' },
                { status: 400 },
            );
        }

        // Get attachment record from database
        const attachmentRecord = await db.query.attachments.findFirst({
            where: eq(attachments.id, imageId),
        });

        if (!attachmentRecord) {
            return NextResponse.json(
                { error: 'Attachment not found' },
                { status: 404 },
            );
        }

        // Allow if uploaded by the current user
        if (attachmentRecord.uploadedBy === session.user.id) {
            // proceed
        } else {
            // Build permission context
            const perms = await ServerPermissions.fromUserId(session.user.id);
            const isAppAdmin = perms.isAppAdmin();

            let isAllowed = isAppAdmin;

            // Allow access to user profile pictures for users in the same organization
            if (
                !isAllowed &&
                attachmentRecord.type === 'image' &&
                !attachmentRecord.postId &&
                !attachmentRecord.communityId
            ) {
                // Check if this is a user profile picture by checking if the uploader is in the same org
                const uploaderUser = await db.query.users.findFirst({
                    where: eq(users.id, attachmentRecord.uploadedBy),
                    columns: { orgId: true },
                });

                if (
                    uploaderUser?.orgId &&
                    session.user.orgId &&
                    uploaderUser.orgId === session.user.orgId
                ) {
                    isAllowed = true;
                }
            }

            // If linked to a community directly, allow active members/followers or org admins of that org
            if (!isAllowed && attachmentRecord.communityId) {
                // Check membership (active)
                const membership = await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.userId, session.user.id),
                        eq(
                            communityMembers.communityId,
                            attachmentRecord.communityId,
                        ),
                        eq(communityMembers.status, 'active'),
                    ),
                });

                if (membership) {
                    isAllowed = true;
                } else {
                    // Check if this is a public community and user is from the same org
                    const community = await db.query.communities.findFirst({
                        where: eq(
                            communitiesTable.id,
                            attachmentRecord.communityId,
                        ),
                        columns: { orgId: true, type: true },
                    });

                    if (community) {
                        // For public communities, allow access if user is from the same org
                        if (
                            community.type === 'public' &&
                            session.user.orgId &&
                            community.orgId &&
                            session.user.orgId === community.orgId
                        ) {
                            isAllowed = true;
                        }
                        // Check org admin override for the community's org
                        else if (
                            isOrgAdminForCommunity(
                                session.user,
                                community.orgId,
                            )
                        ) {
                            isAllowed = true;
                        }
                    }
                }
            }

            // If linked to a post, evaluate based on post's community or org
            if (!isAllowed && attachmentRecord.postId) {
                const post = await db.query.posts.findFirst({
                    where: eq(postsTable.id, attachmentRecord.postId),
                    columns: { communityId: true, orgId: true },
                });

                if (post?.communityId) {
                    // Same logic as community-linked attachment
                    const membership =
                        await db.query.communityMembers.findFirst({
                            where: and(
                                eq(communityMembers.userId, session.user.id),
                                eq(
                                    communityMembers.communityId,
                                    post.communityId,
                                ),
                                eq(communityMembers.status, 'active'),
                            ),
                        });

                    if (membership) {
                        isAllowed = true;
                    } else {
                        const community = await db.query.communities.findFirst({
                            where: eq(communitiesTable.id, post.communityId),
                            columns: { orgId: true, type: true },
                        });

                        if (community) {
                            // For public communities, allow access if user is from the same org
                            if (
                                community.type === 'public' &&
                                session.user.orgId &&
                                community.orgId &&
                                session.user.orgId === community.orgId
                            ) {
                                isAllowed = true;
                            }
                            // Check org admin override for the community's org
                            else if (
                                isOrgAdminForCommunity(
                                    session.user,
                                    community.orgId,
                                )
                            ) {
                                isAllowed = true;
                            }
                        }
                    }
                } else if (post?.orgId) {
                    // Org-wide post: allow anyone from the same org
                    if (
                        session.user.orgId &&
                        session.user.orgId === post.orgId
                    ) {
                        isAllowed = true;
                    }
                }
            }

            if (!isAllowed) {
                return NextResponse.json(
                    { error: 'Access denied' },
                    { status: 403 },
                );
            }
        }

        // Redirect to public R2 URL (no egress through Vercel)
        if (!process.env.R2_PUBLIC_URL) {
            console.error('R2_PUBLIC_URL environment variable is not set');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 },
            );
        }

        const directUrl = `${process.env.R2_PUBLIC_URL}/${encodeR2KeyForUrl(attachmentRecord.r2Key)}`;
        const res = NextResponse.redirect(directUrl, 302);
        res.headers.set('cache-control', 'public, max-age=3600');
        return res;
    } catch (error) {
        console.error('Error serving image:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
