'use client';

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { UserProfileMetadata } from '@/types/models';

interface SkillsSectionProps {
    displaySkills: string[];
    setDisplaySkills: (skills: string[]) => void;
    setHasUnsavedChanges: (hasChanges: boolean) => void;
}

export function SkillsSection({
    displaySkills,
    setDisplaySkills,
    setHasUnsavedChanges,
}: SkillsSectionProps) {
    const [skillInput, setSkillInput] = useState('');
    const form = useFormContext<UserProfileMetadata>();

    const addSkill = () => {
        if (!skillInput.trim()) return;
        if (!displaySkills.includes(skillInput.trim())) {
            const newSkills = [...displaySkills, skillInput.trim()];
            setDisplaySkills(newSkills);
            form.setValue(
                'skills',
                newSkills.map((name, index) => ({
                    id: `${index + 1}`,
                    name,
                    level: 'intermediate' as const,
                    category: '',
                    yearsOfExperience: undefined,
                })),
                { shouldDirty: true },
            );
            setHasUnsavedChanges(true);
        }
        setSkillInput('');
    };

    const removeSkill = (index: number) => {
        const newSkills = displaySkills.filter((_, i) => i !== index);
        setDisplaySkills(newSkills);
        form.setValue(
            'skills',
            newSkills.map((name, index) => ({
                id: `${index + 1}`,
                name,
                level: 'intermediate' as const,
                category: '',
                yearsOfExperience: undefined,
            })),
            { shouldDirty: true },
        );
        setHasUnsavedChanges(true);
    };

    return (
        <section className="space-y-3">
            <h2 className="text-lg font-medium">Core Competencies</h2>

            {/* Skills Display */}
            {displaySkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {displaySkills.map((skill, index) => (
                        <Badge
                            key={index}
                            variant="secondary"
                            className="group hover:bg-secondary/80 relative inline-flex h-8 items-center px-3 py-1.5 text-sm font-medium transition-colors"
                        >
                            {skill}
                            <button
                                onClick={() => removeSkill(index)}
                                className="hover:text-destructive ml-2 flex cursor-pointer items-center justify-center"
                                type="button"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Add Skill Input */}
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Add a skill..."
                    className="h-10 flex-1 rounded-md"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && skillInput.trim()) {
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
                    disabled={!skillInput.trim()}
                >
                    Add
                </Button>
            </div>
        </section>
    );
}
