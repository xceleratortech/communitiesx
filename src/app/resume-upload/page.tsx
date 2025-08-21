'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload,
    FileText,
    ArrowLeft,
    CheckCircle,
    User,
    Briefcase,
    GraduationCap,
    Award,
    Lightbulb,
    Target,
    AlertTriangle,
    Info,
    Shield,
    Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export default function ResumeUploadPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parsedData, setParsedData] = useState<any>(null);
    const [selectedFields, setSelectedFields] = useState({
        phoneNumber: true,
        location: true,
        experiences: true,
        educations: true,
        skills: true,
        certifications: true,
        achievements: true,
        interests: true,
        industries: true,
    });

    const parseResumeMutation = trpc.resume.parseResume.useMutation();
    const updateProfileMutation =
        trpc.resume.updateProfileFromResume.useMutation();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];

        if (selectedFile) {
            // Check file extension first (more reliable than MIME type)
            const fileExtension = selectedFile.name
                .split('.')
                .pop()
                ?.toLowerCase();
            const validExtensions = ['pdf', 'doc', 'docx'];

            if (!fileExtension || !validExtensions.includes(fileExtension)) {
                toast.error('Please upload a PDF, DOC, or DOCX file.');
                return;
            }

            // Check file size (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error('File size must be less than 10MB');
                return;
            }

            setFile(selectedFile);
            toast.success('File selected successfully');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error('Please select a file first');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Convert file to base64
            setUploadProgress(10);
            const base64Data = await readFileAsBase64(file);
            setUploadProgress(30);

            // Parse the resume
            setUploadProgress(50);
            const result = await parseResumeMutation.mutateAsync({
                fileData: base64Data,
                fileName: file.name,
                fileType: file.type,
            });

            setUploadProgress(100);

            if (result.success && result.profileData) {
                setParsedData(result.profileData);
                setStep('preview');
                toast.success(
                    'Resume parsed successfully! Review the extracted data below.',
                );
            } else {
                throw new Error('Failed to parse resume');
            }
        } catch (error) {
            console.error('Resume processing error:', error);
            toast.error('Failed to process resume. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleApplyChanges = async () => {
        if (!parsedData) return;

        setIsUploading(true);

        try {
            const result = await updateProfileMutation.mutateAsync({
                profileData: parsedData,
                selectedFields,
            });

            setIsUploading(false);
            toast.success(result.message || 'Profile updated successfully!');

            // Redirect to profile page
            router.push('/profile');
        } catch (error) {
            setIsUploading(false);
            console.error('Profile update error:', error);
            toast.error('Failed to update profile. Please try again.');
        }
    };

    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleBack = () => {
        if (step === 'preview') {
            setStep('upload');
            setParsedData(null);
            setFile(null);
        } else {
            router.back();
        }
    };

    const toggleField = (field: keyof typeof selectedFields) => {
        setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    if (step === 'preview') {
        return (
            <div className="mx-auto max-w-4xl space-y-4 p-4">
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Upload
                    </Button>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">
                            Review Extracted Data
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Review and edit the information extracted from your
                            resume. Use the checkboxes to select which sections
                            to add to your profile.
                        </p>
                    </div>
                </div>

                {/* Important Disclaimer */}
                <Alert className="border-amber-200 bg-amber-50/80">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900">
                        <strong>Important</strong> AI-extracted data may contain
                        errors or inaccuracies. Please carefully review all
                        information before applying changes to your profile.
                    </AlertDescription>
                </Alert>

                <div className="space-y-6">
                    {/* Phone Number Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.phoneNumber}
                                onCheckedChange={() =>
                                    toggleField('phoneNumber')
                                }
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <User className="h-5 w-5" />
                                Phone Number
                            </h2>
                        </div>

                        {selectedFields.phoneNumber &&
                            parsedData.phoneNumber && (
                                <div className="bg-muted rounded-md p-3">
                                    <span className="text-sm">
                                        {parsedData.phoneNumber}
                                    </span>
                                </div>
                            )}
                    </section>

                    {/* Location Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.location}
                                onCheckedChange={() => toggleField('location')}
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <Building2 className="h-5 w-5" />
                                Location
                            </h2>
                        </div>

                        {selectedFields.location && parsedData.location && (
                            <div className="bg-muted rounded-md p-3">
                                <span className="text-sm">
                                    {parsedData.location}
                                </span>
                            </div>
                        )}
                    </section>

                    {/* Experience Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.experiences}
                                onCheckedChange={() =>
                                    toggleField('experiences')
                                }
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <Briefcase className="h-5 w-5" />
                                Work Experience
                            </h2>
                        </div>

                        {selectedFields.experiences &&
                            parsedData.experiences && (
                                <div className="space-y-3">
                                    {parsedData.experiences.map(
                                        (exp: any, index: number) => (
                                            <Card
                                                key={exp.id || index}
                                                className="border p-4"
                                            >
                                                <CardContent className="p-0">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-medium">
                                                                {exp.title}
                                                            </h4>
                                                            <Badge variant="secondary">
                                                                {exp.isCurrent
                                                                    ? 'Current'
                                                                    : 'Previous'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-muted-foreground text-sm">
                                                            {exp.company}
                                                        </p>
                                                        {exp.location && (
                                                            <p className="text-muted-foreground text-xs">
                                                                {exp.location}
                                                            </p>
                                                        )}
                                                        <div className="text-muted-foreground text-xs">
                                                            {exp.startDate} -{' '}
                                                            {exp.endDate ||
                                                                'Present'}
                                                        </div>
                                                        {exp.description && (
                                                            <p className="text-sm">
                                                                {
                                                                    exp.description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ),
                                    )}
                                </div>
                            )}
                    </section>

                    {/* Education Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.educations}
                                onCheckedChange={() =>
                                    toggleField('educations')
                                }
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <GraduationCap className="h-5 w-5" />
                                Education
                            </h2>
                        </div>

                        {selectedFields.educations && parsedData.educations && (
                            <div className="space-y-3">
                                {parsedData.educations.map(
                                    (edu: any, index: number) => (
                                        <Card
                                            key={edu.id || index}
                                            className="border p-4"
                                        >
                                            <CardContent className="p-0">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium">
                                                        {edu.degree}
                                                    </h4>
                                                    <p className="text-muted-foreground text-sm">
                                                        {edu.institution}
                                                    </p>
                                                    {edu.fieldOfStudy && (
                                                        <p className="text-muted-foreground text-xs">
                                                            {edu.fieldOfStudy}
                                                        </p>
                                                    )}
                                                    <div className="text-muted-foreground text-xs">
                                                        {edu.startDate} -{' '}
                                                        {edu.endDate ||
                                                            'Ongoing'}
                                                    </div>
                                                    {edu.gpa && (
                                                        <p className="text-muted-foreground text-xs">
                                                            GPA: {edu.gpa}
                                                        </p>
                                                    )}
                                                    {edu.description && (
                                                        <p className="text-sm">
                                                            {edu.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ),
                                )}
                            </div>
                        )}
                    </section>

                    {/* Skills Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.skills}
                                onCheckedChange={() => toggleField('skills')}
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <Lightbulb className="h-5 w-5" />
                                Skills
                            </h2>
                        </div>

                        {selectedFields.skills && parsedData.skills && (
                            <div className="flex flex-wrap gap-2">
                                {parsedData.skills.map(
                                    (skill: any, index: number) => (
                                        <Badge
                                            key={skill.id || index}
                                            variant="secondary"
                                            className="flex items-center gap-2"
                                        >
                                            {skill.name}
                                            {skill.level && (
                                                <span className="text-xs opacity-75">
                                                    ({skill.level})
                                                </span>
                                            )}
                                        </Badge>
                                    ),
                                )}
                            </div>
                        )}
                    </section>

                    {/* Certifications Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.certifications}
                                onCheckedChange={() =>
                                    toggleField('certifications')
                                }
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <Award className="h-5 w-5" />
                                Certifications
                            </h2>
                        </div>

                        {selectedFields.certifications &&
                            parsedData.certifications && (
                                <div className="space-y-3">
                                    {parsedData.certifications.map(
                                        (cert: any, index: number) => (
                                            <Card
                                                key={cert.id || index}
                                                className="border p-4"
                                            >
                                                <CardContent className="p-0">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium">
                                                            {cert.name}
                                                        </h4>
                                                        <p className="text-muted-foreground text-sm">
                                                            {
                                                                cert.issuingOrganization
                                                            }
                                                        </p>
                                                        <div className="text-muted-foreground text-xs">
                                                            Issued:{' '}
                                                            {cert.issueDate}
                                                            {cert.expiryDate &&
                                                                ` - Expires: ${cert.expiryDate}`}
                                                        </div>
                                                        {cert.description && (
                                                            <p className="text-sm">
                                                                {
                                                                    cert.description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ),
                                    )}
                                </div>
                            )}
                    </section>

                    {/* Achievements Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.achievements}
                                onCheckedChange={() =>
                                    toggleField('achievements')
                                }
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <Target className="h-5 w-5" />
                                Achievements
                            </h2>
                        </div>

                        {selectedFields.achievements &&
                            parsedData.achievements && (
                                <div className="space-y-3">
                                    {parsedData.achievements.map(
                                        (achievement: any, index: number) => (
                                            <Card
                                                key={achievement.id || index}
                                                className="border p-4"
                                            >
                                                <CardContent className="p-0">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium">
                                                            {achievement.title}
                                                        </h4>
                                                        <div className="text-muted-foreground text-xs">
                                                            {achievement.date}
                                                        </div>
                                                        {achievement.description && (
                                                            <p className="text-sm">
                                                                {
                                                                    achievement.description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ),
                                    )}
                                </div>
                            )}
                    </section>

                    {/* Interests Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.interests}
                                onCheckedChange={() => toggleField('interests')}
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <Lightbulb className="h-5 w-5" />
                                Interests
                            </h2>
                        </div>

                        {selectedFields.interests && parsedData.interests && (
                            <div className="flex flex-wrap gap-2">
                                {parsedData.interests.map(
                                    (interest: string, index: number) => (
                                        <Badge key={index} variant="outline">
                                            {interest}
                                        </Badge>
                                    ),
                                )}
                            </div>
                        )}
                    </section>

                    {/* Industries Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={selectedFields.industries}
                                onCheckedChange={() =>
                                    toggleField('industries')
                                }
                            />
                            <h2 className="flex items-center gap-2 text-lg font-medium">
                                <Building2 className="h-5 w-5" />
                                Industries
                            </h2>
                        </div>

                        {selectedFields.industries && parsedData.industries && (
                            <div className="flex flex-wrap gap-2">
                                {parsedData.industries.map(
                                    (industry: string, index: number) => (
                                        <Badge key={index} variant="outline">
                                            {industry}
                                        </Badge>
                                    ),
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6">
                    <Button variant="outline" onClick={handleBack}>
                        Back to Upload
                    </Button>
                    <Button onClick={handleApplyChanges} disabled={isUploading}>
                        {isUploading
                            ? 'Updating Profile...'
                            : 'Apply to Profile'}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-4 p-4">
            <div className="mb-6">
                <Button variant="ghost" onClick={handleBack} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">
                        Auto-Fill Profile from Resume
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Upload your resume (PDF, DOC, or DOCX) and we&apos;ll
                        automatically extract information to fill your profile.
                    </p>
                </div>
            </div>

            {/* Upload Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Upload className="h-4 w-4" />
                        Resume Upload
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="border-green-200 bg-green-50/80">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-sm text-green-900">
                            <strong>Supported formats:</strong> PDF, DOC, DOCX •{' '}
                            <strong>Maximum size:</strong> 10MB •{' '}
                            <strong>Note:</strong> PDF support temporarily
                            disabled
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        <div>
                            <Label
                                htmlFor="resume-upload"
                                className="text-sm font-medium"
                            >
                                Select Resume File
                            </Label>

                            {/* Drag and Drop Area */}
                            <div
                                className="mt-2 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-gray-400"
                                onClick={() =>
                                    document
                                        .getElementById('resume-upload')
                                        ?.click()
                                }
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add(
                                        'border-blue-400',
                                        'bg-blue-50',
                                    );
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove(
                                        'border-blue-400',
                                        'bg-blue-50',
                                    );
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove(
                                        'border-blue-400',
                                        'bg-blue-50',
                                    );
                                    const files = e.dataTransfer.files;
                                    if (files.length > 0) {
                                        const file = files[0];
                                        const event = {
                                            target: { files: [file] },
                                        } as any;
                                        handleFileChange(event);
                                    }
                                }}
                            >
                                <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-600">
                                    <span className="font-medium text-blue-600">
                                        Click to upload
                                    </span>{' '}
                                    or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">
                                    PDF, DOC, or DOCX files only (max 10MB)
                                </p>
                            </div>

                            <p className="text-muted-foreground mt-1 text-xs">
                                Click to browse or drag and drop a PDF, DOC, or
                                DOCX file
                            </p>

                            {/* Help Text */}
                            <div className="mt-3 rounded-md bg-blue-50 p-3">
                                <p className="text-xs text-blue-800">
                                    <strong>Supported files:</strong> PDF,
                                    Microsoft Word documents (.doc, .docx)
                                    <br />
                                    <strong>File size:</strong> Maximum 10MB
                                    <br />
                                </p>
                            </div>
                        </div>

                        {file && (
                            <div className="bg-muted flex items-center gap-3 rounded-md p-3">
                                <FileText className="text-muted-foreground h-4 w-4" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium">
                                        {file.name}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        {(file.size / 1024 / 1024).toFixed(2)}{' '}
                                        MB
                                    </div>
                                </div>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                        )}

                        {isUploading && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Processing resume...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                                    <div
                                        className="bg-primary h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className="w-full"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {isUploading ? 'Processing...' : 'Parse Resume'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Information Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Info className="h-5 w-5" />
                            What we&apos;ll extract
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-muted-foreground space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Phone number
                            </li>
                            <li className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Location
                            </li>
                            <li className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Work experience and job titles
                            </li>
                            <li className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                Education history and degrees
                            </li>
                            <li className="flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" />
                                Skills and competencies
                            </li>
                            <li className="flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                Certifications and achievements
                            </li>
                            <li className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Personal interests
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Shield className="h-5 w-5" />
                            Privacy & Accuracy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-muted-foreground space-y-2 text-sm">
                            <li>
                                • Your resume is processed securely and not
                                stored
                            </li>
                            <li>
                                • AI extraction may contain errors - review
                                carefully
                            </li>
                            <li>
                                • You can edit all extracted information before
                                applying
                            </li>
                            <li>
                                • Choose which sections to add to your profile
                            </li>
                            <li>
                                • Only selected data will be added to your
                                profile
                            </li>
                            <li>
                                • You can modify your profile anytime after
                                upload
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
