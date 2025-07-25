import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';

export async function PUT(request: NextRequest) {
    try {
        // Get user session with headers
        const session = await getUserSession(request.headers);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );
        }

        const { searchParams } = new URL(request.url);
        const proxyUrl = searchParams.get('proxyUrl');

        if (!proxyUrl) {
            return NextResponse.json(
                { error: 'Missing proxyUrl parameter' },
                { status: 400 },
            );
        }

        // Get the image data from the request
        const imageData = await request.arrayBuffer();

        // Forward the image to R2 using the presigned URL
        const uploadResponse = await fetch(proxyUrl, {
            method: 'PUT',
            body: imageData,
            headers: {
                'Content-Type':
                    request.headers.get('content-type') || 'image/jpeg',
            },
        });

        if (!uploadResponse.ok) {
            console.error('R2 upload failed:', await uploadResponse.text());
            return NextResponse.json(
                { error: 'Failed to upload image to storage' },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in proxy upload:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
