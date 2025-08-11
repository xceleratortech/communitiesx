import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';
import { db } from '@/server/db';
import {
    attachments,
    communities as communitiesTable,
    posts as postsTable,
    communityMembers,
} from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { generatePresignedDownloadUrl } from '@/lib/r2';
import { ServerPermissions } from '@/server/utils/permission';
import { isOrgAdminForCommunity } from '@/lib/utils';

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
                    // Check org admin override for the community's org
                    const community = await db.query.communities.findFirst({
                        where: eq(
                            communitiesTable.id,
                            attachmentRecord.communityId,
                        ),
                        columns: { orgId: true },
                    });
                    if (
                        community &&
                        isOrgAdminForCommunity(session.user, community.orgId)
                    ) {
                        isAllowed = true;
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
                            columns: { orgId: true },
                        });
                        if (
                            community &&
                            isOrgAdminForCommunity(
                                session.user,
                                community.orgId,
                            )
                        ) {
                            isAllowed = true;
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

        // Generate presigned download URL
        const downloadUrl = await generatePresignedDownloadUrl(
            attachmentRecord.r2Key,
        );

        // Create proxy URL for download
        const proxyUrl = `https://edx-storage-proxy.xcelerator.co.in?proxyUrl=${encodeURIComponent(downloadUrl)}`;

        // Forward Range header (critical for mobile playback/seek)
        const rangeHeader = request.headers.get('range') ?? undefined;

        // Fetch the file from R2 via proxy and serve it directly
        const fileResponse = await fetch(proxyUrl, {
            method: 'GET',
            headers: rangeHeader ? { Range: rangeHeader } : undefined,
        });

        if (!fileResponse.ok) {
            throw new Error('Failed to fetch file from storage');
        }

        // Preserve streaming-related headers
        const responseHeaders = new Headers();

        const contentType =
            fileResponse.headers.get('content-type') ||
            attachmentRecord.mimetype ||
            'application/octet-stream';
        responseHeaders.set('Content-Type', contentType);

        for (const headerName of [
            'content-length',
            'content-range',
            'accept-ranges',
            'etag',
            'last-modified',
            'cache-control',
        ]) {
            const headerValue = fileResponse.headers.get(headerName);
            if (headerValue) {
                responseHeaders.set(headerName, headerValue);
            }
        }

        // Ensure defaults if not provided by origin
        if (!responseHeaders.has('accept-ranges')) {
            responseHeaders.set('accept-ranges', 'bytes');
        }
        if (!responseHeaders.has('cache-control')) {
            responseHeaders.set('cache-control', 'public, max-age=3600');
        }

        return new NextResponse(fileResponse.body, {
            status: fileResponse.status, // 200 or 206
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('Error serving image:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
