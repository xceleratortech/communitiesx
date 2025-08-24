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

export function AchievementsSection() {
    const form = useFormContext<UserProfileMetadata>();

    const {
        fields: achievementFields,
        append: appendAchievement,
        remove: removeAchievement,
    } = useFieldArray({
        name: 'achievements',
        control: form.control,
    });

    const handleAppendAchievement = React.useCallback(() => {
        appendAchievement({
            id: `${Date.now()}`,
            title: '',
            description: '',
            date: '',
            category: '',
            evidence: '',
        });
    }, [appendAchievement]);

    const handleRemoveAchievement = React.useCallback(
        (index: number) => {
            removeAchievement(index);
        },
        [removeAchievement],
    );

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Achievements</h2>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAppendAchievement}
                >
                    <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
            </div>

            <div className="space-y-3">
                {achievementFields.map((field, index) => (
                    <Card key={field.id} className="border p-0 shadow-sm">
                        <CardContent className="space-y-2 p-4">
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        handleRemoveAchievement(index)
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
                                        name={`achievements.${index}.title`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Achievement Title
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
                                        name={`achievements.${index}.category`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Category
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                        placeholder="e.g., Professional, Academic, Personal"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="mr-4 flex-1">
                                    <FormField<UserProfileMetadata>
                                        control={form.control}
                                        name={`achievements.${index}.date`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Date
                                                </FormLabel>
                                                <FormControl>
                                                    <Controller
                                                        control={form.control}
                                                        name={`achievements.${index}.date`}
                                                        render={({ field }) => (
                                                            <MonthYearPicker
                                                                value={
                                                                    (field.value as string) ||
                                                                    null
                                                                }
                                                                onChange={
                                                                    field.onChange
                                                                }
                                                                placeholder="Date"
                                                            />
                                                        )}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div>
                                <FormField<UserProfileMetadata>
                                    control={form.control}
                                    name={`achievements.${index}.description`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-muted-foreground text-xs font-medium">
                                                Description
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe your achievement and its impact"
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

                            <div>
                                <FormField<UserProfileMetadata>
                                    control={form.control}
                                    name={`achievements.${index}.evidence`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-muted-foreground text-xs font-medium">
                                                Evidence/Link (Optional)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="URL, certificate, or other evidence"
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
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
