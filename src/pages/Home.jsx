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
import { MultiEventExcelUpload } from "@/components/steps/MultiEventExcelUpload";
import { Button } from "@/components/ui/button";

export default function Home() {
    const [currentStep, setCurrentStep] = useState(1);
    const [templatePath, setTemplatePath] = useState(null);
    const [fields, setFields] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [project, setProject] = useState(null);
    const [certificates, setCertificates] = useState([]);

    // Multi-Event State
    const [isMultiEventMode, setIsMultiEventMode] = useState(false);
    const [multiEventData, setMultiEventData] = useState(null);

    const handleTemplateUploaded = (path) => {
        setTemplatePath(path);
        setCurrentStep(2);
    };

    const handleMultiEventStart = () => {
        setCurrentStep(0);
    };

    const handleMultiEventComplete = (data) => {
        setMultiEventData(data);
        setParticipants(data.participations); // Use participations flattened list? Or participants?
        // participations has { email, name, eventName }. 
        // We need this for generation. 
        // But FieldDefinition might need just names for preview? 
        // Let's pass the whole data object down.
        setIsMultiEventMode(true);
        setCurrentStep(1); // Go to Template Upload
    };

    const handleFieldsDefined = (definedFields, projectData) => {
        setFields(definedFields);
        if (projectData) {
            setProject(projectData);
        }

        if (isMultiEventMode) {
            // Multi-event mode skips Excel Upload (Step 3) but proceeds to the Preview (Step 4)
            setCurrentStep(4);
        } else {
            setCurrentStep(3);
        }
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
                <Stepper currentStep={currentStep > 0 ? currentStep : 0} />

                <div className="container mx-auto max-w-6xl px-4 py-8">
                    {currentStep === 0 && (
                        <div className="space-y-4">
                            <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                                &larr; Back to Single Event Mode
                            </Button>
                            <MultiEventExcelUpload onComplete={handleMultiEventComplete} />
                        </div>
                    )}

                    {currentStep === 1 && (
                        <TemplateUploadStep
                            onNext={handleTemplateUploaded}
                            onMultiEventStart={handleMultiEventStart}
                        />
                    )}
                    {currentStep === 2 && (
                        <FieldDefinitionStep
                            project={project}
                            participants={participants}
                            templatePath={templatePath}
                            onNext={handleFieldsDefined}
                            onBack={() => setCurrentStep(1)}
                            onUpdateProject={(updatedProject) => setProject(updatedProject)}
                            isMultiEventMode={isMultiEventMode}
                            multiEventData={multiEventData}
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
                            onBack={() => setCurrentStep(isMultiEventMode ? 2 : 3)}
                        />
                    )}
                    {currentStep === 5 && (
                        <GenerationStep
                            project={project}
                            participants={participants}
                            templatePath={templatePath}
                            fields={fields}
                            onNext={handleGenerationComplete}
                            isMultiEventMode={isMultiEventMode}
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
