import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, Mail, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function EmailSendingStep({ project, participants, certificates, onFinish }) {
    const [status, setStatus] = useState({ sent: 0, failed: 0, total: participants.length, errors: [] });
    const [isSending, setIsSending] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const startSending = async () => {
        setIsSending(true);

        try {
            // Transform certificates array to map if needed, or backend handles it.
            // Backend expects { participants, certificates }
            // certificates from GenerationStep might be array of { certificate_id, path }
            // Let's convert to map for easier backend handling if backend expects map, 
            // OR just pass what backend expects. 
            // My backend implementation of `sendEmails` expects `certificates` as a map { id: path }? 
            // Let's check backend implementation... 
            // "const certPath = certificatePaths[p.certificate_id];" -> Yes, it expects a map or object.

            const certMap = {};
            certificates.forEach(c => {
                // Backend expects a map of { certificate_id: fileName }
                // We will resolve the full path on the backend
                certMap[c.certificate_id] = c.fileName || c.filePath || c.path;
            });

            // Get token
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error("Please login to send emails");
                setIsSending(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/certificates/send-emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    participants,
                    certificates: certMap,
                    projectId: project?.id
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Email sending started");
                pollStatus();
            } else {
                toast.error("Failed to start email sending");
                setIsSending(false);
            }
        } catch (err) {
            toast.error("Network error");
            setIsSending(false);
        }
    };

    const pollStatus = () => {
        const interval = setInterval(async () => {
            try {
                if (!project?.id) return;
                const response = await fetch(`${API_BASE_URL}/api/certificates/email-status/${project.id}`);
                const data = await response.json();

                setStatus(data);

                if (data.sent + data.failed >= data.total) {
                    clearInterval(interval);
                    setIsSending(false);
                    setIsComplete(true);
                    toast.success("Email sending completed");
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 2000);
    };

    const progressPercentage = Math.round(((status.sent + status.failed) / status.total) * 100) || 0;

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Sending Emails</CardTitle>
                <CardDescription>
                    Sending certificates to {participants.length} participants.
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
                        <div className="text-2xl font-bold text-slate-700">{status.total}</div>
                        <div className="text-xs text-slate-500 uppercase">Total</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{status.sent}</div>
                        <div className="text-xs text-green-600 uppercase">Sent</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{status.failed}</div>
                        <div className="text-xs text-red-600 uppercase">Failed</div>
                    </div>
                </div>

                {!isSending && !isComplete && (
                    <Button onClick={startSending} className="w-full">
                        Start Sending Emails
                        <Mail className="ml-2 h-4 w-4" />
                    </Button>
                )}

                {isSending && (
                    <div className="flex items-center justify-center text-slate-500 py-4">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Sending emails...</span>
                    </div>
                )}

                {isComplete && (
                    <div className="space-y-4">
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Process Complete</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Email distribution finished.
                            </AlertDescription>
                        </Alert>

                        {status.failed > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Some emails failed</AlertTitle>
                                <AlertDescription>
                                    <p>{status.failed} emails could not be sent.</p>
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

                        <Button onClick={onFinish} variant="outline" className="w-full">
                            Return Home
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
