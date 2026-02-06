import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ currentStep = 1 }) {
    const steps = [
        { id: 1, label: "Upload Template" },
        { id: 2, label: "Define Fields" },
        { id: 3, label: "Generate Certificates" },
    ];

    return (
        <div className="flex items-center justify-center py-8">
            <div className="flex items-center">
                {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={step.id} className="flex items-center">
                            <div className="flex items-center gap-2">
                                <div
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-blue-600 text-white"
                                            : isCompleted
                                                ? "bg-green-500 text-white"
                                                : "bg-slate-200 text-slate-500"
                                    )}
                                >
                                    {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                                </div>
                                <span
                                    className={cn(
                                        "text-sm font-medium",
                                        isActive ? "text-blue-600" : "text-slate-500"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </div>
                            {!isLast && (
                                <div className="mx-4 h-[1px] w-16 bg-slate-200 sm:w-24" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
