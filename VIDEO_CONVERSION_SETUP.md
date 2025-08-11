# Video Conversion Setup

This document explains how to set up automatic video conversion for better cross-platform compatibility, especially iOS Safari.

## Why Video Conversion is Needed

iOS Safari is very strict about video formats and codecs:

- Only supports H.264 video codec with AAC audio in MP4 containers
- Requires `playsinline` attribute for inline playback
- Other formats like WebM, AVI, MOV may not play consistently

## Current Implementation

The app now automatically detects videos that need conversion and triggers background processing to convert them to web-compatible MP4 format.

### Supported Input Formats

- MP4 (H.264) - no conversion needed
- MOV (QuickTime) - converted to MP4
- AVI - converted to MP4
- WebM - converted to MP4
- 3GP - converted to MP4
- WMV - converted to MP4
- OGV - converted to MP4

## Setup Options

### Option 1: External Video Conversion Service (Recommended)

#### Coconut.co

```bash
# Environment variables
VIDEO_CONVERSION_SERVICE_URL=https://api.coconut.co/v2/jobs
VIDEO_CONVERSION_API_KEY=your_coconut_api_key
```

Coconut.co example configuration:

```json
{
    "vars": {
        "vid": "video_id",
        "user": "user_email"
    },
    "source": "s3://your-bucket/$vid",
    "webhook": "https://your-app.com/api/video/conversion-complete",
    "outputs": {
        "mp4:720p": "s3://your-bucket/${vid}_converted.mp4",
        "jpg:300x200": "s3://your-bucket/${vid}_thumb.jpg"
    }
}
```

#### AWS MediaConvert

```bash
# Environment variables
AWS_MEDIACONVERT_ENDPOINT=https://mediaconvert.region.amazonaws.com
AWS_MEDIACONVERT_ROLE_ARN=arn:aws:iam::account:role/MediaConvertRole
```

#### Zencoder

```bash
# Environment variables
VIDEO_CONVERSION_SERVICE_URL=https://app.zencoder.com/api/v2/jobs
VIDEO_CONVERSION_API_KEY=your_zencoder_api_key
```

### Option 2: Cloudflare Stream

Cloudflare Stream handles conversion automatically:

```bash
# Environment variables
CLOUDFLARE_STREAM_API_TOKEN=your_stream_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### Option 3: Local FFmpeg (Development/Testing Only)

For development and testing, you can set up local FFmpeg conversion:

#### Prerequisites

```bash
# Install FFmpeg
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows (using Chocolatey)
choco install ffmpeg
```

#### Environment Variables

```bash
# Enable local FFmpeg conversion
USE_LOCAL_FFMPEG=true
FFMPEG_PATH=/usr/local/bin/ffmpeg  # or wherever ffmpeg is installed
```

#### Example Local Conversion Function

```typescript
// Add to confirm-upload route for local development
async function convertVideoLocally(
    inputPath: string,
    outputPath: string,
): Promise<void> {
    const ffmpeg = require('fluent-ffmpeg');

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-c:v libx264', // H.264 video codec
                '-c:a aac', // AAC audio codec
                '-profile:v main', // H.264 profile
                '-level 3.1', // H.264 level
                '-preset medium', // Encoding speed vs compression
                '-crf 23', // Quality (lower = better)
                '-movflags +faststart', // Enable streaming
                '-pix_fmt yuv420p', // Pixel format for compatibility
            ])
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}
```

**Note**: Local FFmpeg conversion should only be used for development. For production, use external services to avoid blocking the server and ensure scalability.

### Option 4: Client-side Fallback (No Service)

If no conversion service is configured, the app will:

1. Log a warning about the unconverted video
2. Use the original file as-is
3. Apply iOS-compatible video attributes where possible

## Video Rendering Improvements

The app now includes enhanced video rendering with iOS-specific attributes:

- `playsinline` - Prevents fullscreen playback on iOS
- `webkit-playsinline` - Safari-specific inline playback
- `preload="metadata"` - Loads video metadata only
- `muted` - Required for autoplay on mobile
- `crossorigin="anonymous"` - CORS handling
- `x-webkit-airplay="allow"` - AirPlay support

## Testing Video Compatibility

### Test on Multiple Devices

1. iOS Safari (iPhone/iPad)
2. Android Chrome
3. Desktop browsers (Chrome, Firefox, Safari)

### Common Issues

- **Video doesn't play on iOS**: Check H.264/AAC encoding
- **Video plays but no controls**: Ensure `controls` attribute is present
- **Video opens fullscreen**: Add `playsinline` attribute
- **Slow loading**: Use `preload="metadata"` instead of `preload="auto"`

### Quick Test Commands

```bash
# Check video codec information
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4

# Test iOS compatibility
ffmpeg -i input.mov -c:v libx264 -c:a aac -profile:v main -level 3.1 -movflags +faststart output.mp4
```

## Conversion Quality Settings

Recommended settings for web-optimized MP4:

- **Video Codec**: H.264 (x264)
- **Audio Codec**: AAC
- **Container**: MP4
- **Video Quality**: 720p for web (1080p for high-quality needs)
- **Audio Bitrate**: 128kbps AAC
- **Video Bitrate**: 1000-2000 kbps for 720p

## Monitoring and Debugging

### Check Conversion Status

- Monitor webhook calls to `/api/video/conversion-complete`
- Check server logs for conversion errors
- Verify converted files in R2 storage

### Common Debugging Steps

1. Check that webhook URLs are accessible
2. Verify API keys are correct
3. Ensure proper CORS headers for video files
4. Test video playback in different browsers

## Cost Considerations

### Video Conversion Services

- Coconut.co: ~$0.05-0.10 per minute of video
- AWS MediaConvert: ~$0.0075 per minute
- Zencoder: ~$0.05 per minute

### Storage Costs

- Original + converted files = 2x storage cost
- Consider cleanup policies for original files after conversion

## Future Enhancements

Potential improvements:

1. **Multiple Quality Levels**: Generate 480p, 720p, 1080p variants
2. **Adaptive Streaming**: HLS/DASH for large videos
3. **Thumbnail Generation**: Extract video thumbnails automatically
4. **Progress Indicators**: Show conversion progress to users
5. **Batch Processing**: Convert multiple videos efficiently
