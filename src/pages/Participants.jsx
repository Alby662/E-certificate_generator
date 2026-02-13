import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParticipantForm } from "@/components/participants/ParticipantForm";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Pencil, Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Participants() {
    const { token } = useAuth();
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Participants
    const fetchParticipants = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams({
                page,
                limit: 10,
                ...(search && { search })
            });

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/participants?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setParticipants(data.data);
                setTotalPages(data.pagination.pages);
                setTotalCount(data.pagination.total);
            } else {
                toast.error("Failed to load participants");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Error loading participants");
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset to page 1 on search
            fetchParticipants();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Page change
    useEffect(() => {
        fetchParticipants();
    }, [page]);

    // Handlers
    const handleAdd = async (formData) => {
        try {
            setIsSubmitting(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/participants`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Participant added successfully");
                setIsAddOpen(false);
                fetchParticipants();
            } else {
                toast.error(data.message || "Failed to add participant");
            }
        } catch (error) {
            toast.error("Error adding participant");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (formData) => {
        try {
            setIsSubmitting(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/participants/${editingParticipant.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Participant updated successfully");
                setEditingParticipant(null);
                fetchParticipants();
            } else {
                toast.error(data.message || "Failed to update participant");
            }
        } catch (error) {
            toast.error("Error updating participant");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this participant? This action cannot be undone.")) {
            return;
        }

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/participants/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Participant deleted");
                fetchParticipants();
            } else {
                toast.error(data.message || "Failed to delete");
            }
        } catch (error) {
            toast.error("Error deleting participant");
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header />

            <main className="flex-1 container mx-auto max-w-6xl px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Participants</h2>
                        <p className="text-slate-500 mt-1">Manage your central database of certificate recipients.</p>
                    </div>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Participant
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Add New Participant</DialogTitle>
                                <DialogDescription>
                                    Add a participant manually. They can be reused across multiple projects.
                                </DialogDescription>
                            </DialogHeader>
                            <ParticipantForm
                                onSubmit={handleAdd}
                                onCancel={() => setIsAddOpen(false)}
                                isLoading={isSubmitting}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle>All Participants ({totalCount})</CardTitle>
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Search by name or email..."
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Organization</TableHead>
                                        <TableHead>Events</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <div className="flex items-center justify-center gap-2 text-slate-500">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Loading...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : participants.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                                No participants found. Add one to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        participants.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell>{p.email}</TableCell>
                                                <TableCell>{p.organization || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {p._count?.participations || 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditingParticipant(p)}
                                                            aria-label="Edit participant"
                                                        >
                                                            <Pencil className="w-4 h-4 text-slate-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(p.id)}
                                                            aria-label="Delete participant"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-4 flex justify-center">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>

                                        <PaginationItem>
                                            <span className="px-4 text-sm text-slate-500">
                                                Page {page} of {totalPages}
                                            </span>
                                        </PaginationItem>

                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            <Footer />

            {/* Edit Modal */}
            <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Participant</DialogTitle>
                        <DialogDescription>
                            Update participant details. Changes will reflect in future certificates.
                        </DialogDescription>
                    </DialogHeader>
                    {editingParticipant && (
                        <ParticipantForm
                            initialData={editingParticipant}
                            onSubmit={handleEdit}
                            onCancel={() => setEditingParticipant(null)}
                            isLoading={isSubmitting}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
