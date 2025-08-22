import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import { z } from 'zod';
import * as mammoth from 'mammoth';
import { pdfToText } from 'pdf-ts';

// Schema for the extracted profile data that matches your UserProfileMetadata
export const ResumeProfileSchema = z.object({
    phoneNumber: z.string().optional(),
    location: z.string().optional(),
    linkedinUsername: z.string().optional(),
    experiences: z
        .array(
            z.object({
                id: z.string(),
                title: z.string(),
                company: z.string(),
                location: z.string().optional(),
                startDate: z.string(),
                endDate: z.string().optional(),
                description: z.string().optional(),
                isCurrent: z.boolean().optional(),
            }),
        )
        .optional(),
    educations: z
        .array(
            z.object({
                id: z.string(),
                degree: z.string(),
                institution: z.string(),
                fieldOfStudy: z.string(),
                startDate: z.string(),
                endDate: z.string().optional(),
                gpa: z.number().optional(),
                description: z.string().optional(),
            }),
        )
        .optional(),
    certifications: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                issuingOrganization: z.string(),
                issueDate: z.string(),
                expiryDate: z.string().optional(),
                credentialId: z.string().optional(),
                credentialUrl: z.string().optional(),
                description: z.string().optional(),
            }),
        )
        .optional(),
    skills: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                level: z.enum([
                    'beginner',
                    'intermediate',
                    'advanced',
                    'expert',
                ]),
                category: z.string().optional(),
                yearsOfExperience: z.number().optional(),
            }),
        )
        .optional(),
    achievements: z
        .array(
            z.object({
                id: z.string(),
                title: z.string(),
                description: z.string().optional(),
                date: z.string(),
                category: z.string().optional(),
                evidence: z.string().optional(),
            }),
        )
        .optional(),
    interests: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
});

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;

export class ResumeParserService {
    /**
     * Extract text from PDF file
     * Note: This is a simplified implementation. For production use, consider using a more robust PDF parsing library
     */
    private async extractTextFromPDF(buffer: Buffer): Promise<string> {
        try {
            const text = await pdfToText(buffer);
            return text;
        } catch (error) {
            throw new Error(`Failed to parse PDF: ${error}`);
        }
    }

    /**
     * Extract text from DOC/DOCX file
     */
    private async extractTextFromDoc(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (error) {
            throw new Error(`Failed to parse DOC/DOCX: ${error}`);
        }
    }

    /**
     * Extract text from file based on MIME type
     */
    private async extractTextFromFile(
        buffer: Buffer,
        mimeType: string,
        fileName?: string,
    ): Promise<string> {
        // Check file extension first (more reliable than MIME type)
        if (fileName) {
            const fileExtension = fileName.split('.').pop()?.toLowerCase();
            if (fileExtension === 'pdf') {
                return this.extractTextFromPDF(buffer);
            } else if (fileExtension === 'doc' || fileExtension === 'docx') {
                return this.extractTextFromDoc(buffer);
            } else {
                throw new Error(
                    'Unsupported file format. Please upload a DOC or DOCX file.',
                );
            }
        }

        // Fallback to MIME type checking
        if (mimeType.includes('pdf')) {
            return this.extractTextFromPDF(buffer);
        } else if (mimeType.includes('word') || mimeType.includes('document')) {
            return this.extractTextFromDoc(buffer);
        } else {
            throw new Error(
                'Unsupported file format. Please upload a DOC or DOCX file.',
            );
        }
    }

    /**
     * Parse resume text using OpenRouter API with Gemini 2.0 Flash
     */
    private async parseResumeWithAI(
        resumeText: string,
    ): Promise<ResumeProfile> {
        const prompt = `You are an expert resume parser. Extract structured information from the following resume text and return it as a JSON object.

Please extract the following information:
- Phone number (if available)
- Location (city, state, country, or general location)
- Work experience (title, company, location, start/end dates, description, current status)
- Education (degree, institution, field of study, start/end dates, GPA, description)
- Skills (name, level: beginner/intermediate/advanced/expert, category, years of experience)
- Certifications (name, issuing organization, issue date, expiry date, credential ID, URL, description)
- Achievements (title, description, date, category, evidence)
- Interests (personal and professional interests)
- Industries (professional industries/sectors the person has worked in)

IMPORTANT INSTRUCTIONS:
- Use empty strings ("") for missing values, not null
- For dates: Use ISO format (YYYY-MM-DD) when possible, or keep original format if unclear
- For "isCurrent": Set to true if the position is ongoing (no end date or contains words like "Present", "Current", "Now", "Ongoing")
- For skill levels: Default to "intermediate" if not specified
- Generate unique IDs for each item using simple numbers: 1, 2, 3, etc.
- For skills: If years of experience is mentioned, convert to number; otherwise omit the field entirely (don't use null)
- For GPA: If GPA is mentioned, convert to number; otherwise omit the field entirely (don't use null)
- NEVER use null values - either provide the actual value or omit the field entirely

Return the data in this exact JSON structure:
{
  "phoneNumber": "string or empty string",
  "location": "string or empty string",
  "experiences": [
    {
      "id": "1",
      "title": "string",
      "company": "string",
      "location": "string or empty string",
      "startDate": "string",
      "endDate": "string or empty string",
      "description": "string or empty string",
      "isCurrent": false
    }
  ],
  "educations": [
    {
      "id": "1",
      "degree": "string",
      "institution": "string",
      "fieldOfStudy": "string",
      "startDate": "string",
      "endDate": "string or empty string",
      "gpa": number or omit field entirely,
      "description": "string or empty string"
    }
  ],
  "skills": [
    {
      "id": "1",
      "name": "string",
      "level": "beginner|intermediate|advanced|expert",
      "category": "string or empty string",
      "yearsOfExperience": number or omit field entirely
    }
  ],
  "certifications": [
    {
      "id": "1",
      "name": "string",
      "issuingOrganization": "string",
      "issueDate": "string",
      "expiryDate": "string or empty string",
      "credentialId": "string or empty string",
      "credentialUrl": "string or empty string",
      "description": "string or empty string"
    }
  ],
  "achievements": [
    {
      "id": "1",
      "title": "string",
      "description": "string or empty string",
      "date": "string",
      "category": "string or empty string",
      "evidence": "string or empty string"
    }
  ],
  "interests": ["string"],
  "industries": ["string"]
}

Resume text:
${resumeText}

Return only the JSON object, no additional text or formatting. Use empty strings for missing values, never null. For numeric fields like GPA or years of experience, either provide the actual number or omit the field entirely - never use null.`;

        try {
            // Create OpenRouter-compatible provider
            const openrouter = createOpenAICompatible({
                name: 'openrouter',
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: process.env.OPENROUTER_API_KEY!,
            });

            const { text } = await generateText({
                model: openrouter(
                    process.env.RESUME_PARSER_MODEL ||
                        'google/gemini-2.0-flash-001',
                ),
                prompt,
                temperature: 0.1,
            });

            // Parse the JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to extract JSON from AI response');
            }

            const parsedData = JSON.parse(jsonMatch[0]);

            // Clean up the data before validation
            const cleanedData = {
                phoneNumber: parsedData.phoneNumber || '',
                location: parsedData.location || '',
                experiences:
                    parsedData.experiences?.map((exp: any, index: number) => ({
                        ...exp,
                        id: exp.id || `${index + 1}`,
                        location: exp.location || '',
                        startDate: exp.startDate || '',
                        endDate: exp.endDate || '',
                        description: exp.description || '',
                        isCurrent:
                            exp.isCurrent ??
                            (!exp.endDate ||
                                exp.endDate.toLowerCase().includes('present')),
                    })) || [],
                educations:
                    parsedData.educations?.map((edu: any, index: number) => ({
                        ...edu,
                        id: edu.id || `${index + 1}`,
                        fieldOfStudy: edu.fieldOfStudy || '',
                        startDate: edu.startDate || '',
                        endDate: edu.endDate || '',
                        description: edu.description || '',
                        gpa:
                            typeof edu.gpa === 'number' && !isNaN(edu.gpa)
                                ? edu.gpa
                                : undefined,
                    })) || [],
                skills:
                    parsedData.skills?.map((skill: any, index: number) => ({
                        ...skill,
                        id: skill.id || `${index + 1}`,
                        category: skill.category || '',
                        level: skill.level || 'intermediate',
                        yearsOfExperience:
                            typeof skill.yearsOfExperience === 'number' &&
                            !isNaN(skill.yearsOfExperience)
                                ? skill.yearsOfExperience
                                : undefined,
                    })) || [],
                certifications:
                    parsedData.certifications?.map(
                        (cert: any, index: number) => ({
                            ...cert,
                            id: cert.id || `${index + 1}`,
                            name: cert.name || '',
                            issuingOrganization: cert.issuingOrganization || '',
                            issueDate: cert.issueDate || '',
                            expiryDate: cert.expiryDate || '',
                            credentialId: cert.credentialId || '',
                            credentialUrl: cert.credentialUrl || '',
                            description: cert.description || '',
                        }),
                    ) || [],
                achievements:
                    parsedData.achievements?.map(
                        (achievement: any, index: number) => ({
                            ...achievement,
                            id: achievement.id || `${index + 1}`,
                            description: achievement.description || '',
                            category: achievement.category || '',
                            evidence: achievement.evidence || '',
                        }),
                    ) || [],
                interests: parsedData.interests || [],
                industries: parsedData.industries || [],
            };

            return ResumeProfileSchema.parse(cleanedData);
        } catch (error) {
            console.error('AI parsing error:', error);
            throw new Error(
                'Failed to parse resume with AI. Please try again.',
            );
        }
    }

    /**
     * Main method to parse resume file and extract profile data
     */
    async parseResume(
        buffer: Buffer,
        mimeType: string,
        fileName?: string,
    ): Promise<ResumeProfile> {
        try {
            // Extract text from the file
            const resumeText = await this.extractTextFromFile(
                buffer,
                mimeType,
                fileName,
            );

            if (!resumeText.trim()) {
                throw new Error('No text content found in the uploaded file.');
            }

            // Parse the text with AI
            const profileData = await this.parseResumeWithAI(resumeText);

            return profileData;
        } catch (error) {
            console.error('Resume parsing error:', error);
            throw error;
        }
    }
}

export const resumeParserService = new ResumeParserService();
