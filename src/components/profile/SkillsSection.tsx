'use client';

import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { UserProfileMetadata, Skill } from '@/types/models';

interface SkillsSectionProps {
    setHasUnsavedChanges: (hasChanges: boolean) => void;
}

export function SkillsSection({ setHasUnsavedChanges }: SkillsSectionProps) {
    const [skillInput, setSkillInput] = useState('');
    const form = useFormContext<UserProfileMetadata>();

    const {
        fields: skillFields,
        append: appendSkill,
        remove: removeSkill,
    } = useFieldArray({
        control: form.control,
        name: 'skills',
    });

    const addSkill = () => {
        const trimmedInput = skillInput.trim();
        if (!trimmedInput) return;

        // Case-insensitive duplicate check
        const isDuplicate = skillFields.some((field) => {
            const skill = field as Skill;
            return skill.name.toLowerCase() === trimmedInput.toLowerCase();
        });

        if (!isDuplicate) {
            appendSkill({
                id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID
                name: trimmedInput,
                level: 'intermediate' as const,
                category: '',
                yearsOfExperience: undefined,
            } as Skill);
            setHasUnsavedChanges(true);
        }
        setSkillInput('');
    };

    const handleRemoveSkill = (index: number) => {
        removeSkill(index);
        setHasUnsavedChanges(true);
    };

    // Optional: Add validation feedback
    const getDuplicateError = () => {
        const trimmedInput = skillInput.trim();
        if (!trimmedInput) return null;

        const isDuplicate = skillFields.some((field) => {
            const skill = field as Skill;
            return skill.name.toLowerCase() === trimmedInput.toLowerCase();
        });

        return isDuplicate ? 'This skill already exists' : null;
    };

    const duplicateError = getDuplicateError();

    return (
        <section className="space-y-3">
            <h2 className="text-lg font-medium">Core Competencies</h2>

            {/* Skills Display */}
            {skillFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {skillFields.map((field, index) => {
                        const skill = field as Skill;
                        return (
                            <Badge
                                key={field.id}
                                variant="secondary"
                                className="group hover:bg-secondary/80 relative inline-flex h-8 items-center px-3 py-1.5 text-sm font-medium transition-colors"
                            >
                                {skill.name}
                                <button
                                    onClick={() => handleRemoveSkill(index)}
                                    className="hover:text-destructive ml-2 flex cursor-pointer items-center justify-center"
                                    type="button"
                                    aria-label={`Remove ${skill.name} skill`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        );
                    })}
                </div>
            )}

            {/* Add Skill Input */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Add a skill..."
                        className={`h-10 flex-1 rounded-md ${
                            duplicateError ? 'border-destructive' : ''
                        }`}
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (
                                e.key === 'Enter' &&
                                skillInput.trim() &&
                                !duplicateError
                            ) {
                                e.preventDefault();
                                addSkill();
                            }
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-md"
                        onClick={addSkill}
                        disabled={!skillInput.trim() || !!duplicateError}
                    >
                        Add
                    </Button>
                </div>
                {duplicateError && (
                    <p className="text-destructive text-sm">{duplicateError}</p>
                )}
            </div>
        </section>
    );
}
