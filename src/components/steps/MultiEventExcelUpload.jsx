import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from 'sonner';
import { API_BASE_URL } from '../../lib/api';

export function MultiEventExcelUpload({ onComplete }) {
    const [file, setFile] = useState(null);
    const [parseResult, setParseResult] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setParseResult(null);
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error('Please select a file');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('excel', file);

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/certificates/import-multi-event`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setParseResult(data.data);
                toast.success('Excel parsed successfully!');
            } else {
                toast.error(data.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Network error during upload');
        } finally {
            setIsUploading(false);
        }
    };

    const handleProceed = () => {
        if (parseResult) {
            onComplete(parseResult);
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Multi-Event Bulk Import</CardTitle>
                <CardDescription>
                    Upload an Excel file where participants are registered for multiple events (e.g. columns "Event 1", "Event 2").
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <FileSpreadsheet className="h-12 w-12 text-blue-500 mb-4" />
                    <div className="space-y-2 mb-6">
                        <h3 className="font-semibold text-lg">Upload Participant Sheet</h3>
                        <p className="text-sm text-slate-500">Supports .xlsx and .xls formats</p>
                    </div>

                    <label htmlFor="excel-upload" className="sr-only">Upload Excel file</label>
                    <input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="mb-4 block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                    />

                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="w-full max-w-xs"
                    >
                        {isUploading ? (
                            <>Uploading...</>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Parse & Validate
                            </>
                        )}
                    </Button>
                </div>

                {parseResult && (
                    <div className="space-y-6 animate-in fade-in-50">
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Analysis Complete</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Successfully analyzed {parseResult.summary.totalRows} rows.
                            </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unique Participants</span>
                                <div className="text-2xl font-bold text-slate-700">{parseResult.participants.length}</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Events Found</span>
                                <div className="text-2xl font-bold text-slate-700">{parseResult.events.length}</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificates to Geneate</span>
                                <div className="text-2xl font-bold text-slate-700">{parseResult.summary.totalParticipations}</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Multi-Event Users</span>
                                <div className="text-2xl font-bold text-blue-600">{parseResult.summary.participantsWithMultipleEvents}</div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold mb-3 text-slate-700">Detected Events:</h4>
                            <div className="flex flex-wrap gap-2">
                                {parseResult.events.map((event, i) => (
                                    <span key={event} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {event}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {parseResult.errors && parseResult.errors.length > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Validation Warnings</AlertTitle>
                                <AlertDescription>
                                    {parseResult.errors.length} rows had errors and were skipped.
                                    <div className="mt-2 max-h-32 overflow-y-auto text-xs font-mono bg-white/50 p-2 rounded">
                                        {parseResult.errors.map((e, i) => (
                                            <div key={i}>Row {e.row}: {e.error}</div>
                                        ))}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleProceed} size="lg" className="gap-2">
                                Proceed onto Template Selection
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
