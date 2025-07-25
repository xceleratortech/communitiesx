import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';
import { db } from '@/server/db';
import { images } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { generatePresignedDownloadUrl } from '@/lib/r2';

export async function GET(
    request: NextRequest,
    { params }: { params: { imageId: string } },
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

        const imageId = parseInt(params.imageId);
        if (isNaN(imageId)) {
            return NextResponse.json(
                { error: 'Invalid image ID' },
                { status: 400 },
            );
        }

        // Get image record from database
        const imageRecord = await db.query.images.findFirst({
            where: eq(images.id, imageId),
        });

        if (!imageRecord) {
            return NextResponse.json(
                { error: 'Image not found' },
                { status: 404 },
            );
        }

        // Validate ownership (optional - you might want to allow public access)
        if (imageRecord.uploadedBy !== session.user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 },
            );
        }

        // Generate presigned download URL
        const downloadUrl = await generatePresignedDownloadUrl(
            imageRecord.r2Key,
        );

        // Create proxy URL for download
        const proxyUrl = `https://edx-storage-proxy.xcelerator.co.in?proxyUrl=${encodeURIComponent(downloadUrl)}`;

        // Fetch the image from R2 via proxy and serve it directly
        const imageResponse = await fetch(proxyUrl);

        if (!imageResponse.ok) {
            throw new Error('Failed to fetch image from R2');
        }

        const imageBuffer = await imageResponse.arrayBuffer();

        // Return the image with proper headers
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': imageRecord.mimetype || 'image/jpeg',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error('Error serving image:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
