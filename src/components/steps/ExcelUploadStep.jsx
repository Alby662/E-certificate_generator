import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ExcelUploadStep({ onNext, onDataParsed }) {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.name.endsWith('.xlsx')) {
                setFile(selectedFile);
                setError(null);
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

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/certificates/bulk-upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Successfully parsed ${data.count} participants`);
                onDataParsed(data.participants);
                onNext();
            } else {
                setError(data.message || "Failed to parse Excel file");
                toast.error("Upload failed");
            }
        } catch (err) {
            setError("Network error. Please ensure backend is running.");
            toast.error("Network error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Upload Participant Data</CardTitle>
                <CardDescription>
                    Upload an Excel sheet (.xlsx) containing participant details.
                    Required columns: name, email, college, event, certificate_id
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
                    {isLoading ? "Processing..." : "Upload & Continue"}
                    {!isLoading && <Upload className="ml-2 h-4 w-4" />}
                </Button>
            </CardContent>
        </Card>
    );
}
