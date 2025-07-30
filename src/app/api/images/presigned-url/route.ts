import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';
import { generatePresignedUploadUrl, validateImageFile } from '@/lib/r2';
import { TRPCError } from '@trpc/server';

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
        const key = searchParams.get('key');
        const contentType = searchParams.get('contentType');

        if (!key || !contentType) {
            return NextResponse.json(
                { error: 'Missing key or contentType parameter' },
                { status: 400 },
            );
        }

        // Validate that the key starts with the user's email
        const userEmail = session.user.email?.toLowerCase();
        if (!userEmail || !key.toLowerCase().startsWith(userEmail)) {
            return NextResponse.json(
                { error: 'Invalid file key' },
                { status: 403 },
            );
        }

        // Generate presigned URL
        try {
            const presignedUrl = await generatePresignedUploadUrl(
                key,
                contentType,
            );
            return NextResponse.json({ url: presignedUrl });
        } catch (error) {
            console.error('Error generating presigned URL:', error);
            if (
                error instanceof Error &&
                error.message.includes('environment variables')
            ) {
                return NextResponse.json(
                    {
                        error: 'Server configuration error: R2 not properly configured',
                    },
                    { status: 500 },
                );
            }
            throw error; // Re-throw other errors
        }
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
