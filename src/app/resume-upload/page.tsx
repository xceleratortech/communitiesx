'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';

import { Button } from '@/components/ui/button';
import { type ResumeProfile } from '@/lib/services/resume-parser';
import {
    ResumeUploadStep,
    ResumePreviewStep,
    InformationCards,
} from '@/components/resume-upload';

export default function ResumeUploadPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parsedData, setParsedData] = useState<ResumeProfile | null>(null);
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

    const toggleField = (field: string) => {
        setSelectedFields((prev) => ({
            ...prev,
            [field]: !prev[field as keyof typeof selectedFields],
        }));
    };

    if (step === 'preview') {
        return (
            <ResumePreviewStep
                parsedData={parsedData!}
                selectedFields={selectedFields}
                onToggleField={toggleField}
                onBack={handleBack}
                onApplyChanges={handleApplyChanges}
                isUploading={isUploading}
            />
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
            <ResumeUploadStep
                file={file}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                onFileChange={handleFileChange}
                onUpload={handleUpload}
            />

            {/* Information Cards */}
            <InformationCards />
        </div>
    );
}
