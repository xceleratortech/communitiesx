import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { attachments } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { attachmentId, error, originalKey, originalUrl } = body;

        if (!attachmentId) {
            return NextResponse.json(
                { error: 'Missing attachment ID' },
                { status: 400 },
            );
        }

        // Revert to original file if conversion failed
        if (originalKey && originalUrl) {
            await db
                .update(attachments)
                .set({
                    r2Key: originalKey,
                    r2Url: originalUrl,
                    updatedAt: new Date(),
                })
                .where(eq(attachments.id, attachmentId));
        }

        console.error(
            `Video conversion failed for attachment ${attachmentId}:`,
            error,
        );

        return NextResponse.json({
            success: true,
            message:
                'Video conversion error handled, reverted to original file',
        });
    } catch (error) {
        console.error('Error handling video conversion error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
