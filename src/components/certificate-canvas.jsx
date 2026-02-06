import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

function formatDate(iso) {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
        })
    } catch {
        return iso
    }
}

export function CertificateCanvas({
    recipientName,
    courseName,
    issuerName = "E-Certificate Generator",
    issueDate,
    certificateId,
    className,
}) {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const W = 1200
        const H = 800
        canvas.width = W
        canvas.height = H

        // Background
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-card").trim() || "#ffffff"
        ctx.fillRect(0, 0, W, H)

        // Border
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#111111"
        ctx.lineWidth = 8
        ctx.strokeRect(24, 24, W - 48, H - 48)

        // Heading
        ctx.fillStyle =
            getComputedStyle(document.documentElement).getPropertyValue("--color-foreground").trim() || "#111111"
        ctx.textAlign = "center"
        ctx.textBaseline = "top"

        ctx.font = "bold 48px var(--font-sans, system-ui)"
        ctx.fillText("Certificate of Completion", W / 2, 120)

        // Recipient
        ctx.font = "bold 64px var(--font-sans, system-ui)"
        ctx.fillText(recipientName || "Recipient Name", W / 2, 220)

        // Copy
        ctx.font = "normal 28px var(--font-sans, system-ui)"
        ctx.fillText("has successfully completed", W / 2, 310)

        ctx.font = "bold 40px var(--font-sans, system-ui)"
        ctx.fillText(courseName || "Course Name", W / 2, 360)

        // Footer info
        ctx.textAlign = "left"
        ctx.font = "normal 22px var(--font-sans, system-ui)"
        ctx.fillText(`Issued by: ${issuerName}`, 80, H - 180)
        ctx.fillText(`Issue date: ${formatDate(issueDate)}`, 80, H - 140)
        if (certificateId) {
            ctx.fillText(`Certificate ID: ${certificateId}`, 80, H - 100)
        }

        // Signature line
        ctx.beginPath()
        ctx.moveTo(W - 380, H - 160)
        ctx.lineTo(W - 80, H - 160)
        ctx.stroke()
        ctx.textAlign = "right"
        ctx.font = "normal 22px var(--font-sans, system-ui)"
        ctx.fillText("Authorized Signature", W - 80, H - 140)
    }, [recipientName, courseName, issuerName, issueDate, certificateId])

    const download = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const dataUrl = canvas.toDataURL("image/png")
        const a = document.createElement("a")
        a.href = dataUrl
        a.download = `certificate-${certificateId || "preview"}.png`
        a.click()
    }

    return (
        <div className={className}>
            <canvas ref={canvasRef} aria-label="Certificate preview" className="w-full rounded-lg border bg-card" />
            <div className="mt-3 flex justify-end">
                <Button variant="default" onClick={download} aria-label="Download certificate image">
                    Download PNG
                </Button>
            </div>
        </div>
    )
}
