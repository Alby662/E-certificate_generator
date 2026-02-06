import { useState, useEffect } from "react"

export default function TemplateUploader() {
    const [file, setFile] = useState(null)
    const [name, setName] = useState("")
    const [uploading, setUploading] = useState(false)
    const [templates, setTemplates] = useState([])

    useEffect(() => {
        // Mock fetch templates
        setTemplates([
            { _id: "temp1", name: "Mock Template 1", fileUrl: "https://placehold.co/600x400" }
        ])
    }, [])

    async function onUpload() {
        if (!file || !name) return
        setUploading(true)
        try {
            // Mock upload
            console.log("Mocking upload", file, name)
            await new Promise(resolve => setTimeout(resolve, 1000))

            const newTemplate = {
                _id: crypto.randomUUID(),
                name,
                fileUrl: "https://placehold.co/600x400?text=" + encodeURIComponent(name)
            }
            setTemplates(prev => [...prev, newTemplate])

            setFile(null)
            setName("")
        } catch (e) {
            alert(e.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <section className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold text-pretty">Upload Certificate Template</h2>
            <div className="mt-3 flex flex-col gap-3">
                <label className="block">
                    <span className="sr-only">Template name</span>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Template name (e.g., Event 2025)"
                        className="w-full rounded-md border px-3 py-2 bg-background text-foreground"
                    />
                </label>
                <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full"
                    aria-label="Select template file"
                />
                <button
                    onClick={onUpload}
                    disabled={!file || !name || uploading}
                    className="self-start rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                >
                    {uploading ? "Uploading..." : "Upload Template"}
                </button>
            </div>

            <div className="mt-6">
                <h3 className="font-medium">Saved Templates</h3>
                <ul className="mt-2 grid gap-2">
                    {(templates || []).map((t) => (
                        <li key={t._id} className="flex items-center justify-between rounded-md border p-2">
                            <div className="truncate">
                                <div className="font-medium">{t.name}</div>
                                <div className="text-sm opacity-70">{t.fileUrl}</div>
                            </div>
                            <a href={`/certificates/${t._id}`} className="rounded-md border px-3 py-1 text-sm">
                                Edit
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
