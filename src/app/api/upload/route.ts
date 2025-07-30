import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        console.log(
            'Upload request headers:',
            Object.fromEntries(request.headers.entries()),
        );
        const session = await getUserSession(request.headers);
        console.log(
            'Session result:',
            session ? 'Session found' : 'No session',
        );

        if (!session?.user) {
            console.log('No user in session, returning 401');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            );
        }

        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 },
            );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'File must be an image' },
                { status: 400 },
            );
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size must be less than 5MB' },
                { status: 400 },
            );
        }

        // For now, we'll convert to base64 and return it
        // In a production environment, you would upload to a cloud storage service
        // like AWS S3, Cloudinary, or similar
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

        // TODO: Implement proper file upload to cloud storage
        // Example with a hypothetical cloud storage service:
        /*
        const uploadResult = await uploadToCloudStorage(file, {
            folder: 'community-images',
            userId: session.user.id,
        });
        
        return NextResponse.json({
            url: uploadResult.url,
            filename: uploadResult.filename,
        });
        */

        return NextResponse.json({
            url: base64,
            filename: file.name,
            size: file.size,
            type: file.type,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 },
        );
    }
}

// Optional: Add GET method to check if upload endpoint is available
export async function GET() {
    return NextResponse.json({ status: 'Upload endpoint available' });
}
