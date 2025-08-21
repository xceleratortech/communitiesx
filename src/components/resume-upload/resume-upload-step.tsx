'use client';

import React from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadProgress } from './upload-progress';

interface ResumeUploadStepProps {
    file: File | null;
    isUploading: boolean;
    uploadProgress: number;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpload: () => void;
}

export function ResumeUploadStep({
    file,
    isUploading,
    uploadProgress,
    onFileChange,
    onUpload,
}: ResumeUploadStepProps) {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const event = {
                target: { files: [file] },
            } as any;
            onFileChange(event);
        }
    };

    return (
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
                        <strong>Note:</strong> PDF support temporarily disabled
                    </AlertDescription>
                </Alert>

                <div className="space-y-4">
                    <div>
                        {/* Drag and Drop Area */}
                        <div
                            className="mt-2 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-gray-400"
                            onClick={() =>
                                document
                                    .getElementById('resume-upload')
                                    ?.click()
                            }
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
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

                        <input
                            id="resume-upload"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={onFileChange}
                            className="hidden"
                        />

                        {/* Help Text */}
                        <div className="mt-3 rounded-md bg-blue-50 p-3">
                            <p className="text-xs text-blue-800">
                                <strong>Supported files:</strong> PDF, Microsoft
                                Word documents (.doc, .docx)
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
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                            </div>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                    )}

                    {isUploading && (
                        <UploadProgress progress={uploadProgress} />
                    )}

                    <Button
                        onClick={onUpload}
                        disabled={!file || isUploading}
                        className="w-full"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploading ? 'Processing...' : 'Parse Resume'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
