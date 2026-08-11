# backend/app/report_service.py

import csv
import io
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
    """Helper to normalize raw event labels into clean human readable categories."""
    if not label:
        return "Other"
    l = label.lower()
    if l == "person":
        return "Known Person" if face_status == "known" else "Unknown Person"
    if l in ["car", "sedan", "suv", "van", "automobile"]:
        return "Car"
    if l in ["motorcycle", "motorbike", "bike", "bicycle", "scooter"]:
        return "Bike / Motorcycle"
    if l in ["truck", "pickup", "lorry", "hauler"]:
        return "Truck"
    return "Other Vehicle"


def _format_timestamp(seconds: float) -> str:
    """Formats float timestamp seconds as mm:ss.s (e.g. 01:24.5s)."""
    mins = int(seconds // 60)
    secs = seconds % 60
    return f"{mins:02d}:{secs:04.1f}s"


def generate_pdf_report(
    events: List[Dict[str, Any]],
    filter_info: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Generates a professional PDF Security Audit Report using ReportLab flowables.
    - Excludes numeric database IDs.
    - Groups events by Video Title for batch runs with explicit section headers.
    - Uses clean, non-technical column headers.
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

    # Custom Palette
    HEADER_NAVY = colors.HexColor("#060911")
    PRIMARY_CYAN = colors.HexColor("#0284c7")
    SECTION_BG = colors.HexColor("#1e293b")
    ROW_BG_ALT = colors.HexColor("#f8fafc")

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
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#475569"),
        fontName="Helvetica",
        spaceAfter=12,
    )

    section_header_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=11,
        leading=15,
        textColor=PRIMARY_CYAN,
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

    batch_header_style = ParagraphStyle(
        "BatchHeader",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        fontName="Helvetica-Bold",
        alignment=0,  # Left
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("SPEED PERSON TRACKER — SECURITY AUDIT REPORT", title_style))
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    scope_str = (filter_info or {}).get("scope_description", "Latest Run Telemetry")
    story.append(
        Paragraph(
            f"Generated: <strong>{now_str}</strong> | Audit Scope: <strong>{scope_str}</strong>",
            subtitle_style,
        )
    )
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_CYAN, spaceAfter=14))

    # 2. Executive Metrics Summary Table
    total_events = len(events)
    intruder_count = sum(
        1 for e in events
        if e.get("label") == "person" and (e.get("metadata") or {}).get("face_match_status") != "known"
    )
    speeding_count = sum(
        1 for e in events
        if (e.get("metadata") or {}).get("speed_status") == "OVERSPEED"
    )
    vehicle_count = sum(1 for e in events if e.get("label") != "person")

    summary_data = [
        [
            Paragraph("<b>Total Detections</b>", table_header_style),
            Paragraph("<b>Unrecognized Intruders</b>", table_header_style),
            Paragraph("<b>Speeding Violations</b>", table_header_style),
            Paragraph("<b>Vehicles Tracked</b>", table_header_style),
        ],
        [
            Paragraph(f"<font size=13 color='#0284c7'><b>{total_events}</b></font>", table_cell_style),
            Paragraph(f"<font size=13 color='#dc2626'><b>{intruder_count}</b></font>", table_cell_style),
            Paragraph(f"<font size=13 color='#dc2626'><b>{speeding_count}</b></font>", table_cell_style),
            Paragraph(f"<font size=13 color='#059669'><b>{vehicle_count}</b></font>", table_cell_style),
        ],
    ]

    summary_table = Table(summary_data, colWidths=[1.7 * inch, 1.7 * inch, 1.7 * inch, 1.7 * inch])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_NAVY),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f1f5f9")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # 3. Security Telemetry Logs Section
    story.append(Paragraph("SECURITY AUDIT TELEMETRY LOGS", section_header_style))

    if not events:
        story.append(Paragraph("No security telemetry events recorded for this audit scope.", subtitle_style))
    else:
        # Group events by Video Title
        events_by_video = {}
        for ev in events:
            v_title = ev.get("video_title") or "Unclassified Video"
            events_by_video.setdefault(v_title, []).append(ev)

        # Check if single video run vs batch run
        is_single_video = len(events_by_video) == 1

        table_rows = [
            [
                Paragraph("<b>Timestamp</b>", table_header_style),
                Paragraph("<b>Target Category</b>", table_header_style),
                Paragraph("<b>Estimated Speed</b>", table_header_style),
                Paragraph("<b>Speed Limit</b>", table_header_style),
                Paragraph("<b>Velocity Flag</b>", table_header_style),
                Paragraph("<b>Facial Recognition</b>", table_header_style),
                Paragraph("<b>Security Alert</b>", table_header_style),
            ]
        ]

        table_style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_NAVY),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]

        current_row_idx = 1
        for v_title, v_events in events_by_video.items():
            # Sort events for this video in chronological order (earliest timestamp first)
            v_events = sorted(v_events, key=lambda e: e.get("timestamp_seconds", 0.0))

            # For multi-video batch runs, insert an explicit full-width section header row!
            if not is_single_video:
                table_rows.append([
                    Paragraph(f"📹 <b>VIDEO: {v_title}</b> ({len(v_events)} detections)", batch_header_style),
                    "", "", "", "", "", "",
                ])
                table_style_cmds.append(("SPAN", (0, current_row_idx), (6, current_row_idx)))
                table_style_cmds.append(("BACKGROUND", (0, current_row_idx), (6, current_row_idx), SECTION_BG))
                table_style_cmds.append(("TOPPADDING", (0, current_row_idx), (6, current_row_idx), 5))
                table_style_cmds.append(("BOTTOMPADDING", (0, current_row_idx), (6, current_row_idx), 5))
                current_row_idx += 1

            for ev in v_events:
                meta = ev.get("metadata") or {}
                time_str = _format_timestamp(ev.get("timestamp_seconds", 0.0))
                norm_cat = _normalize_category(ev.get("label"), meta.get("face_match_status"))

                # Velocity telemetry
                spd_val = meta.get("estimated_speed_kmh")
                limit_val = meta.get("speed_limit_kmh")
                spd_str = f"{spd_val} km/h" if spd_val is not None else "N/A"
                limit_str = f"{limit_val} km/h" if limit_val is not None else "N/A"

                if meta.get("speed_status") == "OVERSPEED":
                    spd_flag = "<font color='#dc2626'><b>SPEEDING</b></font>"
                elif spd_val is not None:
                    spd_flag = "<font color='#059669'>NORMAL</font>"
                else:
                    spd_flag = "N/A"

                # Facial Recognition Telemetry
                face_match = meta.get("face_match_status")
                sim_val = meta.get("face_similarity")
                sim_pct = f" ({(sim_val * 100):.1f}%)" if sim_val is not None else ""

                if face_match == "known":
                    identity_cell = f"<font color='#059669'><b>Known Person{sim_pct}</b></font>"
                elif ev.get("label") == "person":
                    identity_cell = "<font color='#dc2626'><b>Unknown Person</b></font>"
                else:
                    identity_cell = "N/A"

                is_alert = ev.get("is_alert") or (ev.get("label") == "person" and face_match != "known")
                alert_cell = "<font color='#dc2626'><b>ALERT</b></font>" if is_alert else "<font color='#475569'>NORMAL</font>"

                table_rows.append([
                    Paragraph(time_str, table_cell_style),
                    Paragraph(norm_cat, table_cell_style),
                    Paragraph(spd_str, table_cell_style),
                    Paragraph(limit_str, table_cell_style),
                    Paragraph(spd_flag, table_cell_style),
                    Paragraph(identity_cell, table_cell_style),
                    Paragraph(alert_cell, table_cell_style),
                ])

                if current_row_idx % 2 == 0:
                    table_style_cmds.append(("BACKGROUND", (0, current_row_idx), (-1, current_row_idx), ROW_BG_ALT))

                current_row_idx += 1

        event_table = Table(
            table_rows,
            colWidths=[0.9 * inch, 1.3 * inch, 1.0 * inch, 0.9 * inch, 1.0 * inch, 1.6 * inch, 0.8 * inch],
        )
        event_table.setStyle(TableStyle(table_style_cmds))
        story.append(event_table)

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_csv_report(events: List[Dict[str, Any]]) -> str:
    """
    Generates a clean CSV event telemetry log export.
    - Excludes numeric database IDs.
    - Adds explicit video section header rows (--- VIDEO: filename.mp4 (N detections) ---) for both single and batch runs.
    - Removes redundant Video Name column from telemetry data rows.
    - Events within each video section are sorted strictly in chronological order by timestamp.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Sort events chronologically
    events = sorted(events, key=lambda e: e.get("timestamp_seconds", 0.0))

    # Group by video title
    events_by_video = {}
    for ev in events:
        v_title = ev.get("video_title") or "Unclassified Video"
        events_by_video.setdefault(v_title, []).append(ev)

    # Write CSV Column Header Row (No redundant "Video Name" column)
    writer.writerow([
        "Timestamp (s)",
        "Target Category",
        "Estimated Speed (km/h)",
        "Speed Limit (km/h)",
        "Speed Flag",
        "Facial Identity Status",
        "Match Confidence (%)",
        "Security Alert",
        "Recorded Date",
    ])

    for v_title, v_events in events_by_video.items():
        # Ensure chronological order for this video
        v_events = sorted(v_events, key=lambda e: e.get("timestamp_seconds", 0.0))

        # Always write the explicit Video section header row as shown in image!
        writer.writerow([f"--- VIDEO: {v_title} ({len(v_events)} detections) ---"])

        for ev in v_events:
            meta = ev.get("metadata") or {}
            face_match = meta.get("face_match_status")
            norm_cat = _normalize_category(ev.get("label"), face_match)
            is_alert = ev.get("is_alert") or (ev.get("label") == "person" and face_match != "known")

            sim_val = meta.get("face_similarity")
            sim_str = f"{(sim_val * 100):.1f}%" if sim_val is not None else "N/A"

            if face_match == "known":
                identity_status = "Known Person"
            elif ev.get("label") == "person":
                identity_status = "Unknown Person"
            else:
                identity_status = "N/A"

            spd_status = meta.get("speed_status", "NORMAL")
            spd_flag = "SPEEDING" if spd_status == "OVERSPEED" else ("NORMAL" if meta.get("estimated_speed_kmh") is not None else "N/A")

            writer.writerow([
                ev.get("timestamp_seconds", 0.0),
                norm_cat,
                meta.get("estimated_speed_kmh", "N/A"),
                meta.get("speed_limit_kmh", "N/A"),
                spd_flag,
                identity_status,
                sim_str,
                "ALERT" if is_alert else "NORMAL",
                ev.get("created_at", ""),
            ])

    csv_string = output.getvalue()
    output.close()
    return csv_string
