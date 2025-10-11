import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';

export async function GET(request: NextRequest) {
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

        // Fetch the file from R2 using the presigned URL
        const downloadResponse = await fetch(proxyUrl, {
            method: 'GET',
        });

        if (!downloadResponse.ok) {
            console.error('R2 download failed:', await downloadResponse.text());
            return NextResponse.json(
                { error: 'Failed to download file from storage' },
                { status: 500 },
            );
        }

        // Get the file data
        const fileBuffer = await downloadResponse.arrayBuffer();

        // Return the file with proper headers
        return new NextResponse(fileBuffer, {
            status: downloadResponse.status,
            headers: {
                'Content-Type':
                    downloadResponse.headers.get('content-type') ||
                    'application/octet-stream',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error('Error in proxy download:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
