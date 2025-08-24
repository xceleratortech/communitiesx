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

export function CertificationsSection() {
    const form = useFormContext<UserProfileMetadata>();

    const {
        fields: certificationFields,
        append: appendCertification,
        remove: removeCertification,
    } = useFieldArray({
        name: 'certifications',
        control: form.control,
    });

    const handleAppendCertification = React.useCallback(() => {
        appendCertification({
            id: `${Date.now()}`,
            name: '',
            issuingOrganization: '',
            issueDate: '',
            expiryDate: '',
            credentialId: '',
            credentialUrl: '',
            description: '',
        });
    }, [appendCertification]);

    const handleRemoveCertification = React.useCallback(
        (index: number) => {
            removeCertification(index);
        },
        [removeCertification],
    );

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">
                    Professional Certificates
                </h2>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAppendCertification}
                >
                    <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
            </div>

            <div className="space-y-3">
                {certificationFields.map((field, index) => (
                    <Card key={field.id} className="border p-0 shadow-sm">
                        <CardContent className="space-y-2 p-4">
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        handleRemoveCertification(index)
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
                                        name={`certifications.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Certificate Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                        placeholder="e.g., AWS Certified Solutions Architect"
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
                                        name={`certifications.${index}.issuingOrganization`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Issuing Organization
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                        placeholder="e.g., Amazon Web Services"
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
                                            Issue Date
                                        </Label>
                                        <Controller
                                            control={form.control}
                                            name={`certifications.${index}.issueDate`}
                                            render={({ field }) => (
                                                <MonthYearPicker
                                                    value={
                                                        (field.value as string) ||
                                                        null
                                                    }
                                                    onChange={field.onChange}
                                                    placeholder="Issue Date"
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="flex flex-col">
                                        <Label className="text-muted-foreground text-xs font-medium">
                                            Expiry Date
                                        </Label>
                                        <Controller
                                            control={form.control}
                                            name={`certifications.${index}.expiryDate`}
                                            render={({ field }) => (
                                                <MonthYearPicker
                                                    value={
                                                        (field.value as string) ||
                                                        null
                                                    }
                                                    onChange={field.onChange}
                                                    placeholder="Expiry Date"
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <div className="flex-1">
                                    <FormField<UserProfileMetadata>
                                        control={form.control}
                                        name={`certifications.${index}.credentialId`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Credential ID (Optional)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                        placeholder="e.g., AWS-12345"
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
                                        name={`certifications.${index}.credentialUrl`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-muted-foreground text-xs font-medium">
                                                    Verification URL (Optional)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        {...field}
                                                        value={
                                                            (field.value as string) ||
                                                            ''
                                                        }
                                                        placeholder="https://verify.certificate.com"
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
                                    name={`certifications.${index}.description`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-muted-foreground text-xs font-medium">
                                                Description (Optional)
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe what this certification covers and its significance"
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
