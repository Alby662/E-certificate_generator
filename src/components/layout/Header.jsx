import { FileText, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function Header() {
    const { user, logout, isAuthenticated } = useAuth();

    return (
        <header className="border-b bg-white py-4">
            <div className="container mx-auto max-w-6xl px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-900 text-white">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">E-Certificate Generator</h1>
                        <p className="text-xs text-slate-500">Create and customize professional certificates</p>
                    </div>
                </div>

                {isAuthenticated && user && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-700">{user.email}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={logout}
                            className="flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </Button>
                    </div>
                )}
            </div>
        </header>
    );
}
