import { useState, useEffect, useRef } from 'react';
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

    // CONCURRENCY FIX: Prevent React Strict Mode double-execution
    const hasStartedGeneration = useRef(false);

    useEffect(() => {
        // In development, React Strict Mode intentionally double-renders
        // This ref ensures generation only starts once
        if (hasStartedGeneration.current) {
            console.log('[Generation] Skipping duplicate call (React Strict Mode)');
            return;
        }
        hasStartedGeneration.current = true;
        console.log('[Generation] Starting generation (first call only)');
        startGeneration();
    }, []);

    const startGeneration = async () => {
        setIsGenerating(true);
        setProgress(10); // Start progress

        try {
            // Get authentication token
            const token = localStorage.getItem('token');

            if (!token) {
                setError('Please login to continue');
                toast.error('Authentication required');
                setIsGenerating(false);
                return;
            }

            const response = await fetch('/api/certificates/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    participants,
                    templatePath: templatePath || 'default-template.png',
                    fields,
                    projectName: `Certificate Project ${new Date().toLocaleDateString()}`
                }),
            });

            // PROOF: Show what's ACTUALLY being sent (not just counts)
            console.log('========== FRONTEND REQUEST PAYLOAD ==========');
            console.log('Participants (full array):', participants);
            console.log('  → Count:', participants.length);
            console.log('  → First participant:', participants[0]);
            console.log('Fields (full array):', fields);
            console.log('  → Count:', fields?.length);
            console.log('  → First field:', fields?.[0]);
            console.log('Template Path:', templatePath);
            console.log('==============================================');
            console.log('⚠️ Check Network Tab → Payload to see actual network request');

            const data = await response.json();

            if (data.success) {
                setProgress(100);
                setIsComplete(true);
                setGeneratedCertificates(data.data.certificates);
                toast.success(`Successfully generated ${data.data.generatedCount} certificates`);
            } else {
                setError(data.message || "Generation failed");
                toast.error("Generation failed");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Network error during generation.");
            toast.error("Network error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadZip = async () => {
        try {
            // Get authentication token
            const token = localStorage.getItem('token');

            if (!token) {
                toast.error('Please login to continue');
                return;
            }

            // Use projectId from the first certificate's response
            // The certificates array should have projectId from backend
            const projectId = generatedCertificates[0]?.projectId || 1;

            const response = await fetch('/api/certificates/download-zip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ projectId })
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
                const error = await response.json();
                toast.error(error.message || "Failed to download ZIP");
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
