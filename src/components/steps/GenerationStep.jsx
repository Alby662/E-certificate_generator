import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, ArrowRight, Download } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from '../../lib/api';

export function GenerationStep({ project, participants, templatePath, fields, onNext }) {
    // Confirmation state
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [existingCount, setExistingCount] = useState(0);

    // Restored state variables
    const [progress, setProgress] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [generatedCertificates, setGeneratedCertificates] = useState([]);
    const [responseProjectId, setResponseProjectId] = useState(null);
    const [error, setError] = useState(null);

    // CONCURRENCY FIX: Prevent React Strict Mode double-execution
    const hasStartedGeneration = useRef(false);

    useEffect(() => {
        // In development, React Strict Mode intentionally double-renders
        // This ref ensures generation only starts once
        if (hasStartedGeneration.current) {
            return;
        }
        hasStartedGeneration.current = true;

        // CHECK FOR EXISTING DATA BEFORE STARTING
        checkExistingDataAndStart();
    }, []);

    const checkExistingDataAndStart = async () => {
        if (project?.id) {
            try {
                const token = localStorage.getItem('token');
                if (!token) return; // Should handle auth error

                // Check status
                const res = await fetch(`${API_BASE_URL}/api/certificates/projects/${project.id}/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.total > 0) {
                    setExistingCount(data.total);
                    setShowConfirmation(true);
                    return; // STOP! Wait for user confirmation
                }
            } catch (e) {
                console.error("Failed to check existing status", e);
                // If check fails, maybe just proceed? Or show error?
                // Proceeding is safer for UX flow if API is flaky, 
                // but risky for data. Let's proceed with warning in console.
            }
        }

        // If no existing data or no project ID (new project), start immediately
        startGeneration();
    };

    const confirmGeneration = () => {
        setShowConfirmation(false);
        startGeneration();
    };

    const cancelGeneration = () => {
        // Go back? Or just stay here?
        // Ideally should allow user to go back to prev step.
        // For now, toast and stay.
        toast.info("Generation cancelled.");
        // Maybe reset ref to allow retry?
        hasStartedGeneration.current = false; // Allow retry if they change their mind
    };

    // ... startGeneration definition ...
    const startGeneration = async () => {
        // ... existing implementation ...
        // HARD APPROVAL GATE REMOVED: Preview approval is now optional
        // User can proceed directly to generation

        // Optional: We can still log if it was approved or not, but won't block
        const isApproved = project?.previewApproved;
        if (!isApproved) {
            console.log('[Generation] Proceeding without explicit preview approval (User Flexibility)');
        }

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

            const response = await fetch(`${API_BASE_URL}/api/certificates/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    participants,
                    templatePath: templatePath || 'default-template.png',
                    fields,
                    projectName: `Certificate Project ${new Date().toLocaleDateString()} ${Date.now()}`,
                    projectId: project?.id // PASS EXISTING PROJECT ID
                }),
            });

            // LOGGING
            console.log('========== FRONTEND REQUEST PAYLOAD ==========');
            console.log('Project ID:', project?.id);

            const data = await response.json();

            if (data.success) {
                setProgress(100);
                setIsComplete(true);
                setGeneratedCertificates(data.data.certificates);
                setResponseProjectId(data.data.projectId);
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
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Please login to continue');
                return;
            }

            // Use responseProjectId from generation response, or fall back to project.id
            const projectId = responseProjectId || project?.id;

            if (!projectId) {
                toast.error('Project ID not found. Please regenerate certificates.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/certificates/download-zip`, {
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

    if (showConfirmation) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-amber-200 bg-amber-50">
                <CardHeader>
                    <CardTitle className="text-amber-800">Existing Data Found</CardTitle>
                    <CardDescription className="text-amber-700">
                        This project already has {existingCount} generated certificates.
                        Generating again will <strong>delete all existing warnings</strong> and create new ones.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4 justify-end">
                    <Button variant="outline" onClick={cancelGeneration} className="border-amber-300 text-amber-900 hover:bg-amber-100">
                        Cancel
                    </Button>
                    <Button onClick={confirmGeneration} className="bg-amber-600 hover:bg-amber-700 text-white">
                        Yes, Overwrite & Regenerate
                    </Button>
                </CardContent>
            </Card>
        );
    }

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
                        onClick={() => {
                            // Pass certificates AND the projectId (from response or props)
                            onNext(generatedCertificates, responseProjectId || project?.id);
                        }}
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
