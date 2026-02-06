import { Upload } from "lucide-react";
import { useState } from "react";

export function TemplateUploadStep({ onNext }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) handleUpload(file);
    };

    const handleUpload = async (file) => {
        if (!file.type.startsWith('image/')) {
            alert("Please upload an image file (PNG, JPEG)");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('template', file);

        try {
            const response = await fetch('/api/certificates/upload-template', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.success) {
                onNext(data.templatePath);
            } else {
                alert("Upload failed: " + data.message);
            }
        } catch (error) {
            console.error("Error uploading template:", error);
            alert("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl">
            <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white px-6 py-20 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200"
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="mb-4 rounded-full bg-slate-100 p-4">
                    <Upload className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                    Upload Certificate Template
                </h3>
                <p className="mb-6 text-sm text-slate-500">
                    Drag and drop your template here, or click to browse
                </p>

                <label className="cursor-pointer rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    {isUploading ? "Uploading..." : "Choose File"}
                    <input
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                    />
                </label>

                <p className="mt-4 text-xs text-slate-400">
                    Supported formats: PNG, JPEG
                </p>
            </div>
        </div>
    );
}
