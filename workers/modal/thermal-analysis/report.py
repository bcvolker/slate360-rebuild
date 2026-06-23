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
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing


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
    """Mirror of lib/thermal/anomaly-describe.ts — NEUTRAL, observation-first.
    Reports the measurement and thermal pattern only; never asserts a cause (that is
    the operator's call). No trade lock-in, no credentials, defensible for any use."""
    standards = standards or []
    std = _standards_clause(standards)
    peak = _fmt_temp(a.get("temp_c"), unit)
    dt = _fmt_delta(a.get("delta_c"), unit)
    sev = a.get("severity") or "info"
    typ = a.get("type")
    pattern = a.get("pattern")
    bg = a.get("background_c")
    bg_warm = f" above adjacent surroundings (~{_fmt_temp(bg, unit)})" if isinstance(bg, (int, float)) else " above surroundings"
    bg_cold = f" below adjacent surroundings (~{_fmt_temp(bg, unit)})" if isinstance(bg, (int, float)) else " below surroundings"
    act = " Recommend on-site verification." if sev == "action" else (" Recommend review and follow-up." if sev == "watch" else "")

    if typ == "hot_spot":
        shape = "diffuse (soft, spread)" if pattern == "diffuse" else "focal (sharp, localized)"
        return (
            f"Elevated-temperature area observed — peak {peak}, {dt}{bg_warm} at the time of capture. "
            f"Thermal pattern: {shape} warm region. Confirm the source and context on site.{act}{std}"
        )

    if typ == "cold_bridge":
        shape = "focal (sharp, localized)" if pattern == "focal" else "diffuse (soft, spread)"
        return (
            f"Reduced-temperature area observed — {dt}{bg_cold} at the time of capture. "
            f"Thermal pattern: {shape} cool region. Confirm the source and context on site.{act}{std}"
        )

    if typ == "linear_streak":
        return (
            "Linear thermal trace observed — an elongated temperature pattern following a line or seam "
            f"at the time of capture. Confirm the source and context on site.{act}{std}"
        )

    delta = a.get("delta_c")
    polarity = bg_cold if isinstance(delta, (int, float)) and delta < 0 else bg_warm
    return f"Thermal anomaly observed — {dt}{polarity} at the time of capture. Confirm the source and context on site.{act}{std}"


def _template(session_meta: dict[str, Any]) -> dict[str, Any]:
    return session_meta.get("report_template") or {}


def _section_on(sections: dict[str, Any], key: str) -> bool:
    if not sections:
        return True
    return bool(sections.get(key, True))


def _fetch_logo_b64(url: Any) -> str | None:
    """Operator logo as base64 — supports a data: URI (uploaded logo stored inline)
    or an http(s) URL (hosted logo)."""
    if not url or not isinstance(url, str):
        return None
    if url.startswith("data:"):
        # data:image/png;base64,XXXX
        return url.split(",", 1)[1] if "," in url else None
    if not url.startswith(("http://", "https://")):
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


def _report_unit(session_meta: dict[str, Any]) -> str:
    branding = session_meta.get("branding") or {}
    unit = branding.get("temp_unit")
    return unit if unit in ("C", "F") else "F"


def _order_report_captures(
    captures: list[dict[str, Any]], session_meta: dict[str, Any]
) -> list[dict[str, Any]]:
    """Curated subset/order from session.metadata.report_set; fall back to all."""
    report_set = session_meta.get("report_set") or []
    if report_set:
        by_id = {c.get("captureId"): c for c in captures if c.get("captureId")}
        ordered = [by_id[cid] for cid in report_set if cid in by_id]
        if ordered:
            return ordered
    return captures


def _param_rows(capture: dict[str, Any], unit: str) -> list[tuple[str, str]]:
    meta = capture.get("metadata") or {}
    tuning = meta.get("tuning") or {}
    q = capture.get("qualityMetrics") or {}
    rows: list[tuple[str, str]] = []
    emis = tuning.get("emissivity", q.get("emissivity_used"))
    if emis is not None:
        rows.append(("Emissivity", f"{emis}"))
    if tuning.get("reflected_c") is not None:
        rows.append(("Reflected", _fmt_temp(tuning["reflected_c"], unit)))
    if tuning.get("distance_m") is not None:
        rows.append(("Distance", f"{tuning['distance_m']} m"))
    if tuning.get("humidity_pct") is not None:
        rows.append(("Humidity", f"{tuning['humidity_pct']}%"))
    if tuning.get("atmospheric_c") is not None:
        rows.append(("Atmospheric", _fmt_temp(tuning["atmospheric_c"], unit)))
    return rows


def _condition_rows(session_meta: dict[str, Any], unit: str) -> list[tuple[str, str]]:
    cond = session_meta.get("conditions") or {}
    rows: list[tuple[str, str]] = []
    if cond.get("ambient_c") is not None:
        rows.append(("Ambient", _fmt_temp(cond["ambient_c"], unit)))
    if cond.get("wind_mph") is not None:
        rows.append(("Wind", f"{cond['wind_mph']} mph"))
    if cond.get("focal_mm") is not None:
        rows.append(("Focal length", f"{cond['focal_mm']} mm"))
    return rows


def _measurement_table_rows(capture: dict[str, Any], unit: str) -> list[list[str]]:
    q = capture.get("qualityMetrics") or {}
    rows: list[list[str]] = [["Measurement", "Value"]]
    # Operator-placed spots (calibrated NPZ sample) — the FLIR Sp/Dt table.
    for sp in capture.get("spots_measured") or []:
        rows.append([str(sp.get("label")), _fmt_temp(sp.get("temp_c"), unit)])
    for dt in capture.get("deltas_measured") or []:
        rows.append([f"{dt.get('label')} ({dt.get('a')}−{dt.get('b')})", _fmt_delta(dt.get("value_c"), unit)])
    if q.get("max_temp_c") is not None:
        rows.append(["Max", _fmt_temp(q["max_temp_c"], unit)])
    if q.get("min_temp_c") is not None:
        rows.append(["Min", _fmt_temp(q["min_temp_c"], unit)])
    if q.get("avg_temp_c") is not None:
        rows.append(["Average", _fmt_temp(q["avg_temp_c"], unit)])
    # Detected anomalies (peak + ΔT vs surroundings) supplement the spot table.
    for i, a in enumerate(capture.get("anomalies") or [], start=1):
        rows.append([f"A{i} peak", _fmt_temp(a.get("temp_c"), unit)])
        rows.append([f"A{i} ΔT", _fmt_delta(a.get("delta_c"), unit)])
    return rows


_SIDEBAR_LABEL = ParagraphStyle("SidebarLabel", fontName="Helvetica-Bold", fontSize=8, spaceAfter=2)
_SIDEBAR_TEXT = ParagraphStyle("SidebarText", fontName="Helvetica", fontSize=7.5, leading=10)
_CAPTION = ParagraphStyle("Caption", fontName="Helvetica-Oblique", fontSize=6.5, textColor=colors.HexColor("#555555"))


def _kv_table(rows: list[tuple[str, str]]) -> Table:
    t = Table([[Paragraph(k, _SIDEBAR_TEXT), Paragraph(v, _SIDEBAR_TEXT)] for k, v in rows], colWidths=[0.95 * inch, 1.05 * inch])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LINEBELOW", (0, 0), (-1, -2), 0.2, colors.HexColor("#e2e2e2")),
    ]))
    return t


def _image_flowable(preview_b64: Any, width: float) -> Any:
    if not preview_b64:
        return Paragraph("[no image]", _CAPTION)
    try:
        return RlImage(BytesIO(base64.b64decode(preview_b64)), width=width, height=width * 0.75)
    except Exception:
        return Paragraph("[image error]", _CAPTION)


def _qr_drawing(url: str, size: float = 0.7 * inch) -> Any:
    """A small QR code linking to the interactive share viewer (scan to explore)."""
    try:
        code = qr.QrCodeWidget(url)
        b = code.getBounds()
        bw, bh = b[2] - b[0], b[3] - b[1]
        d = Drawing(size, size, transform=[size / bw, 0, 0, size / bh, 0, 0])
        d.add(code)
        return d
    except Exception:
        return None


def _logo_flowable(b64: Any, max_w: float = 1.7 * inch) -> Any:
    if not b64:
        return None
    try:
        return RlImage(BytesIO(base64.b64decode(b64)), width=max_w, height=max_w * 0.5, kind="proportional")
    except Exception:
        return None


def _compact_card(
    capture: dict[str, Any], session_meta: dict[str, Any], standards: list[str], unit: str, styles: Any
) -> Any:
    """A dense card (thumbnail + key readings + first finding) for the compact grid —
    fits ~4 per page so a large survey isn't one-image-per-page with blank space."""
    q = capture.get("qualityMetrics") or {}
    reads: list[str] = []
    for sp in capture.get("spots_measured") or []:
        reads.append(f"{sp.get('label')} {_fmt_temp(sp.get('temp_c'), unit)}")
    if q.get("max_temp_c") is not None:
        reads.append(f"Max {_fmt_temp(q['max_temp_c'], unit)}")
    if q.get("avg_temp_c") is not None:
        reads.append(f"Avg {_fmt_temp(q['avg_temp_c'], unit)}")
    anoms = capture.get("anomalies") or []
    finding = describe_anomaly(anoms[0], standards, unit) if anoms else (capture.get("metadata") or {}).get("findings") or ""
    inner = [
        _image_flowable(capture.get("preview_b64"), 2.6 * inch),
        Paragraph(_safe(capture.get("filename") or ""), _CAPTION),
        Paragraph(" · ".join(reads) or "—", _SIDEBAR_TEXT),
    ]
    if finding:
        inner.append(Paragraph(_safe(finding)[:240], _SIDEBAR_TEXT))
    return inner


def _per_image_flowables(
    capture: dict[str, Any],
    by_id: dict[str, dict[str, Any]],
    session_meta: dict[str, Any],
    standards: list[str],
    unit: str,
    styles: Any,
    image_w: float = 3.2 * inch,
    share_url: str | None = None,
) -> list[Any]:
    """A FLIR-style per-image detail page: sidebar (measurements / parameters /
    conditions / findings) beside the thermal image stacked over its visual pair."""
    meta = capture.get("metadata") or {}
    q = capture.get("qualityMetrics") or {}

    # --- Sidebar ---
    sidebar: list[Any] = [Paragraph("MEASUREMENTS", _SIDEBAR_LABEL)]
    mt = Table(_measurement_table_rows(capture, unit), colWidths=[1.0 * inch, 1.0 * inch])
    mt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    sidebar.append(mt)

    params = _param_rows(capture, unit)
    if params:
        sidebar.append(Spacer(1, 6))
        sidebar.append(Paragraph("PARAMETERS", _SIDEBAR_LABEL))
        sidebar.append(_kv_table(params))

    conditions = _condition_rows(session_meta, unit)
    if conditions:
        sidebar.append(Spacer(1, 6))
        sidebar.append(Paragraph("CONDITIONS", _SIDEBAR_LABEL))
        sidebar.append(_kv_table(conditions))

    # Capture info — formatted timestamp + geolocation (clean report rows, not a
    # photo stamp). Weather is added by the caller into session_meta when available.
    cap_rows: list[tuple[str, str]] = []
    captured_at = q.get("captured_at")
    if captured_at:
        cap_rows.append(("Captured", str(captured_at)))
    gps = capture.get("gps") or {}
    lat, lon = gps.get("lat"), gps.get("lon", gps.get("lng"))
    if lat is not None and lon is not None:
        cap_rows.append(("Location", f"{float(lat):.5f}, {float(lon):.5f}"))
    weather = capture.get("weather_str")
    if isinstance(weather, str) and weather:
        cap_rows.append(("Weather", weather))
    if cap_rows:
        sidebar.append(Spacer(1, 6))
        sidebar.append(Paragraph("CAPTURE", _SIDEBAR_LABEL))
        sidebar.append(_kv_table(cap_rows))

    sidebar.append(Spacer(1, 6))
    sidebar.append(Paragraph("FINDINGS", _SIDEBAR_LABEL))
    findings_text = meta.get("findings")
    if findings_text:
        sidebar.append(Paragraph(_safe(findings_text), _SIDEBAR_TEXT))
    for a in capture.get("anomalies") or []:
        sidebar.append(Paragraph(f"• {_safe(describe_anomaly(a, standards, unit))}", _SIDEBAR_TEXT))
    if not findings_text and not (capture.get("anomalies")):
        sidebar.append(Paragraph("No findings recorded.", _SIDEBAR_TEXT))

    # --- Image column (thermal over paired visual) ---
    cam = q.get("sensor_make") or ""
    sensor = q.get("sensor_model") or q.get("parser_id") or ""
    image_col: list[Any] = [_image_flowable(capture.get("preview_b64"), image_w)]
    image_col.append(Paragraph(f"{_safe(capture.get('filename') or '')} · {_safe(cam)} {_safe(sensor)}", _CAPTION))
    pair_id = meta.get("visual_pair_id")
    paired = by_id.get(pair_id) if isinstance(pair_id, str) else None
    if paired and paired.get("preview_b64"):
        image_col.append(Spacer(1, 6))
        image_col.append(_image_flowable(paired.get("preview_b64"), image_w))
        image_col.append(Paragraph(f"Visual · {_safe(paired.get('filename') or '')}", _CAPTION))
    if share_url:
        cid = capture.get("captureId")
        deep_url = f"{share_url}{'&' if '?' in share_url else '?'}c={cid}" if cid else share_url
        d = _qr_drawing(deep_url)
        if d is not None:
            image_col.append(Spacer(1, 4))
            image_col.append(d)
            image_col.append(Paragraph("Scan to open this image interactively", _CAPTION))

    layout = Table([[sidebar, image_col]], colWidths=[2.15 * inch, max(3.4 * inch, image_w + 0.2 * inch)])
    layout.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (0, 0), 0)]))

    title = Paragraph(f"<b>{_safe(capture.get('filename') or 'Capture')}</b>", styles["Heading4"])
    return [KeepTogether([title, Spacer(1, 4), layout])]


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

    # Cover — operator's own uploaded logo (never a third-party logo) when enabled.
    company = branding.get("company_name") or "Thermal Inspection Report"
    if template.get("show_logo", True):
        logo_b64 = _fetch_logo_b64(branding.get("logo_url"))
        logo = _logo_flowable(logo_b64) if logo_b64 else None
        if logo is not None:
            story.append(logo)
            story.append(Spacer(1, 0.12 * inch))
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

    # Findings — layout-aware: detail (1/page), two_up (2/page), or compact grid.
    if _section_on(sections, "findings"):
        unit = _report_unit(session_meta)
        report_layout = template.get("layout") or "detail"
        ordered = _order_report_captures(captures, session_meta)
        by_id = {c.get("captureId"): c for c in captures if c.get("captureId")}
        share_url = session_meta.get("share_url") if isinstance(session_meta.get("share_url"), str) else None
        story.append(PageBreak())
        story.append(Paragraph("<b>Findings</b>", styles["Heading3"]))
        story.append(Spacer(1, 0.1 * inch))

        if report_layout == "compact":
            cards = [_compact_card(c, session_meta, standards, unit, styles) for c in ordered]
            rows = [cards[i : i + 2] for i in range(0, len(cards), 2)]
            if rows and len(rows[-1]) == 1:
                rows[-1].append([])  # pad last row to 2 cells
            grid = Table(rows, colWidths=[3.6 * inch, 3.6 * inch])
            grid.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]))
            story.append(grid)
        elif report_layout == "two_up":
            for idx, capture in enumerate(ordered):
                if idx > 0 and idx % 2 == 0:
                    story.append(PageBreak())
                story.extend(
                    _per_image_flowables(capture, by_id, session_meta, standards, unit, styles, image_w=2.4 * inch, share_url=share_url)
                )
                story.append(Spacer(1, 0.2 * inch))
        else:  # detail
            for idx, capture in enumerate(ordered):
                if idx > 0:
                    story.append(PageBreak())
                story.extend(
                    _per_image_flowables(capture, by_id, session_meta, standards, unit, styles, image_w=3.2 * inch, share_url=share_url)
                )

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
