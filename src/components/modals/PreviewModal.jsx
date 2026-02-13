import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fetchWithTimeout, getApiUrl } from "../../lib/api";

// EDGE CASE TEST PARTICIPANT: Stress-test baseline alignment & overflow
const TEST_PARTICIPANT = {
    name: "Christopher-James Montgomery III",  // Long name test
    email: "test@certificate-generator.com",
    event: "International Student Leadership Summit 2026",  // Long event name
    date: "February 7, 2026",
    // Optional: Add special character variants for future testing
    // name: "José María Ñoño-González",  // Special characters
    // name: "मुकेश अग्रवाल",  // Non-Latin script
};

export function PreviewModal({ isOpen, onClose, projectId, participants, templatePath, fields, onApprove }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isTestMode, setIsTestMode] = useState(false);

    // Use real participants if available, otherwise use test participant
    const activeParticipants = participants?.length > 0 ? participants : [TEST_PARTICIPANT];
    const activeParticipant = activeParticipants[currentIndex];

    const fetchPreview = async (index) => {
        setIsLoading(true);
        setError(null);

        // Determine if we're using test data
        const usingTestData = !participants || participants.length === 0;
        setIsTestMode(usingTestData);

        try {
            const token = localStorage.getItem('token');

            // Always send full context for better reliability, especially if DB participations aren't created yet
            const requestBody = {
                projectId: projectId ? parseInt(projectId) : null,
                participantIndex: index,
                templatePath: templatePath,
                fields: fields,
                participant: activeParticipant
            };

            const response = await fetchWithTimeout(
                getApiUrl('api/certificates/preview'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody)
                },
                60000  // 60s timeout for PDF generation
            );

            if (!response.ok) {
                throw new Error(`Preview failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Cleanup old URL
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);

            setPdfUrl(url);
            setCurrentIndex(index);

            if (usingTestData) {
                toast.info("Preview using test participant data");
            }
        } catch (err) {
            console.error('[Preview] Error:', err);
            setError(err.message);
            toast.error('Failed to generate preview');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetchWithTimeout(
                getApiUrl(`api/certificates/events/${projectId}/approve-preview`),
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                },
                15000  // 15s timeout for approval
            );

            if (!response.ok) {
                throw new Error('Approval failed');
            }

            toast.success('Preview approved! You can now generate certificates.');
            onApprove();
            onClose();
        } catch (err) {
            console.error('[Approve] Error:', err);
            setError(err.message);
            toast.error('Failed to approve preview');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch preview when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchPreview(0);
        }

        // Cleanup on unmount
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [isOpen]);



    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Visual QA: Final PDF Preview</DialogTitle>
                    <DialogDescription>
                        Review the certificate before bulk generation
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {isTestMode && (
                    <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                            <strong>Test Mode:</strong> Using sample participant data. Upload Excel to preview with real data.
                        </AlertDescription>
                    </Alert>
                )}

                {activeParticipant && (
                    <div className="text-sm bg-muted p-2 rounded">
                        <strong>Participant {currentIndex + 1} of {activeParticipants.length}:</strong>{' '}
                        {activeParticipant.name} ({activeParticipant.email})
                        {isTestMode && <span className="ml-2 text-amber-600 font-medium">(Test Data)</span>}
                    </div>
                )}

                <div className="flex-1 overflow-hidden bg-slate-100 rounded-lg relative">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2">Generating preview...</span>
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full border-0"
                            title="Certificate Preview"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No preview available
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => fetchPreview(currentIndex - 1)}
                            disabled={currentIndex === 0 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => fetchPreview(currentIndex + 1)}
                            disabled={currentIndex === activeParticipants.length - 1 || isLoading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                    <Button
                        onClick={handleApprove}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isLoading || isTestMode}
                        title={isTestMode ? "Upload real participant data to approve" : "Approve this layout"}
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        ✅ Approve & Proceed
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
