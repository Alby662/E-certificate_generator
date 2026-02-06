import { useMemo, useState } from "react"
import CertificatePreview from "./certificate-preview"

export default function DataInput({ src, fields }) {
    const [tab, setTab] = useState("single")
    const [single, setSingle] = useState({})
    const [bulkRows, setBulkRows] = useState([])
    const [bulkUploading, setBulkUploading] = useState(false)

    const filenameSingle = useMemo(() => {
        const name = single["name"] || "certificate"
        return `${name}.png`
    }, [single])

    async function onBulkUpload(file) {
        setBulkUploading(true)
        try {
            // Mock API call
            console.log("Mocking POST /api/parse", file)
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Mock rows
            const mockRows = [
                { name: "Alice", course: "React" },
                { name: "Bob", course: "Node" }
            ]
            setBulkRows(mockRows)
        } catch (e) {
            alert(e.message)
        } finally {
            setBulkUploading(false)
        }
    }

    async function onBulkZip() {
        // Mock zip download
        alert("Bulk ZIP generation is disabled (no backend).")
    }

    return (
        <section className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
                <button
                    className={`rounded-md px-3 py-1 ${tab === "single" ? "bg-primary text-primary-foreground" : "border"}`}
                    onClick={() => setTab("single")}
                >
                    Single Entry
                </button>
                <button
                    className={`rounded-md px-3 py-1 ${tab === "bulk" ? "bg-primary text-primary-foreground" : "border"}`}
                    onClick={() => setTab("bulk")}
                >
                    Bulk Upload
                </button>
            </div>

            {tab === "single" ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border p-3">
                        <h3 className="font-semibold">Details</h3>
                        <div className="mt-2 grid gap-2">
                            {fields.map((f) => (
                                <label key={f.key} className="block text-sm">
                                    <span className="opacity-70">{f.label || f.key}</span>
                                    <input
                                        value={single[f.key] || ""}
                                        onChange={(e) => setSingle((s) => ({ ...s, [f.key]: e.target.value }))}
                                        className="mt-1 w-full rounded-md border px-2 py-1 bg-background text-foreground"
                                        placeholder={`Enter ${f.label || f.key}`}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                    <CertificatePreview src={src} fields={fields} data={single} filename={filenameSingle} />
                </div>
            ) : (
                <div className="mt-4">
                    <div className="rounded-md border p-3">
                        <h3 className="font-semibold">Upload CSV/Excel</h3>
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={(e) => e.target.files?.[0] && onBulkUpload(e.target.files[0])}
                            className="mt-2"
                        />
                        <p className="mt-2 text-sm opacity-70">
                            We parse files on the server. Ensure headers match your field keys (e.g., name, event, date).
                        </p>
                    </div>

                    {bulkRows.length > 0 && (
                        <div className="mt-4 rounded-md border p-3">
                            <h4 className="font-medium">Parsed Rows: {bulkRows.length}</h4>
                            <div className="mt-2 grid gap-4 md:grid-cols-2">
                                <div className="max-h-64 overflow-auto rounded-md border p-2 text-sm">
                                    {bulkRows.slice(0, 50).map((r, idx) => (
                                        <div key={idx} className="border-b py-1 last:border-b-0">
                                            {JSON.stringify(r)}
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p className="text-sm opacity-70">Preview first row</p>
                                    <CertificatePreview
                                        src={src}
                                        fields={fields}
                                        data={bulkRows[0]}
                                        filename={`${bulkRows[0]?.name || "certificate"}.png`}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={onBulkZip}
                                disabled={bulkUploading || bulkRows.length === 0}
                                className="mt-3 rounded-md bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
                            >
                                {bulkUploading ? "Generating..." : "Bulk Download ZIP"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
