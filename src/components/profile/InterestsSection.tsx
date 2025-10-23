'use client';

import React, { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { UserProfileMetadata } from '@/types/models';

interface InterestsSectionProps {
    setHasUnsavedChanges: (hasChanges: boolean) => void;
}

export function InterestsSection({
    setHasUnsavedChanges,
}: InterestsSectionProps) {
    const [interestInput, setInterestInput] = useState('');
    const form = useFormContext<UserProfileMetadata>();
    const interests = useWatch({
        control: form.control,
        name: 'interests',
    });

    const addInterest = () => {
        if (!interestInput.trim()) return;
        const currentInterests = form.watch('interests') || [];
        if (!currentInterests.includes(interestInput.trim())) {
            const newInterests = [...currentInterests, interestInput.trim()];
            form.setValue('interests', newInterests, { shouldDirty: true });
            setHasUnsavedChanges(true);
        }
        setInterestInput('');
    };

    const removeInterest = (index: number) => {
        const currentInterests = form.watch('interests') || [];
        const newInterests = currentInterests.filter((_, i) => i !== index);
        form.setValue('interests', newInterests, {
            shouldDirty: true,
        });
        setHasUnsavedChanges(true);
    };

    return (
        <section className="space-y-3">
            <h2 className="text-lg font-medium">Interests</h2>

            {/* Interests Display */}
            {interests && Array.isArray(interests) && interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {interests.map((interest: string, index: number) => (
                        <Badge
                            key={index}
                            variant="secondary"
                            className="group hover:bg-secondary/80 relative inline-flex h-8 items-center px-3 py-1.5 text-sm font-medium transition-colors"
                        >
                            {interest}
                            <button
                                onClick={() => removeInterest(index)}
                                className="hover:text-destructive ml-2 flex cursor-pointer items-center justify-center"
                                type="button"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            ) : null}

            {/* Add Interest Input */}
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Add an interest..."
                    className="h-10 flex-1 rounded-md"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && interestInput.trim()) {
                            e.preventDefault();
                            addInterest();
                        }
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-md"
                    onClick={addInterest}
                    disabled={!interestInput.trim()}
                >
                    Add
                </Button>
            </div>
        </section>
    );
}
