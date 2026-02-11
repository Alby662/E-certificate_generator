import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Stepper } from "@/components/ui/Stepper";
import { TemplateUploadStep } from "@/components/steps/TemplateUploadStep";
import { FieldDefinitionStep } from "@/components/steps/FieldDefinitionStep";
import { ExcelUploadStep } from "@/components/steps/ExcelUploadStep";
import { PreviewStep } from "@/components/steps/PreviewStep";
import { GenerationStep } from "@/components/steps/GenerationStep";
import { EmailSendingStep } from "@/components/steps/EmailSendingStep";

export default function Home() {
    const [currentStep, setCurrentStep] = useState(1);
    const [templatePath, setTemplatePath] = useState(null);
    const [fields, setFields] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [project, setProject] = useState(null);
    const [certificates, setCertificates] = useState([]);

    const handleTemplateUploaded = (path) => {
        setTemplatePath(path);
        setCurrentStep(2);
    };

    const handleFieldsDefined = (definedFields, projectData) => {
        setFields(definedFields);
        if (projectData) {
            setProject(projectData);
        }
        setCurrentStep(3);
    };

    const handleDataParsed = (data) => {
        setParticipants(data);
    };

    const handleExcelUploaded = () => {
        setCurrentStep(4);
    };

    const handlePreviewConfirmed = () => {
        setCurrentStep(5);
    };

    const handleGenerationComplete = (generatedCerts, projectId) => {
        setCertificates(generatedCerts);
        // If generation returned a project ID (potentially new or updated), update state
        if (projectId) {
            // Merge with existing project or create simple object if null
            setProject(prev => prev ? { ...prev, id: projectId } : { id: projectId });
        }
        setCurrentStep(6);
    };

    const handleProcessComplete = () => {
        // Reset or redirect
        window.location.reload();
    };

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header />

            <main className="flex-1">
                <Stepper currentStep={currentStep} />

                <div className="container mx-auto max-w-6xl px-4 py-8">
                    {currentStep === 1 && (
                        <TemplateUploadStep onNext={handleTemplateUploaded} />
                    )}
                    {currentStep === 2 && (
                        <FieldDefinitionStep
                            project={project}
                            participants={participants}
                            templatePath={templatePath}
                            onNext={handleFieldsDefined}
                            onBack={() => setCurrentStep(1)}
                            onUpdateProject={(updatedProject) => setProject(updatedProject)}
                        />
                    )}
                    {currentStep === 3 && (
                        <ExcelUploadStep
                            onNext={handleExcelUploaded}
                            onDataParsed={handleDataParsed}
                        />
                    )}
                    {currentStep === 4 && (
                        <PreviewStep
                            participants={participants}
                            templatePath={templatePath}
                            fields={fields}
                            onNext={handlePreviewConfirmed}
                            onBack={() => setCurrentStep(3)}
                        />
                    )}
                    {currentStep === 5 && (
                        <GenerationStep
                            participants={participants}
                            templatePath={templatePath}
                            fields={fields}
                            onNext={handleGenerationComplete}
                        />
                    )}
                    {currentStep === 6 && (
                        <EmailSendingStep
                            project={project}
                            participants={participants}
                            certificates={certificates}
                            onFinish={handleProcessComplete}
                        />
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
