"""PDF + HTML report generation for thermal inspection sessions.

Consumes the resolved report template passed in `session_meta["report_template"]`
(sections, standards, methodology, disclaimer, severity scheme) so the output
reflects whichever template the operator selected. Per-anomaly findings are
described in professional, standards-aware language — the standards come from the
template, never from a hardcoded certification.
"""

from __future__ import annotations

import base64
import html
import urllib.request
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


def _fmt_temp(c: Any, unit: str = "C") -> str:
    if not isinstance(c, (int, float)):
        return "—"
    v = c * 9 / 5 + 32 if unit == "F" else c
    return f"{v:.1f}°{unit}"


def _fmt_delta(c: Any, unit: str = "C") -> str:
    if not isinstance(c, (int, float)):
        return "—"
    v = abs(c) * (9 / 5 if unit == "F" else 1)
    return f"{v:.1f}°{unit}"


def _standards_clause(standards: list[str]) -> str:
    return f" Evaluate per {', '.join(standards)}." if standards else ""


def describe_anomaly(a: dict[str, Any], standards: list[str] | None = None, unit: str = "C") -> str:
    """Mirror of lib/thermal/anomaly-describe.ts — local-contrast + pattern aware,
    standards-driven, no credentials."""
    standards = standards or []
    std = _standards_clause(standards)
    peak = _fmt_temp(a.get("temp_c"), unit)
    dt = _fmt_delta(a.get("delta_c"), unit)
    sev = a.get("severity") or "info"
    typ = a.get("type")
    pattern = a.get("pattern")
    bg = a.get("background_c")
    bg_str = f" above its surroundings (~{_fmt_temp(bg, unit)})" if isinstance(bg, (int, float)) else " vs surroundings"
    bg_cold = f" below its surroundings (~{_fmt_temp(bg, unit)})" if isinstance(bg, (int, float)) else " below surroundings"
    act = " Prioritize on-site investigation." if sev == "action" else (" Monitor and follow up." if sev == "watch" else "")

    if typ == "hot_spot":
        if pattern == "diffuse":
            return (
                f"Diffuse warm area — peak {peak}, {dt}{bg_str}. The soft, spread signature points to "
                f"air leakage, thermal bridging, or moisture warming rather than a point fault.{act}{std}"
            )
        return (
            f"Focal hot spot — peak {peak}, {dt}{bg_str}. The sharp, localized signature is consistent with "
            f"elevated electrical resistance, a loose/overloaded connection, or mechanical friction.{act}{std}"
        )

    if typ == "cold_bridge":
        if pattern == "focal":
            return (
                f"Localized cool spot — {dt}{bg_cold}. Consistent with an insulation gap, a fastener/structural "
                f"heat sink, or a small breach.{act}{std}"
            )
        return (
            f"Diffuse cool region — {dt}{bg_cold}. The soft pattern is characteristic of moisture intrusion or "
            f"saturated insulation; confirm with a moisture meter.{act}{std}"
        )

    if typ == "linear_streak":
        return (
            "Linear thermal trace — the geometry suggests sub-surface piping, embedded wiring, or moisture "
            f"tracking along a seam or framing member. Verify in the field.{std}"
        )

    return f"Thermal anomaly — {dt}{bg_str}, severity {sev}.{std}"


def _template(session_meta: dict[str, Any]) -> dict[str, Any]:
    return session_meta.get("report_template") or {}


def _section_on(sections: dict[str, Any], key: str) -> bool:
    if not sections:
        return True
    return bool(sections.get(key, True))


def _fetch_logo_b64(url: Any) -> str | None:
    if not url or not isinstance(url, str) or not url.startswith(("http://", "https://")):
        return None
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:  # noqa: S310
            return base64.b64encode(resp.read()).decode("ascii")
    except Exception:
        return None


def _capture_data_rows(capture: dict[str, Any]) -> list[tuple[str, str]]:
    """Per-image camera/settings/metadata rows for the report."""
    q = capture.get("qualityMetrics") or {}
    gps = capture.get("gps") or {}
    meta = capture.get("metadata") or {}
    tuning = meta.get("tuning") or {}
    rows: list[tuple[str, str]] = []

    def add(label: str, value: Any) -> None:
        if value not in (None, "", "—"):
            rows.append((label, str(value)))

    add("Camera", q.get("sensor_make"))
    add("Sensor", q.get("sensor_model") or q.get("parser_id"))
    if q.get("max_temp_c") is not None:
        add("Max temp", f"{q.get('max_temp_c')}°C")
    if q.get("min_temp_c") is not None:
        add("Min temp", f"{q.get('min_temp_c')}°C")
    if q.get("avg_temp_c") is not None:
        add("Avg temp", f"{q.get('avg_temp_c')}°C")
    add("Emissivity", tuning.get("emissivity") if tuning.get("emissivity") is not None else q.get("emissivity_used"))
    if tuning.get("reflected_c") is not None:
        add("Reflected", f"{tuning.get('reflected_c')}°C")
    lat, lon = gps.get("lat"), gps.get("lon", gps.get("lng"))
    if lat is not None and lon is not None:
        add("GPS", f"{lat}, {lon}")
    add("Radiometric", "Yes" if q.get("is_radiometric") else None)
    return rows


def build_html_report(session_meta: dict[str, Any], captures: list[dict[str, Any]]) -> str:
    branding = session_meta.get("branding") or {}
    company = branding.get("company_name") or "Thermal Inspection Report"
    footer = branding.get("custom_footer") or ""
    summary = session_meta.get("summary") or {}
    template = _template(session_meta)
    sections = template.get("sections") or {}
    standards = template.get("standards") or []
    signature = session_meta.get("report_signature") or ""

    blocks: list[str] = []

    if _section_on(sections, "methodology") and template.get("methodology_text"):
        std_line = (
            f'<p style="color:#94a3b8;font-size:13px;">Standards: {_safe(", ".join(standards))}</p>'
            if standards
            else ""
        )
        blocks.append(
            f'<section style="margin:24px 0;"><h2 style="margin:0 0 6px;">Methodology</h2>'
            f'<p style="color:#cbd5e1;">{_safe(template.get("methodology_text"))}</p>{std_line}</section>'
        )

    if _section_on(sections, "findings"):
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
            items = "".join(
                f'<li style="margin-bottom:6px;"><strong>{_safe(a.get("severity"))}</strong> — '
                f"{_safe(describe_anomaly(a, standards))}</li>"
                for a in anomalies[:5]
            )
            cards.append(
                f'<article style="border:1px solid #334155;border-radius:16px;padding:16px;margin-bottom:16px;">'
                f'<h3 style="margin:0 0 8px;">{_safe(capture.get("filename") or "Capture")}</h3>{img}'
                f'<ul style="margin:12px 0 0;padding-left:18px;color:#cbd5e1;">{items or "<li>No anomalies flagged</li>"}</ul>'
                f"</article>"
            )
        blocks.append('<section><h2 style="margin:24px 0 8px;">Findings</h2>' + "".join(cards) + "</section>")

    if _section_on(sections, "severity_table") and template.get("severity_levels"):
        rows = "".join(
            f'<tr><td style="padding:6px 12px;border:1px solid #334155;"><strong>{_safe(lvl.get("label"))}</strong></td>'
            f'<td style="padding:6px 12px;border:1px solid #334155;color:#cbd5e1;">{_safe(lvl.get("definition"))}</td></tr>'
            for lvl in template.get("severity_levels") or []
        )
        blocks.append(
            '<section style="margin:24px 0;"><h2 style="margin:0 0 8px;">Severity scale</h2>'
            f'<table style="border-collapse:collapse;">{rows}</table></section>'
        )

    if _section_on(sections, "disclaimer") and template.get("disclaimer_text"):
        blocks.append(
            f'<section style="margin:24px 0;color:#94a3b8;font-size:13px;"><h2 style="margin:0 0 6px;color:#cbd5e1;">'
            f'Disclaimer</h2><p>{_safe(template.get("disclaimer_text"))}</p></section>'
        )

    if _section_on(sections, "signature") and signature:
        blocks.append(
            f'<section style="margin:24px 0;border-top:1px solid #334155;padding-top:12px;color:#cbd5e1;">'
            f'<p style="white-space:pre-line;">{_safe(signature)}</p></section>'
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
    h2 {{ font-size:18px; }}
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
    {''.join(blocks)}
    <footer style="margin-top:24px;color:#64748b;font-size:12px;">{_safe(footer)}</footer>
  </div>
</body>
</html>"""


def build_pdf_report(session_meta: dict[str, Any], captures: list[dict[str, Any]], output_path: Path) -> None:
    styles = getSampleStyleSheet()
    branding = session_meta.get("branding") or {}
    summary = session_meta.get("summary") or {}
    template = _template(session_meta)
    sections = template.get("sections") or {}
    standards = template.get("standards") or []
    signature = session_meta.get("report_signature") or ""

    doc = SimpleDocTemplate(str(output_path), pagesize=letter, title=str(session_meta.get("name") or "Thermal Report"))
    story: list[Any] = []

    # Cover
    company = branding.get("company_name") or "Thermal Inspection Report"
    story.append(Paragraph(f"<b>{_safe(company)}</b>", styles["Title"]))
    story.append(Paragraph(_safe(session_meta.get("name") or "Thermal Inspection"), styles["Heading2"]))
    story.append(
        Paragraph(f"Generated {_safe(datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))}", styles["Normal"])
    )
    story.append(Spacer(1, 0.2 * inch))

    # Executive summary metrics
    if _section_on(sections, "executive_summary"):
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
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#94a3b8")),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 0.25 * inch))

    # Methodology + standards
    if _section_on(sections, "methodology") and template.get("methodology_text"):
        story.append(Paragraph("<b>Methodology</b>", styles["Heading3"]))
        story.append(Paragraph(_safe(template.get("methodology_text")), styles["Normal"]))
        if standards:
            story.append(Paragraph(f"<i>Standards: {_safe(', '.join(standards))}</i>", styles["Normal"]))
        story.append(Spacer(1, 0.2 * inch))

    # Findings with described anomalies
    if _section_on(sections, "findings"):
        story.append(Paragraph("<b>Findings</b>", styles["Heading3"]))
        for capture in captures[:6]:
            story.append(Paragraph(f"<b>{_safe(capture.get('filename') or 'Capture')}</b>", styles["Heading4"]))
            preview_b64 = capture.get("preview_b64")
            if preview_b64:
                img_bytes = base64.b64decode(preview_b64)
                story.append(RlImage(BytesIO(img_bytes), width=4.5 * inch, height=3.2 * inch))
            anomalies = capture.get("anomalies") or []
            if anomalies:
                for anomaly in anomalies[:5]:
                    story.append(Paragraph(f"• {_safe(describe_anomaly(anomaly, standards))}", styles["Normal"]))
            else:
                story.append(Paragraph("• No anomalies flagged.", styles["Normal"]))
            story.append(Spacer(1, 0.15 * inch))

    # Severity scale
    if _section_on(sections, "severity_table") and template.get("severity_levels"):
        story.append(Paragraph("<b>Severity scale</b>", styles["Heading3"]))
        sev_rows = [[_safe(lvl.get("label")), _safe(lvl.get("definition"))] for lvl in template.get("severity_levels")]
        sev_table = Table(sev_rows, hAlign="LEFT", colWidths=[1.3 * inch, 4.7 * inch])
        sev_table.setStyle(
            TableStyle([("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#94a3b8")), ("FONTNAME", (0, 0), (-1, -1), "Helvetica")])
        )
        story.append(sev_table)
        story.append(Spacer(1, 0.2 * inch))

    # Disclaimer
    if _section_on(sections, "disclaimer") and template.get("disclaimer_text"):
        story.append(Paragraph("<b>Disclaimer</b>", styles["Heading4"]))
        story.append(Paragraph(_safe(template.get("disclaimer_text")), styles["Italic"]))
        story.append(Spacer(1, 0.15 * inch))

    # Signature (operator free text — no hardcoded credential)
    if _section_on(sections, "signature") and signature:
        story.append(Spacer(1, 0.2 * inch))
        for line in str(signature).split("\n"):
            story.append(Paragraph(_safe(line), styles["Normal"]))

    footer = branding.get("custom_footer")
    if footer:
        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph(_safe(footer), styles["Italic"]))

    doc.build(story)


def encode_preview_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    return base64.b64encode(path.read_bytes()).decode("ascii")
