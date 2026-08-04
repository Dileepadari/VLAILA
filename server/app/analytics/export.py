"""CSV and PDF export for any dashboard view.

CSV uses the standard library. PDF uses reportlab when it is installed and
falls back to a minimal hand-built PDF otherwise, so `Export as PDF` is never a
button that errors -- it just produces a plainer document.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any


def to_csv(columns: list[str], rows: list[list[Any]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(columns)
    for row in rows:
        writer.writerow(["" if v is None else v for v in row])
    return buffer.getvalue().encode("utf-8")


def to_pdf(title: str, columns: list[str], rows: list[list[Any]], note: str = "") -> bytes:
    try:
        return _reportlab_pdf(title, columns, rows, note)
    except Exception:  # noqa: BLE001 - a plainer PDF beats a failed download
        return _minimal_pdf(title, columns, rows, note)


def _reportlab_pdf(title: str, columns: list[str], rows: list[list[Any]], note: str) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=landscape(A4), title=title, author="VLAILA"
    )
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Title"])]
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph(f"Virtual Labs AI Lab Assistant &middot; generated {stamp}", styles["Normal"]))
    if note:
        story.append(Spacer(1, 8))
        story.append(Paragraph(note, styles["Normal"]))
    story.append(Spacer(1, 16))

    data = [columns] + [["" if v is None else str(v) for v in r] for r in rows[:500]]
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B6493")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buffer.getvalue()


def _minimal_pdf(title: str, columns: list[str], rows: list[list[Any]], note: str) -> bytes:
    """A dependency-free PDF: one text line per row, monospaced."""
    lines = [title, note, "", " | ".join(columns), "-" * 78]
    for row in rows[:60]:
        lines.append(" | ".join("" if v is None else str(v) for v in row)[:110])

    def esc(s: str) -> str:
        return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")

    content = "BT /F1 9 Tf 40 800 Td 12 TL\n"
    content += "".join(f"({esc(line)}) Tj T*\n" for line in lines)
    content += "ET"
    stream = content.encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 842] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref_at = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF"
    ).encode()
    return bytes(out)
