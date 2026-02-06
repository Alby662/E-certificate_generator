export type Certificate = {
  _id?: string
  certificateId: string
  recipientName: string
  courseName: string
  issuerName?: string
  issueDate: string // ISO string
  notes?: string
  createdAt: string // ISO string
  updatedAt: string // ISO string
}

export type TemplateField = {
  id: string
  key: string
  label?: string
  x: number // 0..1 relative to width
  y: number // 0..1 relative to height
  fontSize: number // relative to width (e.g., 0.04)
  color?: string
  align: "left" | "center" | "right"
  fontWeight?: "normal" | "bold"
  fontFamily?: string
}

export type TemplateDoc = {
  _id?: string
  name: string
  fileUrl: string
  fileType: "image" | "pdf"
  width?: number
  height?: number
  fields: TemplateField[]
  createdAt: string
  updatedAt: string
}
