import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/server/auth/server';
import { db } from '@/server/db';
import { attachments } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { encodeR2KeyForUrl } from '@/lib/utils';

// Video conversion service interfaces
interface VideoConversionRequest {
    attachmentId: number;
    originalKey: string;
    convertedKey: string;
    originalUrl: string;
}

interface VideoConversionService {
    convert(request: VideoConversionRequest): Promise<any>;
    isConfigured(): boolean;
}

// Coconut.co implementation
class CoconutVideoService implements VideoConversionService {
    isConfigured(): boolean {
        return !!(
            process.env.COCONUT_API_KEY && process.env.COCONUT_WEBHOOK_URL
        );
    }

    async convert(request: VideoConversionRequest): Promise<any> {
        const { attachmentId, originalKey, originalUrl } = request;

        const response = await fetch('https://api.coconut.co/v1/jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(process.env.COCONUT_API_KEY + ':').toString('base64')}`,
            },
            body: JSON.stringify({
                input: originalUrl,
                webhook: process.env.COCONUT_WEBHOOK_URL,
                outputs: {
                    mp4: {
                        path: originalKey.replace(/\.[^/.]+$/, '.mp4'),
                        video_codec: 'h264',
                        audio_codec: 'aac',
                        quality: 'web_optimized',
                        size: '1280x720',
                    },
                },
                metadata: {
                    attachmentId: attachmentId.toString(),
                    originalKey,
                    service: 'coconut',
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Coconut API failed: ${response.statusText}`);
        }

        return await response.json();
    }
}

// Zencoder implementation
class ZencoderVideoService implements VideoConversionService {
    isConfigured(): boolean {
        return !!(
            process.env.ZENCODER_API_KEY && process.env.ZENCODER_WEBHOOK_URL
        );
    }

    async convert(request: VideoConversionRequest): Promise<any> {
        const { attachmentId, originalKey, originalUrl } = request;

        const response = await fetch('https://app.zencoder.com/api/v2/jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Zencoder-Api-Key': process.env.ZENCODER_API_KEY!,
            },
            body: JSON.stringify({
                input: originalUrl,
                outputs: [
                    {
                        url: originalKey.replace(/\.[^/.]+$/, '.mp4'),
                        video_codec: 'h264',
                        audio_codec: 'aac',
                        quality: 'web_optimized',
                        width: 1280,
                        height: 720,
                        notifications: [process.env.ZENCODER_WEBHOOK_URL],
                        metadata: {
                            attachmentId: attachmentId.toString(),
                            originalKey,
                            service: 'zencoder',
                        },
                    },
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`Zencoder API failed: ${response.statusText}`);
        }

        return await response.json();
    }
}

// AWS MediaConvert implementation
class AWSMediaConvertService implements VideoConversionService {
    isConfigured(): boolean {
        return !!(
            process.env.AWS_ACCESS_KEY_ID &&
            process.env.AWS_SECRET_ACCESS_KEY &&
            process.env.AWS_REGION &&
            process.env.MEDIACONVERT_ENDPOINT
        );
    }

    async convert(request: VideoConversionRequest): Promise<any> {
        const { attachmentId, originalKey, originalUrl } = request;

        // Note: This is a simplified example. In production, you'd use the AWS SDK
        // and implement proper Signature V4 authentication
        const response = await fetch(
            `${process.env.MEDIACONVERT_ENDPOINT}/2017-08-29/jobs`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Amz-Target': 'MediaConvert.CreateJob',
                },
                body: JSON.stringify({
                    Role: process.env.MEDIACONVERT_ROLE_ARN,
                    Settings: {
                        Inputs: [
                            {
                                FileInput: originalUrl,
                                AudioSelectors: {},
                                VideoSelector: {},
                            },
                        ],
                        OutputGroups: [
                            {
                                Name: 'File Group',
                                Outputs: [
                                    {
                                        NameModifier: '_converted',
                                        ContainerSettings: {
                                            Container: 'MP4',
                                            Mp4Settings: {},
                                        },
                                        VideoDescription: {
                                            CodecSettings: {
                                                Codec: 'H_264',
                                                H264Settings: {
                                                    MaxBitrate: 2000000,
                                                    QvbrQualityLevel: 7,
                                                },
                                            },
                                        },
                                        AudioDescriptions: [
                                            {
                                                CodecSettings: {
                                                    Codec: 'AAC',
                                                    AacSettings: {
                                                        Bitrate: 128000,
                                                        CodecProfile: 'LC',
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    UserMetadata: {
                        attachmentId: attachmentId.toString(),
                        originalKey,
                        service: 'aws-mediaconvert',
                    },
                }),
            },
        );

        if (!response.ok) {
            throw new Error(
                `AWS MediaConvert API failed: ${response.statusText}`,
            );
        }

        return await response.json();
    }
}

// CloudFlare Stream implementation
class CloudFlareStreamService implements VideoConversionService {
    isConfigured(): boolean {
        return !!(
            process.env.CLOUDFLARE_STREAM_API_TOKEN &&
            process.env.CLOUDFLARE_ACCOUNT_ID
        );
    }

    async convert(request: VideoConversionRequest): Promise<any> {
        const { attachmentId, originalKey, originalUrl } = request;

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
                },
                body: JSON.stringify({
                    url: originalUrl,
                    meta: {
                        name: originalKey,
                        attachmentId: attachmentId.toString(),
                        originalKey,
                        service: 'cloudflare-stream',
                    },
                    requireSignedURLs: false,
                    watermark: null,
                    thumbnailTimestampPct: 0,
                }),
            },
        );

        if (!response.ok) {
            throw new Error(
                `CloudFlare Stream API failed: ${response.statusText}`,
            );
        }

        return await response.json();
    }
}

// Video conversion service factory
class VideoConversionServiceFactory {
    private static services: VideoConversionService[] = [
        new CoconutVideoService(),
        new ZencoderVideoService(),
        new AWSMediaConvertService(),
        new CloudFlareStreamService(),
    ];

    static getConfiguredService(): VideoConversionService | null {
        return this.services.find((service) => service.isConfigured()) || null;
    }

    static getAllConfiguredServices(): VideoConversionService[] {
        return this.services.filter((service) => service.isConfigured());
    }
}

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
            // URL-encode the key to handle characters like @ and & while preserving path slashes
            publicUrl: `${process.env.R2_PUBLIC_URL}/${encodeR2KeyForUrl(finalR2Key)}`,
            thumbnailUrl: null, // For video, can be set if available
            uploadedBy: session.user.id,
            postId: postId || null,
            communityId: communityId || null,
        };

        const [attachmentRecord] = await db
            .insert(attachments)
            .values(insertData)
            .returning();

        // If video needs conversion, trigger background conversion
        if (needsVideoConversion) {
            try {
                const conversionService =
                    VideoConversionServiceFactory.getConfiguredService();

                if (conversionService) {
                    console.log(
                        `Using ${conversionService.constructor.name} for video conversion`,
                    );

                    // Trigger video conversion service
                    await triggerVideoConversion(
                        {
                            attachmentId: attachmentRecord.id,
                            originalKey: name,
                            convertedKey: finalR2Key,
                            originalUrl: url,
                        },
                        conversionService,
                    );
                } else {
                    // No conversion service configured - but file is already renamed to .mp4
                    console.log(
                        `Video ${name} uploaded with .mp4 extension for better web compatibility. No conversion service configured.`,
                    );
                    console.log(
                        'Available services:',
                        VideoConversionServiceFactory.getAllConfiguredServices().map(
                            (s) => s.constructor.name,
                        ),
                    );
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
                url: `${process.env.R2_PUBLIC_URL}/${encodeR2KeyForUrl(attachmentRecord.r2Key)}`,
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
async function triggerVideoConversion(
    request: VideoConversionRequest,
    service: VideoConversionService,
): Promise<any> {
    try {
        console.log(
            `Starting video conversion with ${service.constructor.name}`,
        );
        const result = await service.convert(request);
        console.log(`Video conversion initiated successfully:`, result);
        return result;
    } catch (error) {
        console.error(
            `Video conversion failed with ${service.constructor.name}:`,
            error,
        );
        throw error;
    }
}
