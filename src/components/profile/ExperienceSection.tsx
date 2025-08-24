'use client';

import React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { MonthYearPicker } from './MonthYearPicker';
import type { UserProfileMetadata } from '@/types/models';

interface ExperienceSectionProps {
    isRequired?: boolean;
}

export function ExperienceSection({ isRequired }: ExperienceSectionProps) {
    const form = useFormContext<UserProfileMetadata>();

    const {
        fields: experienceFields,
        append: appendExperience,
        remove: removeExperience,
    } = useFieldArray({
        name: 'experiences',
        control: form.control,
    });

    const handleAppendExperience = React.useCallback(() => {
        appendExperience({
            id: `${Date.now()}`,
            title: '',
            company: '',
            location: '',
            website: '',
            startDate: '',
            endDate: '',
            description: '',
            isCurrent: false,
        });
    }, [appendExperience]);

    const handleRemoveExperience = React.useCallback(
        (index: number) => {
            removeExperience(index);
        },
        [removeExperience],
    );

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">
                    Work Experience
                    {isRequired && <span className="ml-1 text-red-500">*</span>}
                </h2>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAppendExperience}
                >
                    <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
            </div>

            <div className="space-y-3">
                {experienceFields.map((field, index) => (
                    <Card key={field.id} className="border p-0 shadow-sm">
                        <CardContent className="space-y-2 p-4">
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        handleRemoveExperience(index)
                                    }
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <div className="flex-1">
                                    <FormField<UserProfileMetadata>
                                        control={form.control}
                                        name={`experiences.${index}.title`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Job Title
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="flex-1">
                                    <FormField<UserProfileMetadata>
                                        control={form.control}
                                        name={`experiences.${index}.company`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Company
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <div className="flex-1">
                                    <FormField<UserProfileMetadata>
                                        control={form.control}
                                        name={`experiences.${index}.location`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Location
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        placeholder="e.g., New York, NY"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="flex-1">
                                    <FormField<UserProfileMetadata>
                                        control={form.control}
                                        name={`experiences.${index}.website`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Website
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        placeholder="e.g., company.com"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="flex flex-col">
                                        <Label className="text-muted-foreground text-xs font-medium">
                                            Start Date
                                        </Label>
                                        <Controller
                                            control={form.control}
                                            name={`experiences.${index}.startDate`}
                                            render={({ field }) => (
                                                <MonthYearPicker
                                                    value={
                                                        (field.value as string) ||
                                                        null
                                                    }
                                                    onChange={field.onChange}
                                                    placeholder="Start"
                                                />
                                            )}
                                        />
                                    </div>

                                    {!form.watch(
                                        `experiences.${index}.isCurrent`,
                                    ) && (
                                        <div className="flex flex-col">
                                            <Label className="text-muted-foreground text-xs font-medium">
                                                End Date
                                            </Label>
                                            <Controller
                                                control={form.control}
                                                name={`experiences.${index}.endDate`}
                                                render={({ field }) => (
                                                    <MonthYearPicker
                                                        value={
                                                            (field.value as string) ||
                                                            null
                                                        }
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        placeholder="End"
                                                        disabled={
                                                            !form.watch(
                                                                `experiences.${index}.startDate`,
                                                            )
                                                        }
                                                    />
                                                )}
                                            />
                                        </div>
                                    )}

                                    <FormField<UserProfileMetadata>
                                        control={form.control}
                                        name={`experiences.${index}.isCurrent`}
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 pb-1">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={
                                                            (field.value as boolean) ||
                                                            false
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) => {
                                                            field.onChange(
                                                                checked,
                                                            );
                                                            if (checked) {
                                                                form.setValue(
                                                                    `experiences.${index}.endDate`,
                                                                    undefined,
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="cursor-pointer text-xs font-medium">
                                                    Present
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div>
                                <FormField<UserProfileMetadata>
                                    control={form.control}
                                    name={`experiences.${index}.description`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-muted-foreground text-xs font-medium">
                                                Description
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe your role and achievements"
                                                    className="h-20 resize-none text-sm"
                                                    {...field}
                                                    value={
                                                        (field.value as string) ||
                                                        ''
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
