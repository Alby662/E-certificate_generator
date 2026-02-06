import { useState } from "react";
import FieldEditorCanvas from "@/components/field-editor-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function FieldDefinitionStep({ templatePath, onNext, onBack }) {
    const [fields, setFields] = useState([
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
            fontFamily: 'Great Vibes'
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
            fontFamily: 'Roboto'
        },
        {
            id: '3',
            key: 'date',
            label: 'Date',
            x: 0.8,
            y: 0.8,
            fontSize: 0.02,
            color: '#666666',
            align: 'left',
            fontWeight: 'normal',
            fontFamily: 'Roboto'
        }
    ]);

    const handleNext = () => {
        onNext(fields);
    };

    // Construct the full URL for the template image
    // Assuming templatePath is relative to the backend uploads folder, served via /uploads
    // But wait, the backend returns 'templatePath' which might be an absolute server path or relative.
    // In TemplateUploadStep, we saw it returns `data.templatePath`.
    // We need to make sure we can load this image in the canvas.
    // If it's a local file path on the server, we need a URL to access it.
    // The server.js has `app.use('/uploads', express.static(...))`.
    // So if the path is `uploads/templates/file.png`, we can access it via `http://localhost:5000/uploads/templates/file.png`.

    // Let's assume the backend returns a path we can convert to a URL.
    // Or better, let's fix the backend to return a relative URL.
    // For now, let's try to construct a URL.

    // If templatePath is "backend/uploads/templates/..." or similar.
    // Let's assume for now we can get it via /uploads if we strip the backend part.

    // Actually, let's look at how we can get the image.
    // If the user just uploaded it, maybe we can use a blob URL if we had it, but we only have the path from the server response.
    // We'll assume the server serves it.

    // HACK: For now, let's try to use the filename from the path if possible, or just assume it's served.
    // If the path is absolute, we can't use it directly in the browser.
    // We might need to update the backend to return a public URL.

    // Let's assume the backend serves /uploads.
    // We need to convert the file path to a URL.
    // If path is `.../uploads/templates/image.png`, we want `/uploads/templates/image.png`.

    const getImageUrl = (path) => {
        if (!path || typeof path !== 'string') return '';
        // Normalize path separators
        const normalized = path.replace(/\\/g, '/');
        // Find 'uploads' and take everything after
        const index = normalized.indexOf('uploads');
        if (index !== -1) {
            return `http://localhost:5000/${normalized.substring(index)}`;
        }
        return path;
    };

    return (
        <Card className="w-full max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle>Define Certificate Fields</CardTitle>
                <CardDescription>
                    Drag and drop fields to position them on your certificate.
                    Click a field to edit its properties.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="min-h-[600px]">
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
        </Card>
    );
}
