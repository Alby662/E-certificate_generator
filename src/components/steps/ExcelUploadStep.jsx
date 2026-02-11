import { useState } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ValidationResults from "@/components/ValidationResults";

import { API_BASE_URL } from '../../lib/api';

const API_URL = `${API_BASE_URL}/api`;

export function ExcelUploadStep({ onNext, onDataParsed }) {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationData, setValidationData] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.name.endsWith('.xlsx')) {
                setFile(selectedFile);
                setError(null);
                setValidationData(null); // Reset validation on new file
            } else {
                setFile(null);
                setError("Please upload a valid Excel file (.xlsx)");
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setValidationData(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Get token from localStorage
            const token = localStorage.getItem('token');

            if (!token) {
                setError('Please login to continue');
                toast.error('Authentication required');
                setIsLoading(false);
                return;
            }

            const response = await axios.post(`${API_URL}/certificates/bulk-upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.success) {
                const { valid, invalid, summary, preview } = response.data.data;

                setValidationData({ valid, invalid, summary, preview });

                // Only pass valid participants to parent
                onDataParsed(valid);

                if (invalid.length === 0) {
                    toast.success(`Successfully validated ${valid.length} participants`);
                } else {
                    toast.warning(`${valid.length} valid, ${invalid.length} invalid participants`);
                }
            } else {
                setError(response.data.message || "Failed to parse Excel file");
                toast.error("Upload failed");
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Network error. Please ensure backend is running.";
            setError(errorMsg);
            toast.error("Upload failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinue = () => {
        if (validationData && validationData.valid.length > 0) {
            onNext();
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Upload Participant Data</CardTitle>
                    <CardDescription>
                        Upload an Excel sheet (.xlsx) containing participant details.
                        Required columns: <strong>name</strong>, <strong>email</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-8 hover:bg-slate-50 transition-colors">
                        <FileSpreadsheet className="h-12 w-12 text-slate-400 mb-4" />
                        <Input
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileChange}
                            className="max-w-xs"
                        />
                        <p className="text-sm text-slate-500 mt-2">
                            {file ? file.name : "Select an Excel file"}
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={handleUpload}
                        disabled={!file || isLoading}
                        className="w-full"
                    >
                        {isLoading ? "Processing..." : "Upload & Validate"}
                        {!isLoading && <Upload className="ml-2 h-4 w-4" />}
                    </Button>
                </CardContent>
            </Card>

            {/* Validation Results */}
            {validationData && <ValidationResults validationData={validationData} />}

            {/* Continue Button */}
            {validationData && validationData.valid.length > 0 && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleContinue}
                        size="lg"
                        className="w-full md:w-auto"
                    >
                        Continue with {validationData.valid.length} Valid Participants
                    </Button>
                </div>
            )}
        </div>
    );
}
