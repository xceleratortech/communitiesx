# Resume Parsing Feature

This document describes the resume parsing feature that allows users to upload their resumes (PDF, DOC, DOCX) and automatically extract profile information using AI.

## Overview

The resume parsing feature uses AI to extract structured information from resume files and automatically populate user profiles. It supports:

- **File Formats**: PDF, DOC, DOCX
- **AI Processing**: Uses OpenRouter with Google Gemini 2.0 Flash for intelligent text extraction
- **Profile Integration**: Automatically updates user profiles based on extracted data
- **Role-based Updates**: Handles both mentor and mentee profiles

## Architecture

### Components

1. **Resume Parser Service** (`src/lib/services/resume-parser.ts`)
    - Handles file parsing (PDF/DOC/DOCX)
    - Uses AI to extract structured data
    - Returns standardized profile data

2. **tRPC Router** (`src/server/trpc/routers/resume.ts`)
    - `parseResume`: Parses uploaded files
    - `updateProfileFromResume`: Updates user profiles with extracted data

3. **Frontend Page** (`src/app/resume-upload/page.tsx`)
    - File upload interface
    - Progress tracking
    - Integration with tRPC mutations

4. **Test Page** (`src/app/test-resume/page.tsx`)
    - Simple testing interface for resume parsing

### Data Flow

1. User uploads resume file
2. File is converted to base64 and sent to tRPC
3. Resume parser service extracts text from file
4. AI processes text to extract structured profile data
5. Profile data is used to update user's profile in database
6. User is redirected to their profile page

## Setup

### Prerequisites

1. **OpenRouter API Key**: Required for AI processing

    ```bash
    # Add to .env file
    OPENROUTER_API_KEY=your_openrouter_api_key_here
    ```

2. **Dependencies**: Install required packages
    ```bash
    pnpm add ai @ai-sdk/openai-compatible pdf-parse mammoth multer @types/multer @types/pdf-parse
    ```

### Environment Variables

Add the following to your `.env` file:

```env
# OpenRouter API key for resume parsing
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Resume parser model (optional, defaults to meta-llama/llama-3.3-70b-instruct:nitro)
RESUME_PARSER_MODEL=meta-llama/llama-3.3-70b-instruct:nitro
```

## Usage

### For Users

1. Navigate to `/resume-upload`
2. Select a PDF, DOC, or DOCX file
3. Click "Upload & Process"
4. Wait for AI processing
5. Profile will be automatically updated
6. Redirected to profile page

### For Developers

#### Testing

1. Navigate to `/test-resume` for a simple test interface
2. Upload a resume file
3. View the parsed JSON output

#### API Endpoints

- **tRPC**: `resume.parseResume` and `resume.updateProfileFromResume`
- **REST**: `/api/resume/parse` (for testing)

#### Example Usage

```typescript
// Parse resume
const result = await api.resume.parseResume.mutateAsync({
    fileData: base64Data,
    fileName: 'resume.pdf',
    fileType: 'application/pdf',
});

// Update profile
await api.resume.updateProfileFromResume.mutateAsync({
    profileData: result.profileData,
});
```

## Extracted Data Structure

The AI extracts the following information:

```typescript
interface ResumeProfile {
    personalInfo: {
        name?: string;
        email?: string;
        phone?: string;
        location?: string;
        linkedin?: string;
    };
    summary?: string;
    experience?: Array<{
        title: string;
        company: string;
        startDate?: string;
        endDate?: string;
        description?: string;
    }>;
    education?: Array<{
        degree: string;
        institution: string;
        graduationYear?: string;
        gpa?: string;
    }>;
    skills?: string[];
    certifications?: Array<{
        name: string;
        issuer: string;
        date?: string;
    }>;
    careerGoals?: string;
}
```

## Database Integration

The extracted data is mapped to the existing database schema:

- **User table**: Name updates
- **Mentee/Mentor profiles**: Bio, job title, company
- **Experiences**: Transformed to match schema format
- **Education**: Transformed to match schema format
- **Skills**: Joined as comma-separated string
- **Certifications**: Transformed to match schema format

## Error Handling

- File type validation (PDF, DOC, DOCX only)
- File size limits (10MB)
- AI processing errors
- Database update failures
- Network connectivity issues

## Security Considerations

- File type validation on both client and server
- File size limits
- Base64 encoding for safe transmission
- Input sanitization for AI prompts
- Error messages don't expose sensitive information

## Performance

- File processing is done server-side
- AI calls are made to OpenAI API
- Progress tracking for user feedback
- Timeout handling for long-running operations

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

## Future Enhancements

- Support for more file formats (RTF, TXT)
- Batch processing for multiple files
- Custom AI prompts for different industries
- Resume comparison features
- Export parsed data in different formats
- Integration with job boards and ATS systems
