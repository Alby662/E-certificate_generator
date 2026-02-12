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

export function FieldDefinitionStep({ project, participants, templatePath, onNext, onBack, onUpdateProject, isMultiEventMode, multiEventData }) {
    const [fields, setFields] = useState(project?.fields || defaultFields);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Approval State Logic
    const isApproved = project?.previewApproved || false;
    const isDirty = project?.lastFieldUpdateAt && project?.previewApprovedAt
        ? new Date(project.lastFieldUpdateAt) > new Date(project.previewApprovedAt)
        : false;

    const [eventMetadata, setEventMetadata] = useState({
        eventName: project?.eventName || '',
        organizationName: project?.organizationName || 'Yukti Yantra',
        eventDate: project?.eventDate ? new Date(project.eventDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });

    const handleNext = async () => {
        if (fields.length === 0) {
            toast.error("Please define at least one field.");
            return;
        }

        if (!isApproved || isDirty) {
            toast.warning("Professional recommendation: Please preview and approve the certificate before proceeding.");
        }

        // MULTI-EVENT MODE LOGIC
        if (isMultiEventMode && multiEventData) {
            // Validate multi-event data structure
            if (!Array.isArray(multiEventData.participations) || !Array.isArray(multiEventData.events)) {
                toast.error("Invalid multi-event data structure. Please re-upload the Excel file.");
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/certificates/create-multi-event-project`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        projectName: eventMetadata.eventName || `Multi-Event Project ${new Date().toLocaleString()}`,
                        templatePath: templatePath,
                        fields: fields,
                        participations: multiEventData.participations,
                        events: multiEventData.events
                    })
                });

                const data = await response.json();
                if (data.success) {
                    toast.success(`Created ${data.data.events.length} events successfully!`);
                    // Pass the multi-event data structure as the "project"
                    onNext(fields, data.data);
                } else {
                    toast.error("Failed to create multi-event project: " + data.error);
                }
            } catch (err) {
                console.error("Multi-event creation failed:", err);
                toast.error("Network error during creation");
            }
            return;
        }

        // STANDARD SINGLE EVENT LOGIC
        // CREATE EVENT IF NOT EXISTS
        if (!project?.id) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/certificates/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        templatePath: templatePath,
                        fields: fields,
                        ...eventMetadata
                    })
                });

                const data = await response.json();
                if (data.success) {
                    // Update project with new fields
                    const newProject = { ...data.project, ...eventMetadata };
                    onNext(fields, newProject);
                    return;
                } else {
                    toast.error("Failed to initialize event");
                }
            } catch (err) {
                console.error("Event creation failed:", err);
            }
        } else {
            // OPTIONAL: Update project metadata if changed
            // For now, we assume user keeps same metadata or we update it in generation step
            const updatedProject = { ...project, ...eventMetadata };
            onNext(fields, updatedProject);
        }
    };

    const handleApproval = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/certificates/events/${project?.id}/approve-preview`, {
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-2">
                        <label htmlFor="event-name" className="text-sm font-medium">Event Name</label>
                        <input
                            id="event-name"
                            type="text"
                            value={eventMetadata.eventName}
                            onChange={(e) => setEventMetadata({ ...eventMetadata, eventName: e.target.value })}
                            placeholder="e.g. Annual Tech Summit"
                            className="w-full p-2 border rounded-md text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="organization-name" className="text-sm font-medium">Organization</label>
                        <input
                            id="organization-name"
                            type="text"
                            value={eventMetadata.organizationName}
                            onChange={(e) => setEventMetadata({ ...eventMetadata, organizationName: e.target.value })}
                            placeholder="e.g. Yukti Yantra"
                            className="w-full p-2 border rounded-md text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="event-date" className="text-sm font-medium">Event Date</label>
                        <input
                            id="event-date"
                            type="date"
                            value={eventMetadata.eventDate}
                            onChange={(e) => setEventMetadata({ ...eventMetadata, eventDate: e.target.value })}
                            className="w-full p-2 border rounded-md text-sm"
                        />
                    </div>
                </div>

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
