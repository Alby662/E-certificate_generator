import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import FieldEditorCanvas from "@/components/field-editor-canvas"
import DataInput from "@/components/data-input"

export default function CertificateView() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [fields, setFields] = useState([])

    useEffect(() => {
        console.warn("Backend API is not available in Vite migration.")
        // Mock data for UI demonstration
        setData({
            name: "Mock Certificate",
            fileUrl: "https://placehold.co/600x400?text=Certificate+Template",
            fields: []
        })
    }, [id])

    async function save() {
        console.warn("Save functionality disabled (no backend).")
    }

    async function removeTemplate() {
        if (!confirm("Delete this template?")) return
        console.warn("Delete functionality disabled (no backend).")
        navigate("/")
    }

    if (!data) return <div className="p-6">Loading... (Backend API unavailable)</div>

    return (
        <main className="container mx-auto max-w-6xl p-4">
            <header className="mb-4 flex items-center justify-between">
                <h1 className="text-balance text-2xl font-semibold">{data.name}</h1>
                <div className="flex gap-2">
                    <button onClick={save} className="rounded-md bg-primary px-3 py-1 text-primary-foreground">
                        Save Fields
                    </button>
                    <button onClick={removeTemplate} className="rounded-md border px-3 py-1">
                        Delete
                    </button>
                </div>
            </header>

            <FieldEditorCanvas src={data.fileUrl} initialFields={fields} onChange={setFields} />

            <div className="mt-6">
                <DataInput src={data.fileUrl} fields={fields} />
            </div>
        </main>
    )
}
