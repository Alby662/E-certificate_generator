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

export default function CertificatePreview({ src, fields, data, filename }) {
    const canvasRef = useRef(null)
    const [dataUrl, setDataUrl] = useState(null)

    useEffect(() => {
        let mounted = true
        async function draw() {
            const c = canvasRef.current
            if (!c) return
            const ctx = c.getContext("2d")
            if (!ctx) return
            try {
                const img = await loadImage(src)
                const maxW = Math.min(1400, img.width)
                const scale = maxW / img.width
                c.width = img.width * scale
                c.height = img.height * scale

                ctx.clearRect(0, 0, c.width, c.height)
                ctx.drawImage(img, 0, 0, c.width, c.height)

                for (const f of fields) {
                    const x = f.x * c.width
                    const y = f.y * c.height
                    const fontPx = Math.max(10, Math.floor(f.fontSize * c.width))
                    ctx.font = `${f.fontWeight === "bold" ? "bold " : ""}${fontPx}px ${f.fontFamily || "sans-serif"}`
                    ctx.fillStyle = f.color || "#111111"
                    ctx.textAlign = f.align
                    ctx.textBaseline = "middle"
                    const text = data[f.key] || ""
                    ctx.fillText(text, x, y)
                }
                if (!mounted) return
                setDataUrl(c.toDataURL("image/png"))
            } catch (e) {
                console.error("Failed to load image", e)
            }
        }
        draw()
        return () => {
            mounted = false
        }
    }, [src, fields, data])

    function download() {
        const a = document.createElement("a")
        a.href = dataUrl || ""
        a.download = filename || "certificate.png"
        a.click()
    }

    return (
        <div className="rounded-lg border p-3">
            <h3 className="font-semibold text-pretty">Preview</h3>
            <canvas ref={canvasRef} className="mt-2 w-full rounded-md border" />
            <div className="mt-3 flex items-center gap-2">
                <button
                    onClick={download}
                    disabled={!dataUrl}
                    className="rounded-md bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
                >
                    Download PNG
                </button>
            </div>
        </div>
    )
}
