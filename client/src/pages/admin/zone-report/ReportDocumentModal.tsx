import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useEffect, useState } from 'react'
import '../../../style/zone_report.css'

interface GeographicTypeItem {
  id: number
  name: string
}

interface ReportDetailItem {
  mechanism_of_injury?: string | null
  nature_of_illness?: string | null
  type_of_emergency?: string | null
  type_of_hazard?: string | null
  nature_of_call?: string | null
  incident_date?: string | null
  incident_time?: string | null
  dispatcher_name?: string | null
}

interface ClientAssessmentItem {
  chief_complaint?: string | null
  airway?: string | null
  breathing?: string | null
  circulation_support?: string | null
  wound_care?: string | null
  miscellaneous?: string | null
  history_of_coronary_disease?: string | null
  collapse_witness?: string | null
  time_of_collapse?: string | null
  start_of_cpr?: string | null
  defibrillation_time?: string | null
  cpr_duration?: number | null
  rosc?: string | null
  transferred_to_hospital?: string | null
}

interface ReportClientItem {
  id: number
  full_name: string
  age: number | null
  gender: string | null
  nationality?: string | null
  contact_number?: string | null
  permanent_address?: string | null
  incident_address?: string | null
  assessment?: ClientAssessmentItem | null
}

interface ReportResponderItem {
  id: number
  name: string | null
}

interface ReportPhotoItem {
  id: number
  photo_path: string
}

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '/api'

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')
const encodePathSegments = (value: string) => value.split('/').map(segment => encodeURIComponent(segment)).join('/')

export interface ReportDocumentData {
  id: number
  report_type: 'Emergency' | 'Incident'
  status?: string | null
  date_reported: string
  time_reported: string
  created_at?: string | null
  geographicType?: GeographicTypeItem | null
  geographic_type?: GeographicTypeItem | null
  clients?: ReportClientItem[]
  emergencyDetails?: ReportDetailItem | null
  emergency_details?: ReportDetailItem | null
  incidentDetails?: ReportDetailItem | null
  incident_details?: ReportDetailItem | null
  responders?: ReportResponderItem[]
  photos?: ReportPhotoItem[]
}

interface ReportDocumentModalProps {
  report: ReportDocumentData | null
  isLoading: boolean
  onClose: () => void
}

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString()
}

const formatTime = (value?: string | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(`1970-01-01T${value}`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const textOrNA = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return 'N/A'
  return String(value)
}

const resolvePhotoUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Prevent mixed-content blocking for legacy http URLs saved before HTTPS was enabled.
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && path.startsWith('http://')) {
      return `https://${path.slice('http://'.length)}`
    }
    return path
  }

  if (path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  const storageRelative = path.replace(/^\/?storage\//, '')
  if (storageRelative !== path) {
    return `${API_BASE_URL}/files/public/${encodePathSegments(storageRelative)}`
  }

  // Legacy records may store bare relative paths like "reports/8/file.jpg".
  // Treat them as public disk paths instead of website-root paths.
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/files/public/${encodePathSegments(path)}`
  }

  if (path.startsWith('/')) {
    return `${SERVER_BASE_URL}${path}`
  }
  return `${SERVER_BASE_URL}/${path}`
}

const slugifyFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatDateForFile = (value?: string | null) => {
  if (!value) return 'unknown-date'
  const datePart = value.includes('T') ? value.slice(0, 10) : value
  const parsed = new Date(datePart)
  if (Number.isNaN(parsed.getTime())) {
    return slugifyFileName(datePart)
  }
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
        return
      }
      reject(new Error('Unable to read image data.'))
    }
    reader.onerror = () => reject(new Error('Unable to read image file.'))
    reader.readAsDataURL(blob)
  })

const loadPhotoForPdf = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.status}`)
  }

  const blob = await response.blob()
  const dataUrl = await blobToDataUrl(blob)
  const format = blob.type.toLowerCase().includes('png') ? 'PNG' : 'JPEG'
  return { dataUrl, format }
}

export function ReportDocumentModal({ report, isLoading, onClose }: ReportDocumentModalProps) {
  const [docZoom, setDocZoom] = useState(1)
  const emergencyDetail = report?.emergencyDetails ?? report?.emergency_details
  const incidentDetail = report?.incidentDetails ?? report?.incident_details
  const detail = report?.report_type === 'Emergency' ? emergencyDetail : incidentDetail
  const geographicName = report?.geographicType?.name ?? report?.geographic_type?.name ?? 'N/A'
  const responders = (report?.responders ?? []).map(item => item.name).filter((name): name is string => Boolean(name))
  const photos = report?.photos ?? []
  const clients = report?.clients ?? []
  const primaryClient = clients[0]
  const primaryAssessment = clients[0]?.assessment

  const normalize = (value?: string | null) =>
    (value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()

  const hasSelection = (source: string | null | undefined, expected: string) => {
    const src = normalize(source)
    const exp = normalize(expected)
    return src.length > 0 && exp.length > 0 && src.includes(exp)
  }

  const splitValues = (source: string | null | undefined) => {
    if (!source) return [] as string[]
    return source
      .split(/[,/|;]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  const airwayOptions = [
    'Suction',
    'Manual Clearance',
    'Head Tilt Maneuver',
    'Jaw Thrust Maneuver',
  ]

  const breathingOptions = [
    'OPA',
    'NPA',
    'Pocket Mask',
    'Nasal Cannula',
    'Simple Facemask',
    'NRM',
    'BVM',
  ]

  const circulationOptions = ['CPR', 'AED']
  const woundCareOptions = ['Bleeding Control', 'Cleaning / Disinfecting', 'Dressing']
  const miscOptions = ['Cold Compress', 'Warm Compress', 'Shock Position']

  const customValues = (source: string | null | undefined, options: string[]) =>
    splitValues(source).filter((value) => !options.some((option) => hasSelection(value, option) || hasSelection(option, value)))

  const customAirway = customValues(primaryAssessment?.airway, airwayOptions)
  const customBreathing = customValues(primaryAssessment?.breathing, breathingOptions)
  const customCirculation = customValues(primaryAssessment?.circulation_support, circulationOptions)
  const customWoundCare = customValues(primaryAssessment?.wound_care, woundCareOptions)
  const customMisc = customValues(primaryAssessment?.miscellaneous, miscOptions)

  const primaryClientName = clients[0]?.full_name || 'unknown-client'
  const pdfFileName = `${slugifyFileName(primaryClientName)}-${slugifyFileName(geographicName)}-${formatDateForFile(
    report?.date_reported
  )}.pdf`

  useEffect(() => {
    setDocZoom(1)
  }, [report?.id])

  const adjustZoom = (delta: number) => {
    setDocZoom((prev) => {
      const next = prev + delta
      return Math.max(0.75, Math.min(1.5, Number(next.toFixed(2))))
    })
  }

  const handleDownloadReportPdf = async () => {
    if (!report) {
      return
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // Official institutional header
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(70, 92, 110)
    doc.text('Republic of the Philippines', pageWidth / 2, 20, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(17, 61, 90)
    doc.text('Province of Camarines Sur', pageWidth / 2, 36, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(70, 92, 110)
    doc.text('Local Government Unit of Nabua', pageWidth / 2, 50, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(16, 83, 121)
    doc.text('Municipal Disaster Risk Reduction & Management Office', pageWidth / 2, 66, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(90, 110, 125)
    doc.text('Emergency Hotline: (054) 288-10-23 | Smart: 0947-1819-217 | Globe: 0915-2062-265', pageWidth / 2, 78, {
      align: 'center',
    })
    doc.text('Email: mdrrmcnabua@yahoo.com / mdrrmonabua@gmail.com', pageWidth / 2, 89, { align: 'center' })
    doc.setDrawColor(210, 220, 228)
    doc.setLineWidth(1)
    doc.line(40, 98, pageWidth - 40, 98)

    // Compact report metadata row
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(92, 122, 141)
    doc.text(`Report ID: #${report.id}`, 40, 116)

    const typeText = textOrNA(report.report_type)
    const typeBadgeWidth = Math.max(74, doc.getTextWidth(typeText) + 24)
    const badgeY = 102
    const badgeH = 24
    const rightPadding = 40
    const typeX = pageWidth - rightPadding - typeBadgeWidth

    const isEmergencyType = report.report_type === 'Emergency'
    const typeFillColor: [number, number, number] = isEmergencyType ? [190, 37, 37] : [21, 128, 61]

    doc.setFillColor(typeFillColor[0], typeFillColor[1], typeFillColor[2])
    doc.roundedRect(typeX, badgeY, typeBadgeWidth, badgeH, 12, 12, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(typeText, typeX + typeBadgeWidth / 2, badgeY + 16, { align: 'center' })

    const sectionCellStyle = {
      fontStyle: 'bold' as const,
      halign: 'center' as const,
      fillColor: [220, 236, 245] as [number, number, number],
      textColor: [15, 51, 75] as [number, number, number],
    }

    type TableCell = string | { content: string; colSpan: number; styles?: typeof sectionCellStyle }
    const tableRows: TableCell[][] = [
      [{ content: 'PATIENT RECORD', colSpan: 6, styles: sectionCellStyle }],
      ['PATIENT NAME', textOrNA(primaryClient?.full_name), 'AGE', textOrNA(primaryClient?.age), 'GENDER', textOrNA(primaryClient?.gender)],
      ['NATIONALITY', textOrNA(primaryClient?.nationality), 'CONTACT NUMBER', { content: textOrNA(primaryClient?.contact_number), colSpan: 3 }],
      ['PERMANENT ADDRESS', { content: textOrNA(primaryClient?.permanent_address), colSpan: 5 }],
      ['LOCATION OF INCIDENT', { content: textOrNA(primaryClient?.incident_address), colSpan: 5 }],

      [{ content: 'REPORT RECORD', colSpan: 6, styles: sectionCellStyle }],
      ['REPORT DATE', formatDate(report.date_reported), 'REPORT TIME', formatTime(report.time_reported), 'DISPATCHER', textOrNA(detail?.dispatcher_name)],
      ['INCIDENT DATE', textOrNA(detail?.incident_date ? formatDate(detail.incident_date) : null), 'INCIDENT TIME', textOrNA(detail?.incident_time ? formatTime(detail.incident_time) : null), 'TYPE', report.report_type],

      [{ content: report.report_type === 'Emergency' ? 'INCIDENT DETAILS (EMERGENCY)' : 'INCIDENT DETAILS (INCIDENT)', colSpan: 6, styles: sectionCellStyle }],
      [
        report.report_type === 'Emergency' ? 'TYPE OF EMERGENCY' : 'TYPE OF HAZARD',
        textOrNA(report.report_type === 'Emergency' ? detail?.type_of_emergency : detail?.type_of_hazard),
        report.report_type === 'Emergency' ? 'NATURE OF ILLNESS' : 'NATURE OF CALL',
        { content: textOrNA(report.report_type === 'Emergency' ? detail?.nature_of_illness : detail?.nature_of_call), colSpan: 3 },
      ],
      ...(report.report_type === 'Emergency'
        ? [['MECHANISM OF INJURY', { content: textOrNA(detail?.mechanism_of_injury), colSpan: 5 }]]
        : []),
      ['RESPONDERS', { content: responders.length > 0 ? responders.join(', ') : 'N/A', colSpan: 5 }],
    ]

    if (report.report_type === 'Emergency') {
      tableRows.push(
        [{ content: 'ASSESSMENT & CARE RECORD', colSpan: 6, styles: sectionCellStyle }],
        ['CHIEF COMPLAINT', { content: textOrNA(primaryAssessment?.chief_complaint), colSpan: 5 }],
        ['AIRWAY', textOrNA(primaryAssessment?.airway), 'BREATHING', textOrNA(primaryAssessment?.breathing), 'CIRCULATION', textOrNA(primaryAssessment?.circulation_support)],
        ['WOUND CARE', textOrNA(primaryAssessment?.wound_care), 'CORONARY HISTORY', textOrNA(primaryAssessment?.history_of_coronary_disease), 'COLLAPSE WITNESS', textOrNA(primaryAssessment?.collapse_witness)],
        ['TIME OF COLLAPSE', textOrNA(primaryAssessment?.time_of_collapse ? formatTime(primaryAssessment.time_of_collapse) : null), 'START OF CPR', textOrNA(primaryAssessment?.start_of_cpr ? formatTime(primaryAssessment.start_of_cpr) : null), 'DEFIBRILLATION', textOrNA(primaryAssessment?.defibrillation_time ? formatTime(primaryAssessment.defibrillation_time) : null)],
        ['CPR DURATION', textOrNA(primaryAssessment?.cpr_duration), 'ROSC', textOrNA(primaryAssessment?.rosc), 'TRANSFERRED TO HOSPITAL', textOrNA(primaryAssessment?.transferred_to_hospital)],
      )
    }

    autoTable(doc, {
      startY: 138,
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 5,
        lineColor: [47, 60, 70],
        lineWidth: 0.6,
        textColor: [16, 40, 58],
      },
      columnStyles: {
        0: { cellWidth: 88, fontStyle: 'bold' },
        1: { cellWidth: 88 },
        2: { cellWidth: 88, fontStyle: 'bold' },
        3: { cellWidth: 88 },
        4: { cellWidth: 88, fontStyle: 'bold' },
        5: { cellWidth: 88 },
      },
    })

    // Page 2: care management + photo attachment
    doc.addPage()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(24, 56, 79)
    doc.text('CARE MANAGEMENT (ORIGINAL FORM STYLE)', 40, 42)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(72, 96, 114)
    doc.text(`Report ID: #${report.id} | Type: ${report.report_type}`, 40, 58)

    let photoStartY = 70

    if (report.report_type === 'Emergency') {
      const makeOptionItems = (options: string[], source: string | null | undefined, custom: string[]) => [
        ...options.map((label) => ({ label, checked: hasSelection(source, label) })),
        ...custom.map((label) => ({ label, checked: true })),
      ]

      const leftGroups = [
        { title: 'AIRWAY', items: makeOptionItems(airwayOptions, primaryAssessment?.airway, customAirway) },
        { title: 'BREATHING', items: makeOptionItems(breathingOptions, primaryAssessment?.breathing, customBreathing) },
        { title: 'CIRCULATION SUPPORT', items: makeOptionItems(circulationOptions, primaryAssessment?.circulation_support, customCirculation) },
      ]

      const middleGroups = [
        { title: 'WOUND CARE', items: makeOptionItems(woundCareOptions, primaryAssessment?.wound_care, customWoundCare) },
        { title: 'MISCELLANEOUS', items: makeOptionItems(miscOptions, primaryAssessment?.miscellaneous, customMisc) },
      ]

      const rightRows = [
        ['History of Coronary Disease', textOrNA(primaryAssessment?.history_of_coronary_disease)],
        ['Collapse Witness', textOrNA(primaryAssessment?.collapse_witness)],
        ['Time of Collapse', textOrNA(primaryAssessment?.time_of_collapse ? formatTime(primaryAssessment.time_of_collapse) : null)],
        ['Start of CPR', textOrNA(primaryAssessment?.start_of_cpr ? formatTime(primaryAssessment.start_of_cpr) : null)],
        ['Defibrillation', textOrNA(primaryAssessment?.defibrillation_time ? formatTime(primaryAssessment.defibrillation_time) : null)],
        ['Duration of CPR', textOrNA(primaryAssessment?.cpr_duration)],
        ['ROSC', textOrNA(primaryAssessment?.rosc)],
        ['Transferred to Hospital', textOrNA(primaryAssessment?.transferred_to_hospital)],
      ]

      const countGroupLines = (groups: Array<{ title: string; items: Array<{ label: string; checked: boolean }> }>) =>
        groups.reduce((count, group, idx) => count + 1 + group.items.length + (idx < groups.length - 1 ? 1 : 0), 0)

      const leftLineCount = countGroupLines(leftGroups)
      const middleLineCount = countGroupLines(middleGroups)
      const rightLineCount = 1 + rightRows.length
      const maxLineCount = Math.max(leftLineCount, middleLineCount, rightLineCount)

      const panelX = 40
      const panelY = 70
      const panelWidth = pageWidth - 80
      const columnWidth = panelWidth / 3
      const lineHeight = 11
      const panelHeight = 12 + (maxLineCount * lineHeight) + 10

      doc.setDrawColor(47, 60, 70)
      doc.setLineWidth(0.6)
      doc.rect(panelX, panelY, panelWidth, panelHeight)
      doc.line(panelX + columnWidth, panelY, panelX + columnWidth, panelY + panelHeight)
      doc.line(panelX + columnWidth * 2, panelY, panelX + columnWidth * 2, panelY + panelHeight)

      const drawCheck = (x: number, y: number, checked: boolean) => {
        doc.rect(x, y, 7, 7)
        if (checked) {
          doc.setLineWidth(0.8)
          doc.line(x + 1.5, y + 3.5, x + 3.2, y + 5.5)
          doc.line(x + 3.2, y + 5.5, x + 5.8, y + 1.6)
          doc.setLineWidth(0.6)
        }
      }

      const drawOptionColumn = (
        startX: number,
        groups: Array<{ title: string; items: Array<{ label: string; checked: boolean }> }>
      ) => {
        let y = panelY + 12
        groups.forEach((group, groupIndex) => {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8.8)
          doc.setTextColor(11, 48, 75)
          doc.text(group.title, startX + 8, y)
          y += lineHeight

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.6)
          doc.setTextColor(16, 40, 58)
          group.items.forEach((item) => {
            drawCheck(startX + 8, y - 6.5, item.checked)
            doc.text(item.label, startX + 19, y)
            y += lineHeight
          })

          if (groupIndex < groups.length - 1) {
            y += 2
          }
        })
      }

      const drawRightColumn = (startX: number) => {
        let y = panelY + 12
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.8)
        doc.setTextColor(11, 48, 75)
        doc.text('CESSATION OF RESUSCITATION', startX + 6, y)
        y += lineHeight

        rightRows.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8.3)
          doc.setTextColor(16, 40, 58)
          doc.text(`${label}:`, startX + 6, y)
          doc.setFont('helvetica', 'bold')
          doc.text(value, startX + columnWidth - 8, y, { align: 'right' })

          doc.setDrawColor(188, 205, 216)
          doc.line(startX + 6, y + 3.5, startX + columnWidth - 6, y + 3.5)
          y += lineHeight
        })
      }

      drawOptionColumn(panelX, leftGroups)
      drawOptionColumn(panelX + columnWidth, middleGroups)
      drawRightColumn(panelX + columnWidth * 2)

      photoStartY = panelY + panelHeight + 14
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(24, 56, 79)
    doc.text('Photo Attachment', 40, photoStartY)
    doc.setDrawColor(210, 220, 228)
    doc.setLineWidth(1)
    doc.line(40, photoStartY + 8, pageWidth - 40, photoStartY + 8)

    if (photos.length < 1) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(86, 108, 124)
      doc.text('No photos attached.', 40, photoStartY + 24)
    } else {
      const pageHeight = doc.internal.pageSize.getHeight()
      const leftX = 40
      const rightMargin = 40
      const columnGap = 14
      const availableWidth = pageWidth - leftX - rightMargin
      const columnWidth = (availableWidth - columnGap) / 2
      const cardHeight = 150
      const topLabelGap = 12
      const imagePadding = 6
      const nextRowGap = 24
      let y = photoStartY + 18

      for (let i = 0; i < photos.length; i += 1) {
        const col = i % 2

        if (col === 0 && i > 0) {
          y += cardHeight + nextRowGap
        }

        if (y + cardHeight > pageHeight - 28) {
          doc.addPage()
          y = 40
        }

        const x = leftX + (col * (columnWidth + columnGap))
        const photo = photos[i]
        const photoUrl = resolvePhotoUrl(photo.photo_path)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(24, 56, 79)
        doc.text(`Photo ${i + 1}`, x, y - 2)

        doc.setDrawColor(188, 205, 216)
        doc.setLineWidth(0.8)
        doc.roundedRect(x, y + topLabelGap, columnWidth, cardHeight - topLabelGap, 6, 6)

        try {
          const loaded = await loadPhotoForPdf(photoUrl)
          doc.addImage(
            loaded.dataUrl,
            loaded.format,
            x + imagePadding,
            y + topLabelGap + imagePadding,
            columnWidth - (imagePadding * 2),
            cardHeight - topLabelGap - (imagePadding * 2),
            undefined,
            'FAST'
          )
        } catch {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          doc.setTextColor(110, 120, 130)
          doc.text('Unable to load image.', x + 8, y + topLabelGap + 18)
          doc.setTextColor(90, 110, 125)
          doc.text(photoUrl, x + 8, y + topLabelGap + 32, { maxWidth: columnWidth - 16 })
        }
      }
    }

    doc.save(pdfFileName)
  }

  return (
    <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
      <div className="zr-doc-modal">
        <div className="zr-doc-modal-header">
          <div>
            <h5 className="mb-0">Report View</h5>
            <small>Complete report details in document layout</small>
          </div>
          <div className="zr-doc-actions">
            <div className="zr-doc-zoom-controls" aria-label="Document zoom controls">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary zr-doc-zoom-btn"
                onClick={() => adjustZoom(-0.1)}
                disabled={isLoading}
                aria-label="Zoom out"
                title="Zoom out"
              >
                <i className="bi bi-zoom-out"></i>
              </button>
              <span className="zr-doc-zoom-label">{Math.round(docZoom * 100)}%</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary zr-doc-zoom-btn"
                onClick={() => adjustZoom(0.1)}
                disabled={isLoading}
                aria-label="Zoom in"
                title="Zoom in"
              >
                <i className="bi bi-zoom-in"></i>
              </button>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={handleDownloadReportPdf}
              disabled={!report || isLoading}
            >
              <i className="bi bi-file-earmark-pdf me-1"></i>
              Download PDF
            </button>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
        </div>

        <div className="zr-doc-modal-body">
          <div
            className="zr-doc-zoom-surface"
            style={{
              transform: `scale(${docZoom})`,
              transformOrigin: 'top left',
              width: `${100 / docZoom}%`,
            }}
          >
          <article className="zr-report-paper zr-report-page">
            {isLoading ? (
              <p className="zr-doc-loading mb-0">Loading report details...</p>
            ) : !report ? (
              <p className="zr-doc-loading mb-0">Unable to load report details.</p>
            ) : (
              <>
                <section className="zr-paper-official-header" aria-label="Official Header">
                  <p className="mb-0">Republic of the Philippines</p>
                  <p className="mb-0 zr-paper-official-strong">Province of Camarines Sur</p>
                  <p className="mb-0">Local Government Unit of Nabua</p>
                  <p className="mb-0 zr-paper-official-office">Municipal Disaster Risk Reduction &amp; Management Office</p>
                  <p className="mb-0 zr-paper-official-meta">Emergency Hotline: (054) 288-10-23 | Smart: 0947-1819-217 | Globe: 0915-2062-265</p>
                  <p className="mb-0 zr-paper-official-meta">Email: mdrrmcnabua@yahoo.com / mdrrmonabua@gmail.com</p>
                </section>

                <header className="zr-paper-header zr-paper-header-compact">
                  <div>
                    <p className="zr-paper-report-id mb-0">Report ID: #{report.id}</p>
                  </div>
                  <div className="zr-paper-badges">
                    <span className={`zr-paper-badge ${report.report_type === 'Emergency' ? 'zr-paper-badge-type-emergency' : 'zr-paper-badge-type-incident'}`}>
                      {report.report_type}
                    </span>
                  </div>
                </header>

                <section className="zr-paper-section">
                  <h3>Record Sheet</h3>
                  <div className="zr-record-table-wrap">
                    <table className="zr-record-table">
                      <tbody>
                        <tr className="zr-record-section-row">
                          <th colSpan={6}>Patient Record</th>
                        </tr>
                        <tr>
                          <th>Patient Name</th>
                          <td>{textOrNA(primaryClient?.full_name)}</td>
                          <th>Age</th>
                          <td>{textOrNA(primaryClient?.age)}</td>
                          <th>Gender</th>
                          <td>{textOrNA(primaryClient?.gender)}</td>
                        </tr>
                        <tr>
                          <th>Nationality</th>
                          <td>{textOrNA(primaryClient?.nationality)}</td>
                          <th>Contact Number</th>
                          <td colSpan={3}>{textOrNA(primaryClient?.contact_number)}</td>
                        </tr>
                        <tr>
                          <th>Permanent Address</th>
                          <td colSpan={5}>{textOrNA(primaryClient?.permanent_address)}</td>
                        </tr>
                        <tr>
                          <th>Location of Incident</th>
                          <td colSpan={5}>{textOrNA(primaryClient?.incident_address)}</td>
                        </tr>
                        <tr className="zr-record-section-row">
                          <th colSpan={6}>Report Record</th>
                        </tr>
                        <tr>
                          <th>Report Date</th>
                          <td>{formatDate(report.date_reported)}</td>
                          <th>Report Time</th>
                          <td>{formatTime(report.time_reported)}</td>
                          <th>Dispatcher</th>
                          <td>{textOrNA(detail?.dispatcher_name)}</td>
                        </tr>
                        <tr>
                          <th>Incident Date</th>
                          <td>{textOrNA(detail?.incident_date ? formatDate(detail.incident_date) : null)}</td>
                          <th>Incident Time</th>
                          <td>{textOrNA(detail?.incident_time ? formatTime(detail.incident_time) : null)}</td>
                          <th>Type</th>
                          <td>{report.report_type}</td>
                        </tr>
                        <tr className="zr-record-section-row">
                          <th colSpan={6}>{report.report_type === 'Emergency' ? 'Incident Details (Emergency)' : 'Incident Details (Incident)'}</th>
                        </tr>
                        <tr>
                          <th>{report.report_type === 'Emergency' ? 'Type of Emergency' : 'Type of Hazard'}</th>
                          <td>{textOrNA(report.report_type === 'Emergency' ? detail?.type_of_emergency : detail?.type_of_hazard)}</td>
                          <th>{report.report_type === 'Emergency' ? 'Nature of Illness' : 'Nature of Call'}</th>
                          <td colSpan={3}>{textOrNA(report.report_type === 'Emergency' ? detail?.nature_of_illness : detail?.nature_of_call)}</td>
                        </tr>
                        {report.report_type === 'Emergency' && (
                          <tr>
                            <th>Mechanism of Injury</th>
                            <td colSpan={5}>{textOrNA(detail?.mechanism_of_injury)}</td>
                          </tr>
                        )}
                        <tr>
                          <th>Responders</th>
                          <td colSpan={5}>{responders.length > 0 ? responders.join(', ') : 'N/A'}</td>
                        </tr>
                        {report.report_type === 'Emergency' && (
                          <>
                            <tr className="zr-record-section-row">
                              <th colSpan={6}>Assessment & Care Record</th>
                            </tr>
                            <tr>
                              <th>Chief Complaint</th>
                              <td colSpan={5}>{textOrNA(primaryAssessment?.chief_complaint)}</td>
                            </tr>
                            <tr>
                              <th>Airway</th>
                              <td>{textOrNA(primaryAssessment?.airway)}</td>
                              <th>Breathing</th>
                              <td>{textOrNA(primaryAssessment?.breathing)}</td>
                              <th>Circulation</th>
                              <td>{textOrNA(primaryAssessment?.circulation_support)}</td>
                            </tr>
                            <tr>
                              <th>Wound Care</th>
                              <td>{textOrNA(primaryAssessment?.wound_care)}</td>
                              <th>Coronary History</th>
                              <td>{textOrNA(primaryAssessment?.history_of_coronary_disease)}</td>
                              <th>Collapse Witness</th>
                              <td>{textOrNA(primaryAssessment?.collapse_witness)}</td>
                            </tr>
                            <tr>
                              <th>Time of Collapse</th>
                              <td>{textOrNA(primaryAssessment?.time_of_collapse ? formatTime(primaryAssessment.time_of_collapse) : null)}</td>
                              <th>Start of CPR</th>
                              <td>{textOrNA(primaryAssessment?.start_of_cpr ? formatTime(primaryAssessment.start_of_cpr) : null)}</td>
                              <th>Defibrillation</th>
                              <td>{textOrNA(primaryAssessment?.defibrillation_time ? formatTime(primaryAssessment.defibrillation_time) : null)}</td>
                            </tr>
                            <tr>
                              <th>CPR Duration</th>
                              <td>{textOrNA(primaryAssessment?.cpr_duration)}</td>
                              <th>ROSC</th>
                              <td>{textOrNA(primaryAssessment?.rosc)}</td>
                              <th>Transferred to Hospital</th>
                              <td>{textOrNA(primaryAssessment?.transferred_to_hospital)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {report.report_type === 'Emergency' && (
                  <section className="zr-paper-section">
                    <h3>Care Management (Original Form Style)</h3>
                    <div className="zr-care-sheet">
                      <div className="zr-care-group">
                        <h4>Airway</h4>
                        <div className="zr-care-options">
                          {airwayOptions.map((option) => (
                            <span className="zr-care-option" key={`airway-${option}`}>
                              <span className={`zr-check-box ${hasSelection(primaryAssessment?.airway, option) ? 'is-checked' : ''}`}></span>
                              {option}
                            </span>
                          ))}
                          {customAirway.map((option) => (
                            <span className="zr-care-option" key={`airway-custom-${option}`}>
                              <span className="zr-check-box is-checked"></span>
                              {option}
                            </span>
                          ))}
                        </div>

                        <h4>Breathing</h4>
                        <div className="zr-care-options">
                          {breathingOptions.map((option) => (
                            <span className="zr-care-option" key={`breathing-${option}`}>
                              <span className={`zr-check-box ${hasSelection(primaryAssessment?.breathing, option) ? 'is-checked' : ''}`}></span>
                              {option}
                            </span>
                          ))}
                          {customBreathing.map((option) => (
                            <span className="zr-care-option" key={`breathing-custom-${option}`}>
                              <span className="zr-check-box is-checked"></span>
                              {option}
                            </span>
                          ))}
                        </div>

                        <h4>Circulation Support</h4>
                        <div className="zr-care-options">
                          {circulationOptions.map((option) => (
                            <span className="zr-care-option" key={`circulation-${option}`}>
                              <span className={`zr-check-box ${hasSelection(primaryAssessment?.circulation_support, option) ? 'is-checked' : ''}`}></span>
                              {option}
                            </span>
                          ))}
                          {customCirculation.map((option) => (
                            <span className="zr-care-option" key={`circulation-custom-${option}`}>
                              <span className="zr-check-box is-checked"></span>
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="zr-care-group">
                        <h4>Wound Care</h4>
                        <div className="zr-care-options">
                          {woundCareOptions.map((option) => (
                            <span className="zr-care-option" key={`wound-${option}`}>
                              <span className={`zr-check-box ${hasSelection(primaryAssessment?.wound_care, option) ? 'is-checked' : ''}`}></span>
                              {option}
                            </span>
                          ))}
                          {customWoundCare.map((option) => (
                            <span className="zr-care-option" key={`wound-custom-${option}`}>
                              <span className="zr-check-box is-checked"></span>
                              {option}
                            </span>
                          ))}
                        </div>

                        <h4>Miscellaneous</h4>
                        <div className="zr-care-options">
                          {miscOptions.map((option) => (
                            <span className="zr-care-option" key={`misc-${option}`}>
                              <span className={`zr-check-box ${hasSelection(primaryAssessment?.miscellaneous, option) ? 'is-checked' : ''}`}></span>
                              {option}
                            </span>
                          ))}
                          {customMisc.map((option) => (
                            <span className="zr-care-option" key={`misc-custom-${option}`}>
                              <span className="zr-check-box is-checked"></span>
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="zr-care-group">
                        <h4>Cessation of Resuscitation</h4>
                        <div className="zr-care-data-list">
                          <div><strong>History of Coronary Disease:</strong> <span>{textOrNA(primaryAssessment?.history_of_coronary_disease)}</span></div>
                          <div><strong>Collapse Witness:</strong> <span>{textOrNA(primaryAssessment?.collapse_witness)}</span></div>
                          <div><strong>Time of Collapse:</strong> <span>{textOrNA(primaryAssessment?.time_of_collapse ? formatTime(primaryAssessment.time_of_collapse) : null)}</span></div>
                          <div><strong>Start of CPR:</strong> <span>{textOrNA(primaryAssessment?.start_of_cpr ? formatTime(primaryAssessment.start_of_cpr) : null)}</span></div>
                          <div><strong>Defibrillation:</strong> <span>{textOrNA(primaryAssessment?.defibrillation_time ? formatTime(primaryAssessment.defibrillation_time) : null)}</span></div>
                          <div><strong>Duration of CPR:</strong> <span>{textOrNA(primaryAssessment?.cpr_duration)}</span></div>
                          <div><strong>ROSC:</strong> <span>{textOrNA(primaryAssessment?.rosc)}</span></div>
                          <div><strong>Transferred to Hospital:</strong> <span>{textOrNA(primaryAssessment?.transferred_to_hospital)}</span></div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

              </>
            )}
          </article>

          {!isLoading && report && (
            <article className="zr-report-paper zr-report-page zr-report-second-page">
              <header className="zr-paper-header">
                <div>
                  <h2 className="zr-paper-title mb-1">Photo Attachment</h2>
                  <p className="zr-paper-subtitle mb-0">Second page for report images</p>
                </div>
                <div className="zr-paper-badges">
                  <span className="zr-paper-badge">{report.report_type}</span>
                  <span className="zr-paper-badge zr-paper-badge-muted">#{report.id}</span>
                </div>
              </header>

              <section className="zr-paper-section">
                <h3>Photos</h3>
                {photos.length < 1 ? (
                  <p className="mb-0">No photos attached for this report.</p>
                ) : (
                  <div className="zr-photo-grid">
                    {photos.map(photo => (
                      <figure className="zr-photo-card" key={`photo-page-${photo.id}`}>
                        <img
                          src={resolvePhotoUrl(photo.photo_path)}
                          alt={`Report photo ${photo.id}`}
                          className="zr-photo-image"
                          loading="lazy"
                        />
                      </figure>
                    ))}
                  </div>
                )}
              </section>
            </article>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
