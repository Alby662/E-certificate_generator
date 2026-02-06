import { ExternalLink } from "lucide-react";

export function Footer() {
    return (
        <footer className="mt-auto border-t bg-white py-6">
            <div className="container mx-auto flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-900 text-white">
                        {/* Placeholder Logo for Yukti Yantra */}
                        <span className="font-bold text-xs">YY</span>
                    </div>
                    <span className="font-medium text-slate-700">Developed by Yukti Yantra</span>
                </div>
                <p className="text-xs text-slate-400">
                    © 2025 <span className="text-blue-600 font-medium">Yukti Yantra</span>. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
