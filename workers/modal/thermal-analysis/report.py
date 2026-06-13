"""PDF + HTML report generation for thermal inspection sessions."""

from __future__ import annotations

import base64
import html
import json
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import Image as RlImage
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet


def _safe(text: Any) -> str:
    return html.escape(str(text if text is not None else ""))


def build_html_report(session_meta: dict[str, Any], captures: list[dict[str, Any]]) -> str:
    branding = session_meta.get("branding") or {}
    company = branding.get("company_name") or "Thermal Inspection Report"
    footer = branding.get("custom_footer") or ""
    summary = session_meta.get("summary") or {}

    cards = []
    for capture in captures[:12]:
        preview_b64 = capture.get("preview_b64")
        img = (
            f'<img alt="capture" src="data:image/jpeg;base64,{preview_b64}" '
            'style="width:100%;border-radius:12px;margin-top:8px;" />'
            if preview_b64
            else "<p>No preview embedded</p>"
        )
        anomalies = capture.get("anomalies") or []
        anomaly_items = "".join(
            f"<li>{_safe(a.get('type'))} · ΔT {_safe(a.get('delta_c'))}°C · {_safe(a.get('severity'))}</li>"
            for a in anomalies[:5]
        )
        cards.append(
            f"""
            <article style="border:1px solid #334155;border-radius:16px;padding:16px;margin-bottom:16px;">
              <h3 style="margin:0 0 8px;">{_safe(capture.get('filename') or 'Capture')}</h3>
              {img}
              <ul style="margin:12px 0 0;padding-left:18px;color:#cbd5e1;">{anomaly_items or '<li>No anomalies flagged</li>'}</ul>
            </article>
            """
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{_safe(session_meta.get('name') or 'Thermal Report')}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {{ background:#0B0F15; color:#F8FAFC; font-family:Arial,sans-serif; margin:0; padding:24px; }}
    .wrap {{ max-width:960px; margin:0 auto; }}
    .metrics {{ display:flex; gap:16px; flex-wrap:wrap; margin:16px 0 24px; }}
    .metric {{ background:#111827; border:1px solid #334155; border-radius:12px; padding:12px 16px; min-width:140px; }}
  </style>
</head>
<body>
  <div class="wrap">
    <p style="color:#94a3b8;text-transform:uppercase;letter-spacing:.12em;font-size:12px;">{_safe(company)}</p>
    <h1 style="margin:8px 0 0;">{_safe(session_meta.get('name') or 'Thermal Inspection')}</h1>
    <p style="color:#94a3b8;">Generated {_safe(datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))}</p>
    <div class="metrics">
      <div class="metric"><div>Captures</div><strong>{_safe(summary.get('total_captures', len(captures)))}</strong></div>
      <div class="metric"><div>Anomalies</div><strong>{_safe(summary.get('critical_anomalies', 0))}</strong></div>
      <div class="metric"><div>Max temp</div><strong>{_safe(summary.get('max_detected_temp_c', '—'))}°C</strong></div>
    </div>
    {''.join(cards)}
    <footer style="margin-top:24px;color:#64748b;font-size:12px;">{_safe(footer)}</footer>
  </div>
</body>
</html>"""


def build_pdf_report(session_meta: dict[str, Any], captures: list[dict[str, Any]], output_path: Path) -> None:
    styles = getSampleStyleSheet()
    branding = session_meta.get("branding") or {}
    summary = session_meta.get("summary") or {}

    doc = SimpleDocTemplate(str(output_path), pagesize=letter, title=str(session_meta.get("name") or "Thermal Report"))
    story = []

    company = branding.get("company_name") or "Thermal Inspection Report"
    story.append(Paragraph(f"<b>{_safe(company)}</b>", styles["Title"]))
    story.append(Paragraph(_safe(session_meta.get("name") or "Thermal Inspection"), styles["Heading2"]))
    story.append(
        Paragraph(
            f"Generated {_safe(datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.2 * inch))

    metrics = [
        ["Captures", str(summary.get("total_captures", len(captures)))],
        ["Action anomalies", str(summary.get("critical_anomalies", 0))],
        ["Max detected temp", f"{summary.get('max_detected_temp_c', '—')}°C"],
        ["Avg confidence", str(summary.get("avg_confidence_score", "—"))],
    ]
    table = Table(metrics, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#334155")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.25 * inch))

    for capture in captures[:6]:
        story.append(Paragraph(f"<b>{_safe(capture.get('filename') or 'Capture')}</b>", styles["Heading3"]))
        preview_b64 = capture.get("preview_b64")
        if preview_b64:
            img_bytes = base64.b64decode(preview_b64)
            img = RlImage(BytesIO(img_bytes), width=4.5 * inch, height=3.2 * inch)
            story.append(img)
        anomalies = capture.get("anomalies") or []
        for anomaly in anomalies[:5]:
            story.append(
                Paragraph(
                    f"• {_safe(anomaly.get('type'))} · ΔT {_safe(anomaly.get('delta_c'))}°C · {_safe(anomaly.get('severity'))}",
                    styles["Normal"],
                )
            )
        story.append(Spacer(1, 0.15 * inch))

    footer = branding.get("custom_footer")
    if footer:
        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph(_safe(footer), styles["Italic"]))

    doc.build(story)


def encode_preview_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    return base64.b64encode(path.read_bytes()).decode("ascii")
