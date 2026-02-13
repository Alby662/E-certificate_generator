import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, Mail, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

export function EmailSendingStep({ project, projectId, participants = [], certificates = [], onFinish }) {
    // Robust state initialization
    const [status, setStatus] = useState({
        total: participants?.length || 0,
        email: { sent: 0, failed: 0, pending: participants?.length || 0 },
        generation: { generated: 0, failed: 0, pending: 0 }
    });
    const [isSending, setIsSending] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const startSending = async () => {
        setIsSending(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error("Please login to send emails");
                setIsSending(false);
                return;
            }

            const currentId = project?.id || projectId;

            const response = await fetch(`${API_BASE_URL}/api/certificates/send-emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    projectId: currentId
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Email sending started");
                pollStatus();
            } else {
                toast.error(data.message || "Failed to start email sending");
                setIsSending(false);
            }
        } catch (err) {
            console.error("Email start error:", err);
            toast.error("Network error starting email process");
            setIsSending(false);
        }
    };

    const pollStatus = () => {
        const intervalId = setInterval(async () => {
            try {
                const currentId = project?.id || projectId;
                if (!currentId) {
                    clearInterval(intervalId);
                    return;
                }

                const token = localStorage.getItem('token');
                if (!token) {
                    clearInterval(intervalId);
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/api/certificates/email-status/${currentId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) return;

                const data = await response.json();
                if (data.success) {
                    setStatus(data);

                    // Completion logic
                    if (data.email.pending === 0 && data.total > 0) {
                        clearInterval(intervalId);
                        setIsSending(false);
                        setIsComplete(true);
                        toast.success("Email sending completed");
                    }
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 3000);

        // Safety cleanup for this interval
        return () => clearInterval(intervalId);
    };

    const progressPercentage = Math.round((((status.email?.sent ?? 0) + (status.email?.failed ?? 0)) / (status.total || 1)) * 100) || 0;

    const handleDownloadZip = async () => {
        try {
            const currentProjectId = project?.id || projectId;
            if (!currentProjectId) {
                toast.error('Project ID not found');
                return;
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/certificates/download/${currentProjectId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificates_${currentProjectId}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success("Download started");
            } else {
                const errorText = await response.text();
                toast.error(errorText || "Failed to download ZIP");
            }
        } catch (err) {
            console.error(err);
            toast.error("Download error");
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Sending Emails</CardTitle>
                <CardDescription>
                    Sending certificates to {participants?.length ?? 0} participants.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Progress</span>
                        <span>{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="w-full" />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold text-slate-700">{status.total ?? 0}</div>
                        <div className="text-xs text-slate-500 uppercase">Total</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{status.email?.sent ?? 0}</div>
                        <div className="text-xs text-green-600 uppercase">Sent</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{status.email?.failed ?? 0}</div>
                        <div className="text-xs text-red-600 uppercase">Failed</div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {!isSending && !isComplete && (
                        <div className="flex gap-3">
                            <Button onClick={handleDownloadZip} variant="outline" className="w-full">
                                <Download className="mr-2 h-4 w-4" />
                                Download ZIP
                            </Button>
                            <Button onClick={startSending} className="w-full">
                                Start Sending Emails
                                <Mail className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {isSending && (
                        <div className="flex items-center justify-center text-slate-500 py-4">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span>Sending emails...</span>
                        </div>
                    )}
                </div>

                {isComplete && (
                    <div className="space-y-4">
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Process Complete</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Email distribution finished.
                            </AlertDescription>
                        </Alert>

                        {(status.email?.failed ?? 0) > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Some emails failed</AlertTitle>
                                <AlertDescription>
                                    <p>{status.email?.failed ?? 0} emails could not be sent.</p>
                                    {status.errors && status.errors.length > 0 && (
                                        <div className="mt-2 max-h-40 overflow-y-auto text-xs bg-red-100 p-2 rounded border border-red-200 font-mono">
                                            {status.errors.map((err, i) => (
                                                <div key={i} className="mb-1 border-b border-red-200 pb-1 last:border-0">
                                                    {err}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex gap-3">
                            <Button onClick={handleDownloadZip} variant="outline" className="w-full">
                                <Download className="mr-2 h-4 w-4" />
                                Download ZIP
                            </Button>
                            <Button onClick={onFinish} variant="outline" className="w-full">
                                Return Home
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
