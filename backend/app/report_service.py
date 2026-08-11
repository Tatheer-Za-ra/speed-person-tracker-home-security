# backend/app/report_service.py

import csv
import io
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def _normalize_category(label: str, face_status: Optional[str] = None) -> str:
    """Helper to normalize raw event labels into human readable categories."""
    if not label:
        return "Other"
    l = label.lower()
    if l == "person":
        return "Known Person" if face_status == "known" else "Unknown Person"
    if l in ["car", "sedan", "suv", "van", "automobile"]:
        return "Car"
    if l in ["motorcycle", "motorbike", "bike", "bicycle", "scooter"]:
        return "Bike"
    if l in ["truck", "pickup", "lorry", "hauler"]:
        return "Truck"
    return "Other"


def generate_pdf_report(events: List[Dict[str, Any]], filter_info: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Generates a high-resolution PDF Security Audit Report using ReportLab flowables.
    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY_DARK = colors.HexColor("#060911")
    ACCENT_CYAN = colors.HexColor("#0284c7")
    TEXT_LIGHT = colors.HexColor("#f8fafc")
    TEXT_MUTED = colors.HexColor("#64748b")
    ALERT_RED = colors.HexColor("#dc2626")
    SUCCESS_GREEN = colors.HexColor("#059669")
    TABLE_BG_DARK = colors.HexColor("#0f172a")
    TABLE_ALT_ROW = colors.HexColor("#1e293b")

    # Custom Typography Styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=TEXT_MUTED,
        fontName="Helvetica",
        spaceAfter=12,
    )

    section_header_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=ACCENT_CYAN,
        fontName="Helvetica-Bold",
        spaceBefore=10,
        spaceAfter=6,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.white,
        fontName="Helvetica-Bold",
        alignment=1,  # Center
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica",
        alignment=1,  # Center
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("SPEED PERSON TRACKER — HOME SECURITY AUDIT REPORT", title_style))
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    scope_str = filter_info.get("scope_description", "All Recorded Video Activity") if filter_info else "All Recorded Video Activity"
    story.append(Paragraph(f"Generated on: <strong>{now_str}</strong> | Audit Scope: <strong>{scope_str}</strong>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_CYAN, spaceAfter=14))

    # 2. Executive Summary Metrics Calculation
    total_events = len(events)
    alert_events = sum(1 for e in events if e.get("is_alert") or (e.get("label") == "person" and (e.get("metadata") or {}).get("face_match_status") != "known"))
    vehicle_count = sum(1 for e in events if e.get("label") != "person")
    person_count = sum(1 for e in events if e.get("label") == "person")

    summary_data = [
        [
            Paragraph("<b>Total Events</b>", table_header_style),
            Paragraph("<b>Security Alerts</b>", table_header_style),
            Paragraph("<b>Vehicles Tracked</b>", table_header_style),
            Paragraph("<b>Persons Detected</b>", table_header_style),
        ],
        [
            Paragraph(f"<font size=14 color='#0284c7'><b>{total_events}</b></font>", table_cell_style),
            Paragraph(f"<font size=14 color='#dc2626'><b>{alert_events}</b></font>", table_cell_style),
            Paragraph(f"<font size=14 color='#0284c7'><b>{vehicle_count}</b></font>", table_cell_style),
            Paragraph(f"<font size=14 color='#059669'><b>{person_count}</b></font>", table_cell_style),
        ],
    ]

    summary_table = Table(summary_data, colWidths=[1.7 * inch, 1.7 * inch, 1.7 * inch, 1.7 * inch])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_DARK),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f1f5f9")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # 3. Telemetry Event Feed Table
    story.append(Paragraph("SECURITY TELEMETRY LOGS", section_header_style))

    if not events:
        story.append(Paragraph("No telemetry event records found for the selected scope.", subtitle_style))
    else:
        table_rows = [
            [
                Paragraph("<b>ID</b>", table_header_style),
                Paragraph("<b>Video Title</b>", table_header_style),
                Paragraph("<b>Time (s)</b>", table_header_style),
                Paragraph("<b>Category</b>", table_header_style),
                Paragraph("<b>Speed (km/h)</b>", table_header_style),
                Paragraph("<b>Identity Match</b>", table_header_style),
                Paragraph("<b>Alert Status</b>", table_header_style),
            ]
        ]

        for ev in events:
            meta = ev.get("metadata") or {}
            ev_id = f"#{ev.get('id', 'N/A')}"
            v_title = ev.get("video_title") or f"Video #{ev.get('video_id', 'N/A')}"
            time_sec = f"{ev.get('timestamp_seconds', 0.0)}s"
            norm_cat = _normalize_category(ev.get("label"), meta.get("face_match_status"))

            spd_val = meta.get("estimated_speed_kmh")
            spd_str = f"{spd_val} km/h" if spd_val is not None else "N/A"
            if meta.get("speed_status") == "OVERSPEED":
                spd_cell = f"<font color='#dc2626'><b>{spd_str} (OVERSPEED)</b></font>"
            else:
                spd_cell = spd_str

            face_match = meta.get("face_match_status")
            if face_match == "known":
                identity_cell = "<font color='#059669'><b>KNOWN PERSON</b></font>"
            elif ev.get("label") == "person":
                identity_cell = "<font color='#dc2626'><b>UNKNOWN PERSON</b></font>"
            else:
                identity_cell = "N/A"

            is_alert = ev.get("is_alert") or (ev.get("label") == "person" and face_match != "known")
            alert_cell = "<font color='#dc2626'><b>ALERT</b></font>" if is_alert else "<font color='#059669'>NORMAL</font>"

            table_rows.append([
                Paragraph(ev_id, table_cell_style),
                Paragraph(v_title[:20], table_cell_style),
                Paragraph(time_sec, table_cell_style),
                Paragraph(norm_cat, table_cell_style),
                Paragraph(spd_cell, table_cell_style),
                Paragraph(identity_cell, table_cell_style),
                Paragraph(alert_cell, table_cell_style),
            ])

        event_table = Table(
            table_rows,
            colWidths=[0.6 * inch, 1.6 * inch, 0.7 * inch, 1.2 * inch, 1.2 * inch, 1.1 * inch, 0.8 * inch],
        )

        t_style = [
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_DARK),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]

        # Alternate row background colors
        for r_idx in range(1, len(table_rows)):
            if r_idx % 2 == 0:
                t_style.append(("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f8fafc")))

        event_table.setStyle(TableStyle(t_style))
        story.append(event_table)

    # Build PDF Document
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_csv_report(events: List[Dict[str, Any]]) -> str:
    """
    Generates a clean CSV event telemetry log export.
    Returns CSV text string.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header Row
    writer.writerow([
        "Event ID",
        "Video ID",
        "Video Title",
        "Timestamp (s)",
        "Normalized Category",
        "Raw Label",
        "Track ID",
        "Estimated Speed (km/h)",
        "Speed Limit (km/h)",
        "Speed Status",
        "Face Match Status",
        "Cosine Similarity",
        "Alert Flag",
        "Created At",
    ])

    for ev in events:
        meta = ev.get("metadata") or {}
        face_match = meta.get("face_match_status")
        norm_cat = _normalize_category(ev.get("label"), face_match)
        is_alert = ev.get("is_alert") or (ev.get("label") == "person" and face_match != "known")

        sim_val = meta.get("face_similarity")
        sim_str = f"{(sim_val * 100):.1f}%" if sim_val is not None else ""

        writer.writerow([
            ev.get("id", ""),
            ev.get("video_id", ""),
            ev.get("video_title", ""),
            ev.get("timestamp_seconds", 0.0),
            norm_cat,
            ev.get("label", ""),
            ev.get("track_id", ""),
            meta.get("estimated_speed_kmh", ""),
            meta.get("speed_limit_kmh", ""),
            meta.get("speed_status", "NORMAL"),
            face_match or "",
            sim_str,
            "TRUE" if is_alert else "FALSE",
            ev.get("created_at", ""),
        ])

    csv_string = output.getvalue()
    output.close()
    return csv_string
