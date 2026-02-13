import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import FieldEditorCanvas from "@/components/field-editor-canvas";
import { useMemo } from "react";
import { API_BASE_URL, getAuthenticatedImageUrl } from '../../lib/api';

export function PreviewStep({ participants, templatePath, fields, onNext, onBack }) {

    const getImageUrl = (path) => getAuthenticatedImageUrl(path);

    // Create a preview version of fields with actual data from the first participant
    const previewFields = useMemo(() => {
        if (!participants.length || !fields) return fields;
        const sample = participants[0];
        return fields.map(f => ({
            ...f,
            label: sample[f.key] || f.label // Replace label with actual data if key matches
        }));
    }, [participants, fields]);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Visual Preview</CardTitle>
                    <CardDescription>
                        This is how the first certificate will look.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md overflow-hidden">
                        {/* We use FieldEditorCanvas but we might want to disable editing. 
                            The current component doesn't explicitly support read-only, 
                            but we can just ignore onChange or pass a no-op. 
                            However, user can still drag fields. 
                            Ideally we should add a 'readOnly' prop to FieldEditorCanvas.
                            For now, let's just show it. The user can tweak it here if they want, 
                            but it won't save back to the main state unless we wire it up.
                            Actually, it might be confusing if they move it here and it doesn't save.
                            Let's just display it.
                        */}
                        <FieldEditorCanvas
                            src={getImageUrl(templatePath)}
                            initialFields={previewFields}
                            onChange={() => { }} // No-op to prevent state updates from here
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Participants Data</CardTitle>
                    <CardDescription>
                        Review the data extracted from your Excel file.
                        Found {participants.length} participants.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">ID</th>
                                    <th className="px-4 py-2">Name</th>
                                    <th className="px-4 py-2">Email</th>
                                    <th className="px-4 py-2">College</th>
                                    <th className="px-4 py-2">Event</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map((p, index) => (
                                    <tr key={index} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium">{p.certificate_id}</td>
                                        <td className="px-4 py-2">{p.name}</td>
                                        <td className="px-4 py-2">{p.email}</td>
                                        <td className="px-4 py-2">{p.college}</td>
                                        <td className="px-4 py-2">{p.event}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollArea>

                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button onClick={onNext}>
                            Proceed to Generation
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
