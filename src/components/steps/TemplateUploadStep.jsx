import { Upload } from "lucide-react";
import { useState } from "react";
import { API_BASE_URL } from '../../lib/api';

export function TemplateUploadStep({ onNext, onMultiEventStart }) {
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
            // Get token from localStorage
            const token = localStorage.getItem('token');

            if (!token) {
                alert('Please login to continue');
                setIsUploading(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/certificates/upload-template`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server Error (${response.status}): ${errorText.slice(0, 200)}`);
            }

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error("Invalid response from server (Parse Error)");
            }

            if (data.success) {
                // Backend returns { success, data: { templatePath, publicUrl, filename } }
                // Use publicUrl for display, templatePath for backend API calls
                const templatePath = data.data?.publicUrl || data.data?.templatePath || data.templatePath;
                console.log('[Template Upload] Received:', data.data);
                console.log('[Template Upload] Using path:', templatePath);
                onNext(templatePath);
            } else {
                throw new Error(data.message || "Upload failed");
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

            <div className="mt-8 text-center bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2">Have a Multi-Event Sheet?</h4>
                <p className="text-sm text-blue-700 mb-4">
                    If your Excel sheet contains columns for multiple events (e.g., "Event 1", "Event 2"), use our bulk importer to split them automatically.
                </p>
                <button
                    type="button"
                    onClick={onMultiEventStart}
                    className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
                >
                    Start Multi-Event Import
                </button>
            </div>
        </div>
    );
}
