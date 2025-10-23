'use client';

import React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export function EducationSection() {
    const form = useFormContext<UserProfileMetadata>();

    const {
        fields: educationFields,
        append: appendEducation,
        remove: removeEducation,
    } = useFieldArray({
        name: 'educations',
        control: form.control,
    });

    const handleAppendEducation = React.useCallback(() => {
        appendEducation({
            id: `${Date.now()}`,
            degree: '',
            institution: '',
            fieldOfStudy: '',
            startDate: '',
            endDate: '',
            gpa: undefined,
            description: '',
        });
    }, [appendEducation]);

    const handleRemoveEducation = React.useCallback(
        (index: number) => {
            removeEducation(index);
        },
        [removeEducation],
    );

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Education</h2>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAppendEducation}
                >
                    <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
            </div>

            <div className="space-y-3">
                {educationFields.map((field, index) => (
                    <Card key={field.id} className="border p-0 shadow-sm">
                        <CardContent className="space-y-2 p-4">
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveEducation(index)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <div className="flex-1">
                                    <FormField<UserProfileMetadata>
                                        control={form.control}
                                        name={`educations.${index}.degree`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Degree
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
                                        name={`educations.${index}.institution`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Institution
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

                            <div className="flex items-center justify-between">
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="flex flex-col">
                                        <Label className="text-muted-foreground text-xs font-medium">
                                            Start Date
                                        </Label>
                                        <Controller
                                            control={form.control}
                                            name={`educations.${index}.startDate`}
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

                                    <div className="flex flex-col">
                                        <Label className="text-muted-foreground text-xs font-medium">
                                            End Date
                                        </Label>
                                        <Controller
                                            control={form.control}
                                            name={`educations.${index}.endDate`}
                                            render={({ field }) => (
                                                <MonthYearPicker
                                                    value={
                                                        (field.value as string) ||
                                                        null
                                                    }
                                                    onChange={field.onChange}
                                                    placeholder="End"
                                                    disabled={
                                                        !form.watch(
                                                            `educations.${index}.startDate`,
                                                        )
                                                    }
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <FormField<UserProfileMetadata>
                                    control={form.control}
                                    name={`educations.${index}.description`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-muted-foreground text-xs font-medium">
                                                Description
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe your education and achievements"
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
