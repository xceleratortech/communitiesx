import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { attachments } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { attachmentId, convertedKey, convertedUrl, thumbnailUrl } = body;

        if (!attachmentId || !convertedKey) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 },
            );
        }

        // Update attachment record with converted video details
        await db
            .update(attachments)
            .set({
                r2Key: convertedKey,
                r2Url: convertedUrl,
                thumbnailUrl: thumbnailUrl || null,
                updatedAt: new Date(),
            })
            .where(eq(attachments.id, attachmentId));

        console.log(
            `Video conversion completed for attachment ${attachmentId}`,
        );

        return NextResponse.json({
            success: true,
            message: 'Video conversion completed successfully',
        });
    } catch (error) {
        console.error('Error handling video conversion completion:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
