import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export function CertificatesList() {
    const [data, setData] = useState({ data: [] })
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = () => {
        setIsLoading(true)
        // Mock data
        setTimeout(() => {
            setData({
                data: [
                    {
                        _id: "1",
                        certificateId: "CERT-001",
                        recipientName: "John Doe",
                        courseName: "React Basics",
                        issueDate: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    }
                ]
            })
            setIsLoading(false)
        }, 500)
    }

    useEffect(() => {
        fetchData()

        const handleRefresh = () => fetchData()
        window.addEventListener("certificate-added", handleRefresh)
        return () => window.removeEventListener("certificate-added", handleRefresh)
    }, [])

    const onDelete = async (id) => {
        const ok = confirm("Delete this certificate?")
        if (!ok) return
        console.log("Mock delete", id)
        // Mock delete
        setData(prev => ({ data: prev.data.filter(c => c._id !== id) }))
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-pretty">Certificates</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div>Loading...</div>
                ) : data?.data?.length ? (
                    <ScrollArea className="h-80">
                        <ul className="grid gap-3">
                            {data.data.map((c) => (
                                <li key={c._id} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-pretty">
                                            {c.recipientName} — {c.courseName}
                                        </p>
                                        <p className="text-sm text-muted-foreground text-pretty">
                                            ID: {c.certificateId} • {new Date(c.issueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="secondary" asChild>
                                            <a href={`/certificates/${c._id}`} aria-label="View certificate">
                                                View
                                            </a>
                                        </Button>
                                        <Button variant="destructive" onClick={() => onDelete(c._id)} aria-label="Delete certificate">
                                            Delete
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                ) : (
                    <div>No certificates yet.</div>
                )}
            </CardContent>
        </Card>
    )
}
