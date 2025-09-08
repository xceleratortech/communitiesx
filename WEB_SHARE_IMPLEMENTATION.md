# Web Share Implementation

This document describes the implementation of Web Share API and Web Share Target functionality in the Community-X PWA.

## Overview

The implementation provides two main features:

1. **Web Share API**: Allows users to share content from the PWA to other apps
2. **Web Share Target**: Allows other apps to share content into the PWA

## Features Implemented

### 1. Web Share API (Sharing FROM the PWA)

#### Components Created:

- `useWebShare` hook (`src/hooks/use-web-share.ts`)
- `ShareButton` component (`src/components/ui/share-button.tsx`)
- `ShareDialog` component (`src/components/ui/share-dialog.tsx`)

#### Integration Points:

- Individual post pages (`src/app/posts/[id]/page.tsx`)
- Community posts list (`src/components/community/CommunityPosts.tsx`)
- Main posts feed (`src/app/posts/page.tsx`)

#### Features:

- Share post titles, content, and URLs
- Support for file sharing (images, PDFs, text files)
- Graceful fallback when Web Share API is not supported
- Loading states and error handling
- Success feedback with toast notifications

### 2. Web Share Target (Sharing TO the PWA)

#### Components Created:

- Share target page (`src/app/share-target/page.tsx`)
- Service worker updates (`public/sw.js`)
- Manifest configuration (`src/app/manifest.ts`)

#### Features:

- Receive shared content from other apps
- Support for text, URLs, and files
- File preview for images
- Create posts from shared content
- Form validation and error handling
- Integration with existing post creation flow

## Technical Implementation

### Web Share API Hook

```typescript
const { isSupported, isSharing, share, error } = useWebShare();

// Share content
await share({
    title: 'Post Title',
    text: 'Post content',
    url: 'https://example.com/post/123',
    files: [file1, file2], // optional
});
```

### Share Button Component

```tsx
<ShareButton
    title="Post Title"
    text="Check out this post!"
    url="https://example.com/post/123"
    variant="outline"
    size="sm"
>
    Share
</ShareButton>
```

### Share Dialog Component

```tsx
<ShareDialog
    title="Post Title"
    text="Post content"
    url="https://example.com/post/123"
    trigger={<Button>Share</Button>}
/>
```

### Web Share Target Configuration

The manifest includes share target configuration:

```json
{
    "share_target": {
        "action": "/share-target",
        "method": "POST",
        "enctype": "multipart/form-data",
        "params": {
            "title": "title",
            "text": "text",
            "url": "url",
            "files": [
                {
                    "name": "file",
                    "accept": [
                        "image/*",
                        "text/plain",
                        "application/pdf",
                        "video/*"
                    ]
                }
            ]
        }
    }
}
```

## Browser Support

### Web Share API Support:

- ✅ Android Chrome (mobile)
- ✅ Android Samsung Internet
- ✅ iOS Safari (mobile)
- ✅ Chrome OS
- ✅ Windows Edge (limited)
- ❌ Desktop Chrome
- ❌ Desktop Firefox
- ❌ Desktop Safari

### Web Share Target Support:

- ✅ Android Chrome (mobile)
- ✅ Android Samsung Internet
- ✅ iOS Safari (mobile)
- ✅ Chrome OS
- ❌ Desktop browsers (limited)

## Usage Examples

### 1. Basic Share Button

```tsx
import { ShareButton } from '@/components/ui/share-button';

<ShareButton
    title="My Post"
    text="Check this out!"
    url="https://myapp.com/post/123"
/>;
```

### 2. Share with Dialog

```tsx
import { ShareDialog } from '@/components/ui/share-dialog';

<ShareDialog
    title="My Post"
    text="Check this out!"
    url="https://myapp.com/post/123"
    trigger={<Button>Share</Button>}
/>;
```

### 3. Custom Share Implementation

```tsx
import { useWebShare } from '@/hooks/use-web-share';

function MyComponent() {
    const { share, isSupported } = useWebShare();

    const handleShare = async () => {
        if (isSupported) {
            await share({
                title: 'Custom Title',
                text: 'Custom content',
                url: window.location.href,
            });
        }
    };

    return <button onClick={handleShare}>Share</button>;
}
```

## Testing

### Test Page

A test page is available at `/share-test` to test both Web Share API and Web Share Target functionality.

### Testing Web Share API:

1. Open the test page on a supported device
2. Fill in the share form
3. Click "Share Directly" or use the share components
4. Verify the native share sheet appears

### Testing Web Share Target:

1. Install the PWA on a mobile device
2. Open another app (browser, social media, etc.)
3. Find content to share
4. Tap the share button
5. Look for "Community-X" in the share menu
6. Select it and verify content appears in the share target page

## File Structure

```
src/
├── hooks/
│   └── use-web-share.ts              # Web Share API hook
├── components/
│   └── ui/
│       ├── share-button.tsx          # Share button component
│       └── share-dialog.tsx          # Share dialog component
├── app/
│   ├── share-target/
│   │   └── page.tsx                  # Share target handler
│   ├── share-test/
│   │   └── page.tsx                  # Test page
│   ├── posts/
│   │   ├── [id]/page.tsx            # Individual post (with share)
│   │   └── page.tsx                  # Posts feed (with share)
│   └── manifest.ts                   # PWA manifest with share target
public/
└── sw.js                            # Service worker with share handling
```

## Security Considerations

1. **File Validation**: Only accept specific file types (images, text, PDFs)
2. **Content Sanitization**: Use existing SafeHtml component for content
3. **Size Limits**: Consider implementing file size limits
4. **URL Validation**: Validate shared URLs before processing

## Future Enhancements

1. **Community Selection**: Allow users to choose which community to post to
2. **Draft Saving**: Save shared content as drafts if user cancels
3. **Rich Previews**: Generate rich link previews for shared URLs
4. **Batch Sharing**: Support sharing multiple items at once
5. **Share Analytics**: Track sharing patterns and popular content

## Troubleshooting

### Common Issues:

1. **Web Share API not working**:
    - Check browser support
    - Ensure HTTPS is enabled
    - Verify PWA is installed

2. **Share Target not appearing**:
    - Check manifest.json configuration
    - Ensure service worker is registered
    - Verify PWA is installed

3. **Files not sharing**:
    - Check file type restrictions
    - Verify browser supports file sharing
    - Check file size limits

### Debug Mode:

Set `NODE_ENV=development` to see additional debug information in the console.

## Conclusion

The Web Share implementation provides a seamless way for users to share content both from and to the Community-X PWA, enhancing the overall user experience and making the app more integrated with the user's device ecosystem.
