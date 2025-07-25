import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';
import { db } from '@/server/db';
import { images } from '@/server/db/schema';
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
        const { name, url, postId, communityId } = body;

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

        // Save image metadata to database
        const insertData = {
            filename,
            mimetype: 'image/jpeg', // Default, can be enhanced
            size: 0, // Will be updated if needed
            r2Key: name,
            r2Url: url,
            publicUrl: `${process.env.R2_PUBLIC_URL}/${name}`, // Keep original for now
            uploadedBy: session.user.id,
            postId: postId || null,
            communityId: communityId || null,
        };

        const [imageRecord] = await db
            .insert(images)
            .values(insertData)
            .returning();

        // Update the publicUrl to use our API endpoint
        await db
            .update(images)
            .set({ publicUrl: `/api/images/${imageRecord.id}` })
            .where(eq(images.id, imageRecord.id));

        return NextResponse.json({
            message: 'success',
            image: {
                id: imageRecord.id,
                filename: imageRecord.filename,
                size: imageRecord.size,
                mimetype: imageRecord.mimetype,
                key: imageRecord.r2Key,
                url: `/api/images/${imageRecord.id}`,
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
