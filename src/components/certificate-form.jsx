import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CertificateCanvas } from "./certificate-canvas"

export function CertificateForm() {
    const { toast } = useToast()
    const [recipientName, setRecipientName] = useState("")
    const [courseName, setCourseName] = useState("")
    const [issuerName, setIssuerName] = useState("E-Certificate Generator")
    const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [notes, setNotes] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const isoIssueDate = useMemo(() => {
        try {
            return new Date(issueDate).toISOString()
        } catch {
            return new Date().toISOString()
        }
    }, [issueDate])

    const onSubmit = async (e) => {
        e.preventDefault()
        if (!recipientName || !courseName || !issueDate) {
            toast({ title: "Missing fields", description: "Please fill recipient, course and issue date." })
            return
        }
        setSubmitting(true)
        try {
            // Mock API call
            console.log("Mocking POST /api/certificates", { recipientName, courseName, issuerName, issueDate, notes })
            await new Promise(resolve => setTimeout(resolve, 1000))

            toast({ title: "Certificate created", description: "Saved to database (Mock)." })
            // Refresh list (mock)
            // mutate("/api/certificates") 
            window.dispatchEvent(new Event("certificate-added")) // Simple event for mock refresh
        } catch (err) {
            toast({ title: "Error", description: err.message })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-pretty">Create Certificate</CardTitle>
                    <CardDescription>Generate and save a new certificate.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="recipient">Recipient Name</Label>
                            <Input
                                id="recipient"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder="Jane Doe"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="course">Course Name</Label>
                            <Input
                                id="course"
                                value={courseName}
                                onChange={(e) => setCourseName(e.target.value)}
                                placeholder="Advanced React"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="issuer">Issuer</Label>
                            <Input
                                id="issuer"
                                value={issuerName}
                                onChange={(e) => setIssuerName(e.target.value)}
                                placeholder="E-Certificate Generator"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date">Issue Date</Label>
                            <Input id="date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes (optional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any extra notes..."
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={submitting} aria-label="Save certificate">
                                {submitting ? "Saving..." : "Save to Database"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-pretty">Live Preview</CardTitle>
                    <CardDescription>Download as PNG after confirming.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CertificateCanvas
                        recipientName={recipientName || "Recipient Name"}
                        courseName={courseName || "Course Name"}
                        issuerName={issuerName || "E-Certificate Generator"}
                        issueDate={isoIssueDate}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
