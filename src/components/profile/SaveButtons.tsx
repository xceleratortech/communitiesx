'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SaveButtonsProps {
    hasUnsavedChanges: boolean;
    isPending: boolean;
    formId: string;
}

export function SaveButtons({
    hasUnsavedChanges,
    isPending,
    formId,
}: SaveButtonsProps) {
    return (
        <>
            {/* Sticky Save Button for Desktop */}
            <div className="fixed right-6 bottom-0 z-50 hidden sm:block">
                <div className="relative">
                    <Button
                        type="submit"
                        form={formId}
                        disabled={!hasUnsavedChanges || isPending}
                        size="lg"
                        className={cn(
                            'rounded-full px-6 shadow-lg transition-all duration-300',
                        )}
                    >
                        {isPending
                            ? 'Saving…'
                            : hasUnsavedChanges
                              ? 'Save Changes'
                              : 'All changes saved'}
                    </Button>
                </div>
            </div>

            {/* Mobile Sticky Save Button */}
            <div className="fixed right-0 bottom-20 left-0 z-50 p-4 sm:hidden">
                <div className="relative">
                    <Button
                        type="submit"
                        form={formId}
                        disabled={!hasUnsavedChanges || isPending}
                        size="lg"
                        className={cn(
                            'w-full shadow-2xl transition-all duration-300',
                        )}
                    >
                        {isPending
                            ? 'Saving…'
                            : hasUnsavedChanges
                              ? 'Save Changes'
                              : 'All changes saved'}
                    </Button>
                </div>
            </div>
        </>
    );
}
