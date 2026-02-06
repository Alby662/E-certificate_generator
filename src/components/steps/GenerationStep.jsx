import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, ArrowRight, Download } from "lucide-react";
import { toast } from "sonner";

export function GenerationStep({ participants, templatePath, fields, onNext }) {
    const [progress, setProgress] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [generatedCertificates, setGeneratedCertificates] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        startGeneration();
    }, []);

    const startGeneration = async () => {
        setIsGenerating(true);
        setProgress(10); // Start progress

        try {
            // In a real scenario, we might want to upload the template first if not already done.
            // Assuming templatePath is passed or we handle it.
            // For this implementation, let's assume we send the request to generate.

            const response = await fetch('/api/certificates/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participants,
                    templatePath: templatePath || 'default-template.png',
                    fields
                }),
            });

            const data = await response.json();

            if (data.success) {
                setProgress(100);
                setIsComplete(true);
                setGeneratedCertificates(data.certificates);
                toast.success(`Successfully generated ${data.generatedCount} certificates`);
            } else {
                setError(data.message || "Generation failed");
                toast.error("Generation failed");
            }
        } catch (err) {
            setError("Network error during generation.");
            toast.error("Network error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadZip = async () => {
        try {
            const filePaths = generatedCertificates.map(c => c.path);
            const response = await fetch('/api/certificates/download-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePaths })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'certificates.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success("Download started");
            } else {
                toast.error("Failed to download ZIP");
            }
        } catch (err) {
            console.error(err);
            toast.error("Download error");
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Generating Certificates</CardTitle>
                <CardDescription>
                    Please wait while we generate PDF certificates for {participants.length} participants.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                </div>

                {isGenerating && (
                    <div className="flex items-center justify-center text-slate-500 py-4">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Processing...</span>
                    </div>
                )}

                {isComplete && (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Complete!</AlertTitle>
                        <AlertDescription className="text-green-700">
                            All certificates have been generated successfully.
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex gap-4">
                    <Button
                        onClick={handleDownloadZip}
                        disabled={!isComplete}
                        variant="outline"
                        className="w-full"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download All (ZIP)
                    </Button>
                    <Button
                        onClick={() => onNext(generatedCertificates)}
                        disabled={!isComplete}
                        className="w-full"
                    >
                        Continue to Email Sending
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
