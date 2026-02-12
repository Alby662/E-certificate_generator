import { FileText, LogOut, User, Users, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

export function Header() {
    const { user, logout, isAuthenticated } = useAuth();
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <header className="border-b bg-white py-4 shadow-sm sticky top-0 z-50">
            <div className="container mx-auto max-w-6xl px-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-900 text-white">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">E-Certificate</h1>
                            <p className="text-xs text-slate-500 font-medium">Generator</p>
                        </div>
                    </Link>

                    {/* Navigation */}
                    {isAuthenticated && (
                        <nav className="hidden md:flex items-center gap-1">
                            <Link to="/">
                                <Button
                                    variant={isActive('/') ? "secondary" : "ghost"}
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    Dashboard
                                </Button>
                            </Link>
                            <Link to="/participants">
                                <Button
                                    variant={isActive('/participants') ? "secondary" : "ghost"}
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Users className="w-4 h-4" />
                                    Participants
                                </Button>
                            </Link>
                        </nav>
                    )}
                </div>

                {isAuthenticated && user && (
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-full border">
                            <User className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-700 font-medium">{user.email}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={logout}
                            aria-label="Logout"
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </div>
                )}
            </div>
        </header>
    );
}
