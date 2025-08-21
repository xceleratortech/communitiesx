'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parse, isValid } from 'date-fns';
import {
    CalendarIcon,
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    Upload,
    User,
    FileText,
    Check,
} from 'lucide-react';

import { trpc } from '@/providers/trpc-provider';
import { toast } from 'sonner';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import Link from 'next/link';
import type { UserProfileMetadata } from '@/types/models';

import { cn } from '@/lib/utils';

// Industries list
const industries = [
    'Banking',
    'Investment Firms',
    'Legal Services',
    'Public Sector',
    'Life Sciences',
    'Information Technology',
    'Healthcare',
    'Manufacturing',
    'Retail',
    'Hospitality',
    'Education',
    'Government',
];

// Industries Combobox Component
const IndustriesCombobox = ({
    value,
    onChange,
}: {
    value: string[];
    onChange: (value: string[]) => void;
}) => {
    const [open, setOpen] = useState(false);
    const [customIndustry, setCustomIndustry] = useState('');

    const lowerIndustries = industries.map((i) => i.toLowerCase());
    const lowerSelected = value.map((i) => i.toLowerCase());
    const customTrimmed = customIndustry.trim();
    const customExists =
        !!customTrimmed &&
        !lowerIndustries.includes(customTrimmed.toLowerCase()) &&
        !lowerSelected.includes(customTrimmed.toLowerCase());

    const handleAddCustomIndustry = () => {
        if (customExists) {
            onChange([...value, customTrimmed]);
            setCustomIndustry('');
        }
    };

    const handleRemoveIndustry = (industryToRemove: string) => {
        onChange(value.filter((industry) => industry !== industryToRemove));
    };

    const handleToggleIndustry = (industry: string) => {
        if (value.includes(industry)) {
            handleRemoveIndustry(industry);
        } else {
            onChange([...value, industry]);
        }
    };

    // Filter industries by search
    const filteredIndustries = industries.filter((industry) =>
        industry.toLowerCase().includes(customIndustry.toLowerCase()),
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    className="bg-background focus:ring-ring flex h-9 min-h-[36px] cursor-pointer flex-wrap items-center gap-1 rounded-md border px-3 focus:ring-2 focus:outline-none"
                    onClick={() => setOpen(!open)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setOpen(!open);
                    }}
                >
                    {value.length === 0 && (
                        <span className="text-muted-foreground">
                            Select industries
                        </span>
                    )}
                    {value.map((industry) => (
                        <Badge
                            key={industry}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-0.5"
                        >
                            {industry}
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={`Remove ${industry}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveIndustry(industry);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        handleRemoveIndustry(industry);
                                    }
                                }}
                                className="hover:text-destructive ml-1 cursor-pointer focus:outline-none"
                            >
                                <X className="h-3 w-3" />
                            </span>
                        </Badge>
                    ))}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Type to add industry"
                        className="h-9"
                        value={customIndustry}
                        onValueChange={setCustomIndustry}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && customExists) {
                                e.preventDefault();
                                handleAddCustomIndustry();
                            }
                        }}
                    />
                    <CommandList>
                        <CommandGroup>
                            {filteredIndustries.map((industry) => (
                                <CommandItem
                                    key={industry}
                                    value={industry}
                                    onSelect={() =>
                                        handleToggleIndustry(industry)
                                    }
                                    className={cn(
                                        'cursor-pointer rounded px-2 py-1',
                                        'text-black dark:text-white',
                                        'dark:hover:text-black dark:data-[selected=true]:text-black',
                                        'hover:text-black data-[selected=true]:text-black',
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value.includes(industry)
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    {industry}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {customExists && (
                            <div className="mt-2 flex justify-center border-t p-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleAddCustomIndustry}
                                    className="w-full"
                                >
                                    Add &quot;{customTrimmed}&quot;
                                </Button>
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

// Custom month/year picker using shadcn components
const MonthYearPicker = ({
    value,
    onChange,
    placeholder,
    disabled = false,
}: {
    value: string | null;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
}) => {
    const [date, setDate] = useState<Date | undefined>(() => {
        if (value && value.trim()) {
            const parsed = parse(`${value}-01`, 'yyyy-MM-dd', new Date());
            return isValid(parsed) ? parsed : undefined;
        }
        return undefined;
    });

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 81 }, (_, i) => currentYear - i + 10);

    const handleSelect = (newDate: Date) => {
        setDate(newDate);
        onChange(format(newDate, 'yyyy-MM'));
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className={cn(
                        'w-[130px] justify-start text-left font-normal',
                        !date && 'text-muted-foreground',
                        disabled && 'cursor-not-allowed opacity-50',
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date && isValid(date) ? (
                        format(date, 'MM/yyyy')
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col space-y-2 p-2">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                        <p className="text-sm font-medium">Select Date</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2">
                        <div>
                            <Label className="mb-1 block text-xs">Month</Label>
                            <Select
                                value={date ? date.getMonth().toString() : ''}
                                onValueChange={(value) => {
                                    const newMonth = Number.parseInt(value);
                                    if (date) {
                                        const newDate = new Date(date);
                                        newDate.setMonth(newMonth);
                                        handleSelect(newDate);
                                    } else {
                                        const newDate = new Date();
                                        newDate.setMonth(newMonth);
                                        handleSelect(newDate);
                                    }
                                }}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">January</SelectItem>
                                    <SelectItem value="1">February</SelectItem>
                                    <SelectItem value="2">March</SelectItem>
                                    <SelectItem value="3">April</SelectItem>
                                    <SelectItem value="4">May</SelectItem>
                                    <SelectItem value="5">June</SelectItem>
                                    <SelectItem value="6">July</SelectItem>
                                    <SelectItem value="7">August</SelectItem>
                                    <SelectItem value="8">September</SelectItem>
                                    <SelectItem value="9">October</SelectItem>
                                    <SelectItem value="10">November</SelectItem>
                                    <SelectItem value="11">December</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="mb-1 block text-xs">Year</Label>
                            <Select
                                value={
                                    date ? date.getFullYear().toString() : ''
                                }
                                onValueChange={(value) => {
                                    const newYear = Number.parseInt(value);
                                    if (date) {
                                        const newDate = new Date(date);
                                        newDate.setFullYear(newYear);
                                        handleSelect(newDate);
                                    } else {
                                        const newDate = new Date();
                                        newDate.setFullYear(newYear);
                                        handleSelect(newDate);
                                    }
                                }}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {years.map((year) => (
                                        <SelectItem
                                            key={year}
                                            value={year.toString()}
                                        >
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default function ProfilePage() {
    const router = useRouter();
    const [skillInput, setSkillInput] = useState('');
    const [interestInput, setInterestInput] = useState('');
    const [displaySkills, setDisplaySkills] = useState<string[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
    const [hasSavedSuccessfully, setHasSavedSuccessfully] = useState(false);

    const {
        data: userProfile,
        refetch,
        isLoading: profileLoading,
    } = trpc.profiles.getMyProfile.useQuery();
    const upsertProfile = trpc.profiles.upsertProfile.useMutation({
        onSuccess: () => {
            setHasUnsavedChanges(false);
            form.reset(form.getValues()); // Reset form dirty state
            refetch();
            toast.success('Profile updated successfully');
            setHasAttemptedSave(false);
            setHasSavedSuccessfully(true);
        },
        onError: (e) => toast.error(e.message || 'Failed to update profile'),
    });

    const form = useForm<UserProfileMetadata>({
        defaultValues: {
            phoneNumber: '',
            location: '',
            experiences: [],
            educations: [],
            certifications: [],
            skills: [],
            achievements: [],
            interests: [],
            industries: [],
        },
    });

    const { isDirty } = form.formState;

    useEffect(() => {
        if (isDirty && hasSavedSuccessfully) {
            setHasSavedSuccessfully(false);
        }
    }, [hasSavedSuccessfully, isDirty]);

    useEffect(() => {
        setHasUnsavedChanges(isDirty);
    }, [isDirty]);

    const {
        fields: experienceFields,
        append: appendExperience,
        remove: removeExperience,
    } = useFieldArray({
        name: 'experiences',
        control: form.control,
    });

    const {
        fields: educationFields,
        append: appendEducation,
        remove: removeEducation,
    } = useFieldArray({
        name: 'educations',
        control: form.control,
    });

    const {
        fields: certificationFields,
        append: appendCertification,
        remove: removeCertification,
    } = useFieldArray({
        name: 'certifications',
        control: form.control,
    });

    const {
        fields: achievementFields,
        append: appendAchievement,
        remove: removeAchievement,
    } = useFieldArray({
        name: 'achievements',
        control: form.control,
    });

    useEffect(() => {
        if (userProfile && userProfile.metadata) {
            // Clean up interests data to ensure they are strings
            let cleanMetadata = {
                ...userProfile.metadata,
            } as UserProfileMetadata;
            if (
                cleanMetadata.interests &&
                Array.isArray(cleanMetadata.interests)
            ) {
                cleanMetadata.interests = cleanMetadata.interests.map(
                    (interest: any) =>
                        typeof interest === 'string'
                            ? interest
                            : typeof interest === 'object' && interest.name
                              ? interest.name
                              : JSON.stringify(interest),
                );
            }

            form.reset(cleanMetadata);

            // Update display skills
            if (cleanMetadata.skills && Array.isArray(cleanMetadata.skills)) {
                const skillNames = cleanMetadata.skills
                    .map((skill: any) =>
                        typeof skill === 'string' ? skill : skill.name || '',
                    )
                    .filter(Boolean);
                setDisplaySkills(skillNames);
            }
        }
    }, [userProfile, form]);

    const handleAppendExperience = React.useCallback(() => {
        appendExperience({
            id: `${Date.now()}`,
            title: '',
            company: '',
            location: '',
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

    const onSubmit = async (data: UserProfileMetadata) => {
        setHasAttemptedSave(true);

        try {
            await upsertProfile.mutateAsync(data);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

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

    if (profileLoading) return <ProfileSkeleton />;

    return (
        <div className="mx-auto max-w-4xl space-y-4 p-4">
            {/* Resume Upload Banner */}
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
                            Upload your resume to automatically fill your
                            profile information
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

            <Form {...form}>
                <form
                    id="profile-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6 pb-24 sm:pb-4"
                >
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-medium">
                                Basic Information
                            </h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField<UserProfileMetadata>
                                    control={form.control}
                                    name="phoneNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">
                                                Phone Number
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter your phone number"
                                                    className="text-sm"
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

                                <FormField<UserProfileMetadata>
                                    control={form.control}
                                    name="location"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">
                                                Location
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., Bangalore, India"
                                                    className="text-sm"
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
                        </section>

                        {/* Experience Section */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-medium">
                                    Work Experience
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
                                    <Card
                                        key={field.id}
                                        className="border p-0 shadow-sm"
                                    >
                                        <CardContent className="space-y-2 p-4">
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleRemoveExperience(
                                                            index,
                                                        )
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

                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-wrap items-end gap-3">
                                                    <div className="flex flex-col">
                                                        <Label className="text-muted-foreground text-xs font-medium">
                                                            Start Date
                                                        </Label>
                                                        <Controller
                                                            control={
                                                                form.control
                                                            }
                                                            name={`experiences.${index}.startDate`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <MonthYearPicker
                                                                    value={
                                                                        (field.value as string) ||
                                                                        null
                                                                    }
                                                                    onChange={
                                                                        field.onChange
                                                                    }
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
                                                                control={
                                                                    form.control
                                                                }
                                                                name={`experiences.${index}.endDate`}
                                                                render={({
                                                                    field,
                                                                }) => (
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
                                                                            if (
                                                                                checked
                                                                            ) {
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

                        {/* Education Section */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-medium">
                                    Education
                                </h2>
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
                                    <Card
                                        key={field.id}
                                        className="border p-0 shadow-sm"
                                    >
                                        <CardContent className="space-y-2 p-4">
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleRemoveEducation(
                                                            index,
                                                        )
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
                                                            control={
                                                                form.control
                                                            }
                                                            name={`educations.${index}.startDate`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <MonthYearPicker
                                                                    value={
                                                                        (field.value as string) ||
                                                                        null
                                                                    }
                                                                    onChange={
                                                                        field.onChange
                                                                    }
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
                                                            control={
                                                                form.control
                                                            }
                                                            name={`educations.${index}.endDate`}
                                                            render={({
                                                                field,
                                                            }) => (
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
                                                                            `educations.${index}.startDate`,
                                                                        )
                                                                    }
                                                                />
                                                            )}
                                                        />
                                                    </div>
                                                </div>

                                                {/* <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveEducation(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                        >
                          Remove
                        </Button> */}
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

                        {/* Skills Section */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-medium">
                                Core Competencies
                            </h2>

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
                                                onClick={() =>
                                                    removeSkill(index)
                                                }
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
                                    onChange={(e) =>
                                        setSkillInput(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === 'Enter' &&
                                            skillInput.trim()
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
                                    disabled={!skillInput.trim()}
                                >
                                    Add
                                </Button>
                            </div>
                        </section>

                        {/* Interests Section */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-medium">Interests</h2>

                            {/* Interests Display */}
                            {(() => {
                                const interests = form.watch('interests');
                                return interests &&
                                    Array.isArray(interests) &&
                                    interests.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {interests.map(
                                            (
                                                interest: string,
                                                index: number,
                                            ) => (
                                                <Badge
                                                    key={index}
                                                    variant="secondary"
                                                    className="group hover:bg-secondary/80 relative inline-flex h-8 items-center px-3 py-1.5 text-sm font-medium transition-colors"
                                                >
                                                    {interest}
                                                    <button
                                                        onClick={() => {
                                                            const currentInterests =
                                                                form.watch(
                                                                    'interests',
                                                                ) || [];
                                                            const newInterests =
                                                                currentInterests.filter(
                                                                    (_, i) =>
                                                                        i !==
                                                                        index,
                                                                );
                                                            form.setValue(
                                                                'interests',
                                                                newInterests,
                                                                {
                                                                    shouldDirty: true,
                                                                },
                                                            );
                                                            setHasUnsavedChanges(
                                                                true,
                                                            );
                                                        }}
                                                        className="hover:text-destructive ml-2 flex cursor-pointer items-center justify-center"
                                                        type="button"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ),
                                        )}
                                    </div>
                                ) : null;
                            })()}

                            {/* Add Interest Input */}
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Add an interest..."
                                    className="h-10 flex-1 rounded-md"
                                    value={interestInput}
                                    onChange={(e) =>
                                        setInterestInput(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === 'Enter' &&
                                            interestInput.trim()
                                        ) {
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

                        {/* Industries Section */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-medium">Industries</h2>
                            <FormField<UserProfileMetadata>
                                control={form.control}
                                name="industries"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <IndustriesCombobox
                                                value={field.value as string[]}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </section>

                        {/* Achievements Section */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-medium">
                                    Achievements
                                </h2>
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
                                    <Card
                                        key={field.id}
                                        className="border p-0 shadow-sm"
                                    >
                                        <CardContent className="space-y-2 p-4">
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleRemoveAchievement(
                                                            index,
                                                        )
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
                                                                    Achievement
                                                                    Title
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
                                                                        control={
                                                                            form.control
                                                                        }
                                                                        name={`achievements.${index}.date`}
                                                                        render={({
                                                                            field,
                                                                        }) => (
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
                                                                Evidence/Link
                                                                (Optional)
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

                        {/* Certificates Section */}
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
                                    <Card
                                        key={field.id}
                                        className="border p-0 shadow-sm"
                                    >
                                        <CardContent className="space-y-2 p-4">
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleRemoveCertification(
                                                            index,
                                                        )
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
                                                                    Certificate
                                                                    Name
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
                                                                    Issuing
                                                                    Organization
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
                                                            control={
                                                                form.control
                                                            }
                                                            name={`certifications.${index}.issueDate`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <MonthYearPicker
                                                                    value={
                                                                        (field.value as string) ||
                                                                        null
                                                                    }
                                                                    onChange={
                                                                        field.onChange
                                                                    }
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
                                                            control={
                                                                form.control
                                                            }
                                                            name={`certifications.${index}.expiryDate`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <MonthYearPicker
                                                                    value={
                                                                        (field.value as string) ||
                                                                        null
                                                                    }
                                                                    onChange={
                                                                        field.onChange
                                                                    }
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
                                                                    Credential
                                                                    ID
                                                                    (Optional)
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
                                                                    Verification
                                                                    URL
                                                                    (Optional)
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
                                                                Description
                                                                (Optional)
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
                    </div>
                </form>
            </Form>

            {/* Sticky Save Button for Desktop */}
            <div className="fixed right-6 bottom-0 z-50 hidden sm:block">
                <div className="relative">
                    <Button
                        type="submit"
                        form="profile-form"
                        disabled={!hasUnsavedChanges || upsertProfile.isPending}
                        size="lg"
                        className={cn(
                            'rounded-full px-6 shadow-lg transition-all duration-300',
                        )}
                    >
                        {upsertProfile.isPending
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
                        form="profile-form"
                        disabled={!hasUnsavedChanges || upsertProfile.isPending}
                        size="lg"
                        className={cn(
                            'w-full shadow-2xl transition-all duration-300',
                        )}
                    >
                        {upsertProfile.isPending
                            ? 'Saving…'
                            : hasUnsavedChanges
                              ? 'Save Changes'
                              : 'All changes saved'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-9 w-32" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-6 md:col-span-2">
                    {/* Basic Information */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-24" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Experience Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-32" />
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Education Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-28" />
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="h-3 w-28" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Skills Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-24" />
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-6 w-20" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Interests Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-20" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Industries Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-20" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Achievements Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-20" />
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Certificates Section */}
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="mb-4 h-5 w-20" />
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
