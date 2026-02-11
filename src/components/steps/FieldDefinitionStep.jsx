import { useState } from "react";
import FieldEditorCanvas from "@/components/field-editor-canvas";
import { PreviewModal } from "@/components/modals/PreviewModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { API_BASE_URL } from '../../lib/api';

const defaultFields = [
    {
        id: '1',
        key: 'name',
        label: 'Recipient Name',
        x: 0.5,
        y: 0.45,
        fontSize: 0.05,
        color: '#1a1a1a',
        align: 'center',
        fontWeight: 'bold',
        fontFamily: 'Playfair Display',
        vOffset: -6
    },
    {
        id: '2',
        key: 'event',
        label: 'Event Name',
        x: 0.5,
        y: 0.55,
        fontSize: 0.03,
        color: '#333333',
        align: 'center',
        fontWeight: 'normal',
        fontFamily: 'Montserrat',
        vOffset: -3
    },
    {
        id: '3',
        key: 'date',
        label: 'Date',
        x: 0.5,
        y: 0.65,
        fontSize: 0.025,
        color: '#666666',
        align: 'center',
        fontWeight: 'normal',
        fontFamily: 'Montserrat',
        vOffset: 0
    }
];

export function FieldDefinitionStep({ project, participants, templatePath, onNext, onBack, onUpdateProject }) {
    const [fields, setFields] = useState(project?.fields || defaultFields);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Approval State Logic
    const isApproved = project?.previewApproved || false;
    const isDirty = project?.lastFieldUpdateAt && project?.previewApprovedAt
        ? new Date(project.lastFieldUpdateAt) > new Date(project.previewApprovedAt)
        : false;

    const handleNext = async () => {
        if (fields.length === 0) {
            toast.error("Please define at least one field.");
            return;
        }

        if (!isApproved || isDirty) {
            toast.warning("Professional recommendation: Please preview and approve the certificate before proceeding.");
        }

        // CREATE PROJECT IF NOT EXISTS
        if (!project?.id) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/certificates/create-project`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: `Project ${new Date().toLocaleString()}`,
                        templatePath: templatePath,
                        fields: fields
                    })
                });

                const data = await response.json();
                if (data.success) {
                    // Pass fields AND the new project object
                    onNext(fields, data.project);
                    return;
                } else {
                    toast.error("Failed to initialize project");
                    // Fallback to continue without project ID (will be created at generation)
                }
            } catch (err) {
                console.error("Project creation failed:", err);
                // Fallback
            }
        }

        // Check if onNext accepts the project argument (based on our future change to Home.jsx)
        // If project exists, pass it too
        onNext(fields, project);
    };

    const handleApproval = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/certificates/projects/${project.id}/approve-preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                if (onUpdateProject) {
                    onUpdateProject(data.project);
                }
                setIsPreviewOpen(false);
                toast.success("Certificate layout approved!");
            } else {
                toast.error("Failed to approve preview");
            }
        } catch (error) {
            console.error('[Approval] Error:', error);
            toast.error("Failed to save approval.");
        }
    };

    const getImageUrl = (path) => {
        if (!path || typeof path !== 'string') return '';
        const normalized = path.replace(/\\/g, '/');
        const index = normalized.indexOf('uploads');
        return index !== -1 ? `${API_BASE_URL}/${normalized.substring(index)}` : path;
    };

    return (
        <Card className="w-full max-w-6xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Define Certificate Fields</CardTitle>
                    <CardDescription>
                        Drag and drop fields to position them exactly on your template.
                    </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                    <Button
                        variant={isApproved && !isDirty ? "outline" : "default"}
                        onClick={() => setIsPreviewOpen(true)}
                        className="gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        {isApproved && !isDirty ? "Review Preview" : "Preview Certificate"}
                    </Button>
                    {isApproved && !isDirty && (
                        <div className="flex items-center text-green-600 text-sm font-medium gap-1 px-3 py-2 bg-green-50 rounded-md border border-green-200">
                            <CheckCircle2 className="h-4 w-4" />
                            Approved
                        </div>
                    )}
                    {isDirty && (
                        <div className="flex items-center text-amber-600 text-sm font-medium gap-1 px-3 py-2 bg-amber-50 rounded-md border border-amber-200">
                            <AlertCircle className="h-4 w-4" />
                            Re-preview Required
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {(!isApproved || isDirty) && (
                    <Alert className="mb-4">
                        <AlertDescription>
                            {isDirty
                                ? "Fields were modified after approval. Please re-preview before bulk generation."
                                : "Please preview and approve the certificate layout before proceeding to bulk generation."}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="min-h-[600px] border rounded-lg bg-slate-100 overflow-hidden">
                    <FieldEditorCanvas
                        src={getImageUrl(templatePath)}
                        initialFields={fields}
                        onChange={setFields}
                    />
                </div>

                <div className="flex justify-between pt-6 mt-4 border-t">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button onClick={handleNext}>
                        Next: Upload Data
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>

            <PreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                projectId={project?.id}
                participants={participants}
                templatePath={templatePath}
                fields={fields}
                onApprove={handleApproval}
            />
        </Card>
    );
}
