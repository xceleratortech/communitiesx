# Resume Parsing Implementation

This document describes the resume parsing feature that has been implemented in your project, allowing users to upload their resumes and automatically populate their profiles using AI.

## Overview

The resume parsing feature uses AI to extract structured information from resume files (PDF, DOC, DOCX) and automatically updates user profiles. It integrates seamlessly with your existing profile system and database schema.

## What Was Implemented

### 1. Resume Parser Service (`src/lib/services/resume-parser.ts`)

- **File Support**: PDF, DOC, and DOCX files
- **AI Processing**: Uses OpenRouter with Google Gemini 2.0 Flash for intelligent text extraction
- **Schema Matching**: Extracts data that matches your `UserProfileMetadata` interface
- **Error Handling**: Comprehensive error handling for file processing and AI parsing

### 2. tRPC Router (`src/server/trpc/routers/resume.ts`)

- **`parseResume`**: Parses uploaded files and returns structured profile data
- **`updateProfileFromResume`**: Updates user profiles with extracted data
- **Authentication**: Proper session validation for all operations
- **Field Selection**: Users can choose which sections to apply to their profile

### 3. Frontend Pages

- **Main Upload Page** (`src/app/resume-upload/page.tsx`): Full-featured resume upload and review interface
- **Test Page** (`src/app/test-resume/page.tsx`): Simple testing interface for developers

### 4. Navigation Integration

- Added "Upload Resume" link to the user menu in the navbar
- Accessible from `/resume-upload`

## Data Structure

The AI extracts the following information that matches your profile schema:

```typescript
interface ResumeProfile {
    phoneNumber?: string;
    experiences?: Array<{
        id: string;
        title: string;
        company: string;
        location?: string;
        startDate: string;
        endDate?: string;
        description?: string;
        isCurrent?: boolean;
    }>;
    educations?: Array<{
        id: string;
        degree: string;
        institution: string;
        fieldOfStudy: string;
        startDate: string;
        endDate?: string;
        gpa?: number;
        description?: string;
    }>;
    skills?: Array<{
        id: string;
        name: string;
        level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        category?: string;
        yearsOfExperience?: number;
    }>;
    certifications?: Array<{
        id: string;
        name: string;
        issuingOrganization: string;
        issueDate: string;
        expiryDate?: string;
        credentialId?: string;
        credentialUrl?: string;
        description?: string;
    }>;
    achievements?: Array<{
        id: string;
        title: string;
        description?: string;
        date: string;
        category?: string;
        evidence?: string;
    }>;
    interests?: string[];
}
```

## User Experience Flow

1. **Upload**: User selects a resume file (PDF, DOC, or DOCX)
2. **Processing**: File is converted to base64 and sent to the AI parser
3. **Review**: User reviews extracted data with checkboxes for each section
4. **Apply**: Selected data is applied to the user's profile
5. **Redirect**: User is redirected to their profile page

## Technical Implementation

### Dependencies Added

```bash
pnpm add ai @ai-sdk/openai-compatible mammoth multer @types/multer @types/pdf-parse
```

### Environment Variables Required

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
RESUME_PARSER_MODEL=google/gemini-2.0-flash-001
```

### Database Integration

- Uses your existing `user_profiles` table
- Stores extracted data in the `metadata` JSON column
- Preserves existing profile data when updating

### Security Features

- File type validation (client and server-side)
- File size limits (10MB maximum)
- Session validation for all operations
- Input sanitization for AI prompts

## Usage

### For Users

1. Navigate to `/resume-upload` or click "Upload Resume" in the user menu
2. Select a resume file
3. Review extracted data
4. Choose which sections to apply
5. Click "Apply to Profile"

### For Developers

1. Test the functionality at `/test-resume`
2. Use the tRPC procedures: `resume.parseResume` and `resume.updateProfileFromResume`
3. Check the console for detailed error messages

## Error Handling

The system provides specific error messages for common issues:

- File format not supported
- File too large
- No text content found
- AI processing failures
- Network errors
- Authentication issues

## Performance Considerations

- File processing is done server-side
- AI calls are made to OpenRouter API
- Progress tracking for user feedback
- Efficient base64 encoding/decoding
- Database operations are optimized

## Future Enhancements

Potential improvements that could be added:

- Support for more file formats (RTF, TXT)
- Batch processing for multiple files
- Custom AI prompts for different industries
- Resume comparison features
- Export parsed data in different formats
- Integration with job boards and ATS systems

## Troubleshooting

### Common Issues

1. **"Failed to parse resume"**
    - Check OpenRouter API key is set
    - Verify file format is supported
    - Check file size is under 10MB

2. **"No text content found"**
    - File may be corrupted or password-protected
    - Try a different file format

3. **"AI parsing error"**
    - Check OpenRouter API quota
    - Verify API key is valid
    - Check network connectivity

### Debug Mode

Use the test page at `/test-resume` to debug parsing issues:

1. Upload a problematic file
2. Check the console for detailed error messages
3. Verify the extracted text content
4. Test with different file formats

## Conclusion

The resume parsing feature is now fully integrated into your project and provides users with a seamless way to populate their profiles from resume files. The implementation follows your project's architecture patterns and integrates cleanly with your existing database schema and authentication system.

Users can now easily upload their resumes, review the AI-extracted information, and selectively apply it to their profiles, significantly improving the user experience for profile creation and updates.
