import { useEffect, useRef, useState } from "react"

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

export default function FieldEditorCanvas({ src, initialFields = [], onChange }) {
    const canvasRef = useRef(null)
    const [img, setImg] = useState(null)
    const [fields, setFields] = useState(Array.isArray(initialFields) ? initialFields : [])
    const [dragId, setDragId] = useState(null)
    const [offset, setOffset] = useState({ x: 0, y: 0 })

    useEffect(() => {
        loadImage(src).then(setImg).catch(console.error)
    }, [src])

    useEffect(() => {
        onChange(fields)
    }, [fields, onChange])

    const [hoverId, setHoverId] = useState(null)

    useEffect(() => {
        const c = canvasRef.current
        if (!c || !img) return
        const ctx = c.getContext("2d")
        if (!ctx) return
        const maxW = Math.min(1000, img.width)
        const scale = maxW / img.width
        c.width = img.width * scale
        c.height = img.height * scale

        // draw base
        ctx.clearRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0, c.width, c.height)

        // draw fields
        if (Array.isArray(fields)) {
            for (const f of fields) {
                const x = f.x * c.width
                const y = f.y * c.height
                const fontPx = Math.max(10, Math.floor(f.fontSize * c.width))
                ctx.font = `${f.fontWeight === "bold" ? "bold " : ""}${fontPx}px ${f.fontFamily || "sans-serif"}`
                ctx.textAlign = f.align
                ctx.textBaseline = "middle"

                // Measure text for box
                const metrics = ctx.measureText(f.label || f.key)
                const textWidth = metrics.width
                const textHeight = fontPx // Approx

                // Draw box background if hovered or dragged
                if (f.id === dragId || f.id === hoverId) {
                    ctx.fillStyle = "rgba(0, 123, 255, 0.2)"
                    let boxX = x
                    if (f.align === 'center') boxX = x - textWidth / 2
                    if (f.align === 'right') boxX = x - textWidth
                    ctx.fillRect(boxX - 5, y - textHeight / 2 - 5, textWidth + 10, textHeight + 10)

                    ctx.strokeStyle = "#007bff"
                    ctx.lineWidth = 2
                    ctx.strokeRect(boxX - 5, y - textHeight / 2 - 5, textWidth + 10, textHeight + 10)
                } else {
                    // Subtle border for visibility
                    ctx.strokeStyle = "rgba(0,0,0,0.2)"
                    ctx.lineWidth = 1
                    let boxX = x
                    if (f.align === 'center') boxX = x - textWidth / 2
                    if (f.align === 'right') boxX = x - textWidth
                    ctx.strokeRect(boxX - 5, y - textHeight / 2 - 5, textWidth + 10, textHeight + 10)
                }

                ctx.fillStyle = f.color || "#111111"
                ctx.fillText(f.label || f.key, x, y)
            }
        }
    }, [img, fields, dragId, hoverId])

    function addField() {
        const id = Math.random().toString(36).substring(2, 9)
        const f = {
            id,
            key: `field_${fields.length + 1}`,
            label: "Sample",
            x: 0.5,
            y: 0.5,
            fontSize: 0.04,
            color: "#111111",
            align: "center",
            fontWeight: "normal",
        }
        setFields((prev) => [...prev, f])
    }

    function getFieldAtPos(cx, cy) {
        const c = canvasRef.current
        if (!c || !img) return null
        const ctx = c.getContext("2d")

        for (const f of [...fields].reverse()) {
            const x = f.x * c.width
            const y = f.y * c.height
            const fontPx = Math.max(10, Math.floor(f.fontSize * c.width))
            ctx.font = `${f.fontWeight === "bold" ? "bold " : ""}${fontPx}px ${f.fontFamily || "sans-serif"}`
            const metrics = ctx.measureText(f.label || f.key)
            const textWidth = metrics.width
            const textHeight = fontPx

            let boxX = x
            if (f.align === 'center') boxX = x - textWidth / 2
            if (f.align === 'right') boxX = x - textWidth

            // Check collision with padding
            if (
                cx >= boxX - 10 &&
                cx <= boxX + textWidth + 10 &&
                cy >= y - textHeight / 2 - 10 &&
                cy <= y + textHeight / 2 + 10
            ) {
                return f
            }
        }
        return null
    }

    function onMouseDown(e) {
        const c = canvasRef.current
        if (!c || !img) return
        const rect = c.getBoundingClientRect()
        const scaleX = c.width / rect.width
        const scaleY = c.height / rect.height
        const cx = (e.clientX - rect.left) * scaleX
        const cy = (e.clientY - rect.top) * scaleY

        const f = getFieldAtPos(cx, cy)
        if (f) {
            setDragId(f.id)
            setOffset({ x: cx - f.x * c.width, y: cy - f.y * c.height })
        }
    }

    function onMouseMove(e) {
        const c = canvasRef.current
        if (!c) return
        const rect = c.getBoundingClientRect()
        const scaleX = c.width / rect.width
        const scaleY = c.height / rect.height
        const cx = (e.clientX - rect.left) * scaleX
        const cy = (e.clientY - rect.top) * scaleY

        if (dragId) {
            setFields((prev) =>
                prev.map((f) =>
                    f.id === dragId
                        ? {
                            ...f,
                            x: Math.min(1, Math.max(0, (cx - offset.x) / c.width)),
                            y: Math.min(1, Math.max(0, (cy - offset.y) / c.height)),
                        }
                        : f,
                ),
            )
            return
        }

        // Hover effect
        const f = getFieldAtPos(cx, cy)
        if (f) {
            setHoverId(f.id)
            c.style.cursor = "move"
        } else {
            setHoverId(null)
            c.style.cursor = "default"
        }
    }

    function onMouseUp() {
        setDragId(null)
    }

    function updateField(id, patch) {
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    }

    function removeField(id) {
        setFields((prev) => prev.filter((f) => f.id !== id))
    }

    return (
        <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-3">
                <canvas
                    ref={canvasRef}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    className="w-full rounded-md border shadow-sm touch-none"
                    aria-label="Template field editor canvas"
                />
                <div className="mt-3">
                    <button onClick={addField} className="rounded-md bg-primary px-3 py-1 text-primary-foreground">
                        Add Field
                    </button>
                </div>
            </div>
            <div className="md:col-span-2 flex flex-col gap-3">
                {fields.map((f) => (
                    <div key={f.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                            <strong>{f.key}</strong>
                            <button onClick={() => removeField(f.id)} className="text-sm underline">
                                Remove
                            </button>
                        </div>
                        <label className="mt-2 block text-sm">
                            <span className="sr-only">Key</span>
                            <input
                                value={f.key}
                                onChange={(e) => updateField(f.id, { key: e.target.value })}
                                className="mt-1 w-full rounded-md border px-2 py-1 bg-background text-foreground"
                                placeholder="Key (e.g., name)"
                            />
                        </label>
                        <label className="mt-2 block text-sm">
                            <span className="sr-only">Label</span>
                            <input
                                value={f.label}
                                onChange={(e) => updateField(f.id, { label: e.target.value })}
                                className="mt-1 w-full rounded-md border px-2 py-1 bg-background text-foreground"
                                placeholder="Preview label"
                            />
                        </label>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                            <label className="text-sm">
                                Size
                                <input
                                    type="number"
                                    step="0.005"
                                    min={0.01}
                                    value={f.fontSize}
                                    onChange={(e) => updateField(f.id, { fontSize: Number(e.target.value) })}
                                    className="mt-1 w-full rounded-md border px-2 py-1 bg-background text-foreground"
                                />
                            </label>
                            <label className="text-sm">
                                Align
                                <select
                                    value={f.align}
                                    onChange={(e) => updateField(f.id, { align: e.target.value })}
                                    className="mt-1 w-full rounded-md border px-2 py-1 bg-background text-foreground"
                                >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </label>
                            <label className="text-sm">
                                Color
                                <input
                                    type="color"
                                    value={f.color}
                                    onChange={(e) => updateField(f.id, { color: e.target.value })}
                                    className="mt-1 h-9 w-full rounded-md border bg-background"
                                />
                            </label>
                        </div>
                        {/* VERTICAL OFFSET (NUDGE) CONTROL */}
                        <div className="mt-3">
                            <label className="text-sm font-medium">
                                Vertical Offset (Fine-tune)
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateField(f.id, { vOffset: (f.vOffset || 0) - 1 })}
                                    className="px-3 py-1 border rounded bg-background hover:bg-muted"
                                    title="Move up 1px"
                                >
                                    ↑
                                </button>
                                <span className="text-sm font-mono min-w-[50px] text-center">
                                    {f.vOffset || 0}px
                                </span>
                                <button
                                    type="button"
                                    onClick={() => updateField(f.id, { vOffset: (f.vOffset || 0) + 1 })}
                                    className="px-3 py-1 border rounded bg-background hover:bg-muted"
                                    title="Move down 1px"
                                >
                                    ↓
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Fine-tune vertical position for perfect alignment
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
