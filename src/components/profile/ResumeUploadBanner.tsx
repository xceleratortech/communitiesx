'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ResumeUploadBanner() {
    const router = useRouter();

    return (
        <div className="border-muted-foreground/15 bg-muted/5 mb-2 flex items-center justify-between rounded-lg border border-dashed px-3 py-2">
            <div className="flex items-center gap-2">
                <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full">
                    <FileText className="text-primary h-3.5 w-3.5" />
                </div>
                <div>
                    <span className="block text-xs leading-tight font-medium">
                        Auto-fill from Resume
                    </span>
                    <span className="text-muted-foreground block text-xs leading-tight">
                        Upload your resume to automatically fill your profile
                        information
                    </span>
                </div>
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push('/resume-upload')}
                className="h-7 shrink-0 px-2 text-xs"
            >
                <FileText className="mr-1 h-3 w-3" />
                Upload
            </Button>
        </div>
    );
}
