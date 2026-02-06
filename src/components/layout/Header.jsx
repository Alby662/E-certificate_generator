import { FileText } from "lucide-react";

export function Header() {
    return (
        <header className="border-b bg-white py-4">
            <div className="container mx-auto max-w-6xl px-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-900 text-white">
                    {/* Placeholder Logo */}
                    <FileText className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">E-Certificate Generator</h1>
                    <p className="text-xs text-slate-500">Create and customize professional certificates</p>
                </div>
            </div>
        </header>
    );
}
