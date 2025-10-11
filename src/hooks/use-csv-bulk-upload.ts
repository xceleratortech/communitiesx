import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';

export interface CsvRow {
    [key: string]: string;
}

export interface CsvValidationRule {
    field: string;
    required?: boolean;
    minLength?: number;
    allowedValues?: string[];
    defaultValue?: string;
    customValidation?: (value: string) => string | null; // Returns error message or null if valid
}

export interface CsvBulkUploadConfig<T> {
    requiredHeaders: string[];
    validationRules: CsvValidationRule[];
    processRow: (row: T) => Promise<void>;
    onSuccess?: (successCount: number) => void;
    onError?: (errorCount: number) => void;
    onComplete?: (results: {
        successful: T[];
        failed: Array<{ row: T; error: string; rowNumber: number }>;
    }) => void;
}

export interface CsvBulkUploadState<T> {
    csvFile: File | null;
    csvData: T[];
    isProcessingCsv: boolean;
    isUploadingBulk: boolean;
    csvErrors: string[];
    csvPreview: T[];
    uploadResults: {
        successful: T[];
        failed: Array<{ row: T; error: string; rowNumber: number }>;
    } | null;
}

export function useCsvBulkUpload<T extends CsvRow>(
    config: CsvBulkUploadConfig<T>,
) {
    const [state, setState] = useState<CsvBulkUploadState<T>>({
        csvFile: null,
        csvData: [],
        isProcessingCsv: false,
        isUploadingBulk: false,
        csvErrors: [],
        csvPreview: [],
        uploadResults: null,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const setCsvFile = (file: File | null) =>
        setState((prev) => ({ ...prev, csvFile: file }));
    const setCsvData = (data: T[]) =>
        setState((prev) => ({ ...prev, csvData: data }));
    const setIsProcessingCsv = (processing: boolean) =>
        setState((prev) => ({ ...prev, isProcessingCsv: processing }));
    const setIsUploadingBulk = (uploading: boolean) =>
        setState((prev) => ({ ...prev, isUploadingBulk: uploading }));
    const setCsvErrors = (
        errors: string[] | ((prev: string[]) => string[]),
    ) => {
        if (typeof errors === 'function') {
            setState((prev) => ({
                ...prev,
                csvErrors: errors(prev.csvErrors),
            }));
        } else {
            setState((prev) => ({ ...prev, csvErrors: errors }));
        }
    };
    const setCsvPreview = (preview: T[]) =>
        setState((prev) => ({ ...prev, csvPreview: preview }));
    const setUploadResults = (
        results: CsvBulkUploadState<T>['uploadResults'],
    ) => setState((prev) => ({ ...prev, uploadResults: results }));

    const processCsvFile = (file: File) => {
        setIsProcessingCsv(true);
        setCsvErrors([]);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const { data, errors } = results;

                    // Check for parsing errors
                    if (errors.length > 0) {
                        const parsingErrors = errors.map((error) => {
                            const rowNumber =
                                error.row !== undefined
                                    ? error.row + 1
                                    : 'unknown';
                            return `Row ${rowNumber}: ${error.message}`;
                        });
                        setCsvErrors(parsingErrors);
                        setIsProcessingCsv(false);
                        return;
                    }

                    // Validate required headers
                    const headers = Object.keys(data[0] || {}).map((h) =>
                        h.trim().toLowerCase(),
                    );
                    const missingHeaders = config.requiredHeaders.filter(
                        (h) => !headers.includes(h),
                    );

                    if (missingHeaders.length > 0) {
                        setCsvErrors([
                            `Missing required headers: ${missingHeaders.join(', ')}`,
                        ]);
                        setIsProcessingCsv(false);
                        return;
                    }

                    // Process and validate each row
                    const processedData = data.map(
                        (row: any, index: number): T => {
                            const processedRow: any = {};

                            // Normalize headers and values
                            headers.forEach((header) => {
                                const originalHeader = Object.keys(row).find(
                                    (h) => h.trim().toLowerCase() === header,
                                );
                                processedRow[header] = (
                                    row[originalHeader || ''] || ''
                                ).trim();
                            });

                            // Apply validation rules
                            config.validationRules.forEach((rule) => {
                                const value = processedRow[rule.field];

                                // Required field validation
                                if (rule.required && !value) {
                                    setCsvErrors((prev: string[]) => [
                                        ...prev,
                                        `Row ${index + 2}: Missing required field "${rule.field}"`,
                                    ]);
                                }

                                // Min length validation
                                if (
                                    rule.minLength &&
                                    value &&
                                    value.length < rule.minLength
                                ) {
                                    setCsvErrors((prev: string[]) => [
                                        ...prev,
                                        `Row ${index + 2}: ${rule.field} must be at least ${rule.minLength} characters long`,
                                    ]);
                                }

                                // Allowed values validation
                                if (
                                    rule.allowedValues &&
                                    value &&
                                    !rule.allowedValues.includes(
                                        value.toLowerCase(),
                                    )
                                ) {
                                    if (rule.defaultValue) {
                                        processedRow[rule.field] =
                                            rule.defaultValue;
                                    }
                                }

                                // Custom validation
                                if (rule.customValidation && value) {
                                    const customError =
                                        rule.customValidation(value);
                                    if (customError) {
                                        setCsvErrors((prev: string[]) => [
                                            ...prev,
                                            `Row ${index + 2}: ${customError}`,
                                        ]);
                                    }
                                }

                                // Set default value if field is empty and default is provided
                                if (!value && rule.defaultValue) {
                                    processedRow[rule.field] =
                                        rule.defaultValue;
                                }
                            });

                            return processedRow as T;
                        },
                    );

                    setCsvData(processedData);
                    setCsvPreview(processedData.slice(0, 5)); // Show first 5 rows as preview
                    setIsProcessingCsv(false);
                } catch (error) {
                    setCsvErrors([
                        'Failed to process CSV file. Please check the format.',
                    ]);
                    setIsProcessingCsv(false);
                }
            },
            error: (error) => {
                setCsvErrors([`Failed to parse CSV file: ${error.message}`]);
                setIsProcessingCsv(false);
            },
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                toast.error('Please select a valid CSV file');
                return;
            }
            setCsvFile(file);
            processCsvFile(file);
        }
    };

    const handleBulkUpload = async () => {
        if (state.csvData.length === 0) return;

        setIsUploadingBulk(true);

        const results = {
            successful: [] as T[],
            failed: [] as Array<{ row: T; error: string; rowNumber: number }>,
        };

        try {
            // Process all rows and collect results
            for (let i = 0; i < state.csvData.length; i++) {
                const row = state.csvData[i];
                const rowNumber = i + 1;

                try {
                    await config.processRow(row);
                    // Success - add to successful results
                    results.successful.push(row);
                } catch (error: any) {
                    // Failure - add to failed results with error details
                    results.failed.push({
                        row,
                        error: error.message || 'Unknown error occurred',
                        rowNumber,
                    });
                }
            }

            // Store results for display
            setUploadResults(results);

            // Process results and show appropriate messages
            if (results.successful.length > 0 && results.failed.length === 0) {
                // All successful
                toast.success(
                    `Successfully processed ${results.successful.length} rows`,
                );
                config.onSuccess?.(results.successful.length);
            } else if (
                results.successful.length > 0 &&
                results.failed.length > 0
            ) {
                // Partial success
                toast.success(
                    `Processed ${results.successful.length} rows successfully`,
                    {
                        description: `${results.failed.length} rows failed. Check the error details below.`,
                    },
                );

                // Update CSV data to only show failed rows for easy fixing
                setCsvData(results.failed.map((f) => f.row));
                setCsvPreview(results.failed.map((f) => f.row));

                // Show detailed error summary
                const errorMessages = results.failed.map(
                    (f) => `Row ${f.rowNumber}: ${f.error}`,
                );
                setCsvErrors(errorMessages);
            } else {
                // All failed
                toast.error('Failed to process any rows', {
                    description:
                        'All rows had errors. Please fix the issues and try again.',
                });

                // Show all errors
                const errorMessages = results.failed.map(
                    (f) => `Row ${f.rowNumber}: ${f.error}`,
                );
                setCsvErrors(errorMessages);
            }

            // Call onComplete callback
            config.onComplete?.(results);
        } catch (error: any) {
            // This catch block handles any unexpected errors in the overall process
            toast.error('An unexpected error occurred during bulk upload', {
                description: error.message,
            });
        } finally {
            setIsUploadingBulk(false);
        }
    };

    const resetBulkUploadState = () => {
        setCsvFile(null);
        setCsvData([]);
        setCsvPreview([]);
        setCsvErrors([]);
        setUploadResults(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const clearResults = () => {
        setUploadResults(null);
        setCsvErrors([]);
    };

    return {
        // State
        csvFile: state.csvFile,
        csvData: state.csvData,
        isProcessingCsv: state.isProcessingCsv,
        isUploadingBulk: state.isUploadingBulk,
        csvErrors: state.csvErrors,
        csvPreview: state.csvPreview,
        uploadResults: state.uploadResults,

        // Refs
        fileInputRef,

        // Actions
        setCsvFile,
        setCsvData,
        setIsProcessingCsv,
        setIsUploadingBulk,
        setCsvErrors,
        setCsvPreview,
        setUploadResults,

        // Functions
        processCsvFile,
        handleFileChange,
        handleBulkUpload,
        resetBulkUploadState,
        clearResults,
    };
}
