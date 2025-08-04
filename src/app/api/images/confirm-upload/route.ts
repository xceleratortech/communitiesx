import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';
import { db } from '@/server/db';
import { attachments } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        // Get user session with headers
        const session = await getUserSession(request.headers);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { name, url, postId, communityId, mimetype, type } = body;

        if (!name || !url) {
            return NextResponse.json(
                { error: 'Missing name or url parameter' },
                { status: 400 },
            );
        }

        // Validate that the key starts with the user's email
        const userEmail = session.user.email?.toLowerCase();
        if (!userEmail || !name.toLowerCase().startsWith(userEmail)) {
            return NextResponse.json(
                { error: 'Invalid file key' },
                { status: 403 },
            );
        }

        // Extract filename from the key
        const filename = name.split('/').pop() || 'unknown';

        // Check if R2_PUBLIC_URL is set
        if (!process.env.R2_PUBLIC_URL) {
            console.error('R2_PUBLIC_URL environment variable is not set');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 },
            );
        }

        // Determine attachment type and mimetype
        const attachmentType = type || 'image'; // Default to image if not specified
        const attachmentMimetype = mimetype || 'image/jpeg'; // Default to image/jpeg if not specified

        // Save attachment metadata to database
        const insertData = {
            filename,
            mimetype: attachmentMimetype,
            type: attachmentType,
            size: 0, // Will be updated if needed
            r2Key: name,
            r2Url: url,
            publicUrl: `${process.env.R2_PUBLIC_URL}/${name}`,
            thumbnailUrl: null, // For video, can be set if available
            uploadedBy: session.user.id,
            postId: postId || null,
            communityId: communityId || null,
        };

        const [attachmentRecord] = await db
            .insert(attachments)
            .values(insertData)
            .returning();

        // Update the publicUrl to use our API endpoint
        await db
            .update(attachments)
            .set({ publicUrl: `/api/images/${attachmentRecord.id}` })
            .where(eq(attachments.id, attachmentRecord.id));

        return NextResponse.json({
            message: 'success',
            attachment: {
                id: attachmentRecord.id,
                filename: attachmentRecord.filename,
                size: attachmentRecord.size,
                mimetype: attachmentRecord.mimetype,
                type: attachmentRecord.type,
                key: attachmentRecord.r2Key,
                url: `/api/images/${attachmentRecord.id}`,
                thumbnailUrl: attachmentRecord.thumbnailUrl,
            },
        });
    } catch (error) {
        console.error('Error confirming upload:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
