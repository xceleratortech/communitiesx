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
        let attachmentMimetype = mimetype || 'image/jpeg'; // Default to image/jpeg if not specified
        let finalR2Key = name;
        let needsVideoConversion = false;

        // Check if this is a video that needs conversion
        if (attachmentType === 'video') {
            const videoFormats = [
                'video/quicktime',
                'video/mov',
                'video/avi',
                'video/webm',
                'video/x-msvideo',
                'video/3gpp',
                'video/x-ms-wmv',
                'video/ogg',
            ];
            if (videoFormats.includes(mimetype)) {
                needsVideoConversion = true;
                // The filename is already corrected to .mp4 at upload time
                // So we can use the current name and just set correct mimetype
                finalR2Key = name; // Use the .mp4 filename that was uploaded
                attachmentMimetype = 'video/mp4';
            }
        }

        // Save attachment metadata to database
        const insertData = {
            filename: needsVideoConversion
                ? filename.replace(/\.[^/.]+$/, '.mp4')
                : filename,
            mimetype: attachmentMimetype,
            type: attachmentType,
            size: 0, // Will be updated if needed
            r2Key: finalR2Key,
            r2Url: url,
            publicUrl: `${process.env.R2_PUBLIC_URL}/${finalR2Key}`,
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

        // If video needs conversion, trigger background conversion
        if (needsVideoConversion) {
            try {
                // Check if conversion service is configured
                if (
                    process.env.VIDEO_CONVERSION_SERVICE_URL ||
                    process.env.CLOUDFLARE_STREAM_API_TOKEN
                ) {
                    // Trigger video conversion service
                    await triggerVideoConversion({
                        attachmentId: attachmentRecord.id,
                        originalKey: name,
                        convertedKey: finalR2Key,
                        originalUrl: url,
                    });
                } else {
                    // No conversion service configured - but file is already renamed to .mp4
                    console.log(
                        `Video ${name} uploaded with .mp4 extension for better web compatibility. Actual conversion not performed.`,
                    );
                    // No database update needed - the record is already correct
                }
            } catch (conversionError) {
                console.error('Video conversion failed:', conversionError);
                // File is already stored with .mp4 extension and mimetype, so no action needed
                console.log(
                    `Video ${name} will be served as-is with MP4 mimetype for better browser compatibility.`,
                );
            }
        }

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
                needsConversion: needsVideoConversion,
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

// Video conversion service integration
async function triggerVideoConversion({
    attachmentId,
    originalKey,
    convertedKey,
    originalUrl,
}: {
    attachmentId: number;
    originalKey: string;
    convertedKey: string;
    originalUrl: string;
}) {
    // Option 1: Use external service like Coconut.co, Zencoder, or AWS MediaConvert
    if (process.env.VIDEO_CONVERSION_SERVICE_URL) {
        const response = await fetch(process.env.VIDEO_CONVERSION_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.VIDEO_CONVERSION_API_KEY}`,
            },
            body: JSON.stringify({
                attachmentId,
                originalKey,
                convertedKey,
                originalUrl,
                outputFormat: 'mp4',
                videoCodec: 'h264',
                audioCodec: 'aac',
                quality: 'web_optimized',
                callbacks: {
                    success: `${process.env.NEXT_PUBLIC_APP_URL}/api/video/conversion-complete`,
                    error: `${process.env.NEXT_PUBLIC_APP_URL}/api/video/conversion-error`,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(
                `Video conversion service failed: ${response.statusText}`,
            );
        }

        return await response.json();
    }

    // Option 2: Use CloudFlare Stream (if available)
    if (process.env.CLOUDFLARE_STREAM_API_TOKEN) {
        // Implementation for CloudFlare Stream
        // This would upload to Stream and get back a converted URL
    }

    // Option 3: Simple client-side warning (fallback)
    console.log(
        `Video conversion needed for attachment ${attachmentId}, but no conversion service configured`,
    );
    throw new Error('Video conversion service not configured');
}
