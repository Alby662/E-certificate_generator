import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, ArrowRight, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from '../../lib/api';
import { PreviewModal } from '../modals/PreviewModal';

export function GenerationStep({ project, participants, templatePath, fields, onNext, isMultiEventMode }) {
    // Confirmation state
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [responseProjectId, setResponseProjectId] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Polling State
    const [status, setStatus] = useState({
        total: 0,
        generation: { generated: 0, failed: 0, pending: 0 },
        email: { sent: 0, failed: 0, pending: 0 }
    });

    // Multi-Event Status State
    const [multiStatus, setMultiStatus] = useState({});

    const pollingInterval = useRef(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => stopPolling();
    }, []);

    const stopPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };

    const pollStatus = async (projectId) => {
        try {
            const token = localStorage.getItem('token');

            if (isMultiEventMode && project?.events) {
                // Multi-Event Polling
                const newMultiStatus = { ...multiStatus };
                let allComplete = true;
                let totalGen = 0;
                let totalTarget = 0;

                await Promise.all(project.events.map(async (event) => {
                    const res = await fetch(`${API_BASE_URL}/api/certificates/email-status/${event.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        newMultiStatus[event.id] = data;
                        if (data.generation.pending > 0) allComplete = false;

                        totalGen += data.generation.generated + data.generation.failed;
                        totalTarget += data.total;
                    }
                }));

                setMultiStatus(newMultiStatus);
                const overallProgress = totalTarget > 0 ? (totalGen / totalTarget) * 100 : 0;
                setProgress(prev => Math.round(overallProgress));

                if (allComplete && totalTarget > 0) {
                    setIsComplete(true);
                    setIsGenerating(false);
                    stopPolling();
                    toast.success("All certificates generated!");
                }

            } else {
                // Single Event Polling
                const res = await fetch(`${API_BASE_URL}/api/certificates/email-status/${projectId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success) {
                    setStatus({
                        total: data.total,
                        generation: data.generation,
                        email: data.email
                    });

                    // Calculate overall progress
                    const genProgress = data.total > 0 ? ((data.generation.generated + data.generation.failed) / data.total) * 100 : 0;
                    setProgress(prev => Math.round(genProgress));

                    // Check for completion
                    if (data.generation.pending === 0 && data.total > 0) {
                        setIsComplete(true);
                        setIsGenerating(false);
                        stopPolling();
                        toast.success("Generation completed!");
                    }
                }
            }
        } catch (error) {
            console.error("Polling error:", error);
        }
    };

    const startGeneration = async () => {
        setIsGenerating(true);
        setIsComplete(false);
        setProgress(0);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Authentication required');
                setIsGenerating(false);
                return;
            }

            if (isMultiEventMode && project?.events) {
                // Multi-Event Generation: Trigger for each event individually
                // Filter participants by matching their 'eventName' to the event's suffix (e.g., "Project - EventName")
                let successCount = 0;

                for (const event of project.events) {
                    const targetParticipants = participants.filter(p => event.name.endsWith(p.eventName));

                    const response = await fetch(`${API_BASE_URL}/api/certificates/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            participants: targetParticipants,
                            templatePath: templatePath || 'default-template.png',
                            fields,
                            projectName: event.name,
                            projectId: event.id
                        }),
                    });

                    if (response.ok) successCount++;
                }

                if (successCount > 0) {
                    toast.success(`Started generation for ${successCount} events.`);
                    // Start polling
                    stopPolling();
                    pollingInterval.current = setInterval(() => pollStatus(null), 3000); // Pass null or ignored ID
                } else {
                    setError("Failed to start generation for events.");
                    setIsGenerating(false);
                }

            } else {
                // Single Event Generation
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
                        projectName: project?.eventName || project?.name || `Event ${new Date().toLocaleDateString()}`,
                        projectId: project?.id
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Generation failed with status ${response.status}`);
                }

                const data = await response.json();

                if (data.success || response.status === 202) {
                    const pid = data.projectId || project?.id;
                    setResponseProjectId(pid);
                    toast.success('Generation started in background...');

                    // Start Polling
                    stopPolling();
                    pollingInterval.current = setInterval(() => pollStatus(pid), 2000);
                } else {
                    setError(data.message || "Generation failed to start");
                    setIsGenerating(false);
                }
            }
        } catch (err) {
            console.error(err);
            setError("Network error starting generation.");
            setIsGenerating(false);
        }
    };

    const sanitizeFilename = (name) => {
        if (!name) return 'certificates';
        return name
            .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid chars
            .replace(/\s+/g, '_')           // Replace spaces
            .substring(0, 50)               // Limit length
            .trim() || 'certificates';
    };

    const handleDownloadZip = async () => {
        try {
            const token = localStorage.getItem('token');
            const pid = responseProjectId || project?.id;

            if (!pid && !isMultiEventMode) {
                toast.error("No project ID found to download.");
                return;
            }

            let projectsToDownload = [];
            if (isMultiEventMode && project?.events) {
                projectsToDownload = project.events.map(e => ({ id: e.id, name: e.name }));
            } else {
                projectsToDownload = [{ id: pid, name: 'certificates' }];
            }

            toast.info(`Starting batch download for ${projectsToDownload.length} items...`);

            for (let i = 0; i < projectsToDownload.length; i++) {
                const p = projectsToDownload[i];
                toast.loading(`Downloading ${p.name}...`, { id: `dl-${p.id}` });

                try {
                    const response = await fetch(`${API_BASE_URL}/api/certificates/download/${p.id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                    });

                    if (response.ok) {
                        const contentDisposition = response.headers.get('Content-Disposition');
                        let filename = `${sanitizeFilename(p.name)}.zip`;

                        // Try to get filename from header
                        if (contentDisposition) {
                            const matches = /filename="?([^";\n]+)"?/.exec(contentDisposition);
                            if (matches && matches[1]) {
                                filename = matches[1];
                            }
                        }

                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                        toast.success(`${p.name} downloaded`, { id: `dl-${p.id}` });
                    } else {
                        const data = await response.json();
                        toast.error(`Failed ${p.name}: ${data.message || 'Error'}`, { id: `dl-${p.id}` });
                    }
                } catch (err) {
                    toast.error(`Error downloading ${p.name}`, { id: `dl-${p.id}` });
                }
            }

            toast.success("All downloads initiated!");

        } catch (error) {
            console.error('Download error:', error);
            toast.error("Failed to complete batch download");
        }
    };

    return (
        <>
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Certificate Generation</CardTitle>
                    <CardDescription>
                        {isGenerating ? "Processing your certificates..." : `Ready to process ${participants.length} certificates.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Multi-Event Status Dashboard */}
                    {isMultiEventMode && isGenerating && (
                        <div className="space-y-4">
                            {project?.events?.map(event => {
                                const eStatus = multiStatus[event.id] || { generation: { generated: 0, total: 0 } };
                                const total = eStatus.total || 1;
                                const current = (eStatus.generation?.generated || 0) + (eStatus.generation?.failed || 0);
                                const percent = (current / total) * 100;

                                return (
                                    <div key={event.id} className="border p-3 rounded bg-slate-50 text-sm">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-semibold">{event.name}</span>
                                            <span>{current} / {total}</span>
                                        </div>
                                        <Progress value={percent} className="h-2" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Standard Progress Dashboard */}
                    {(!isMultiEventMode && (isGenerating || isComplete || progress > 0)) && (
                        <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                            <h3 className="font-semibold text-sm text-slate-700">Generation Status</h3>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Generated</span>
                                    <span>{status.generation.generated} / {status.total}</span>
                                </div>
                                <Progress value={(status.generation.generated / (status.total || 1)) * 100} className="h-2 bg-slate-200" />
                            </div>
                            {status.generation.failed > 0 && (
                                <Alert variant="destructive" className="py-2">
                                    <AlertDescription className="text-xs">
                                        {status.generation.failed} certificates failed. @TODO Retry
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    {!isGenerating && !isComplete && (
                        <div className="flex gap-4">
                            {!isMultiEventMode && (
                                <Button variant="outline" className="w-full" onClick={() => setIsPreviewOpen(true)}>
                                    <Eye className="mr-2 h-4 w-4" /> Preview
                                </Button>
                            )}
                            <Button className="w-full" onClick={startGeneration}>
                                Start Generation {isMultiEventMode ? '(All Events)' : ''}
                            </Button>
                        </div>
                    )}

                    {isComplete && (
                        <div className="flex gap-4">
                            <Button
                                onClick={() => onNext(null, responseProjectId)}
                                className="w-full"
                            >
                                Continue to Email
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                </CardContent>
            </Card>

            <PreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                projectId={project?.id}
                participants={participants}
                templatePath={templatePath}
                fields={fields}
                onApprove={() => setIsPreviewOpen(false)}
            />
        </>
    );
}

