"""Deterministic synthetic fixtures only. Requires reportlab, pypdf, Pillow.
Run: python tests/integration/generate-pdf-fixtures.py
Independent strict pypdf validation/text checks are recorded in manifest.json.
"""
import hashlib
import io
import json
import os
from pathlib import Path

from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, ByteStringObject, DecodedStreamObject, NameObject

OUT = Path(os.environ.get("PDF_FIXTURE_DIRECTORY", "artifacts/local/04a/fixtures"))
OUT.mkdir(parents=True, exist_ok=True)


def document(pages):
    output = io.BytesIO()
    doc = canvas.Canvas(output, pagesize=(612, 792), invariant=1, pageCompression=1)
    for lines in pages:
        doc.setFont("Helvetica", 10)
        for i, text in enumerate(lines):
            doc.drawString(40, 750 - i * 16, text)
        doc.showPage()
    doc.save()
    return output.getvalue()


def exact_pdf(base, target):
    # Reachable, uncompressed custom stream BEFORE xref/EOF; /Length and offsets rebuilt.
    padding = target - len(base) - 300
    for _ in range(8):
        writer = PdfWriter(clone_from=io.BytesIO(base))
        stream = DecodedStreamObject()
        stream.set_data(b"P" * padding)
        writer._root_object[NameObject("/TD04aPadding")] = writer._add_object(stream)
        output = io.BytesIO()
        writer.write(output)
        data = output.getvalue()
        if len(data) == target:
            return data
        padding += target - len(data)
    raise AssertionError("Could not reach exact target")


fixtures = {}
multi = [[f"PAGE {p:02d} BEGIN marker", *[f"Page {p:02d} line {i:02d}: synthetic evidence value {p * 100 + i}." for i in range(1, 31)], f"PAGE {p:02d} FINAL marker"] for p in range(1, 13)]
fixtures["multi"] = (document(multi), multi, None)
empty = [["EMPTY TEST BEGIN"], [], ["EMPTY TEST FINAL"]]
fixtures["empty-page"] = (document(empty), empty, None)
boundary = [["BOUNDARY BEGIN", "BOUNDARY MIDDLE", "BOUNDARY FINAL"]]
small = document(boundary)
fixtures["small"] = (small, boundary, None)
fixtures["exact-25000000"] = (exact_pdf(small, 25_000_000), boundary, None)
fixtures["over-25000001"] = (exact_pdf(small, 25_000_001), boundary, "too_large")

output = io.BytesIO()
doc = canvas.Canvas(output, pagesize=(612, 792), invariant=1)
doc.drawImage(ImageReader(Image.new("RGB", (32, 32), (60, 140, 190))), 50, 600, 200, 200)
doc.showPage()
doc.save()
fixtures["image-only"] = (output.getvalue(), [[]], "no_text")

writer = PdfWriter(clone_from=io.BytesIO(small))
writer._ID = ArrayObject([ByteStringObject(b"04a-synthetic-id1"), ByteStringObject(b"04a-synthetic-id2")])
writer.encrypt("synthetic-password", owner_password="synthetic-owner", algorithm="RC4-128")
output = io.BytesIO()
writer.write(output)
fixtures["encrypted"] = (output.getvalue(), boundary, "encrypted")
writer = PdfWriter(clone_from=io.BytesIO(small))
writer._ID = ArrayObject([ByteStringObject(b"04a-synthetic-id1"), ByteStringObject(b"04a-synthetic-id2")])
writer.encrypt("", owner_password="synthetic-owner", algorithm="RC4-128")
output = io.BytesIO()
writer.write(output)
fixtures["encrypted-empty-password"] = (output.getvalue(), boundary, "encrypted")
fixtures["corrupt"] = (b"%PDF-1.7\nThis synthetic fixture has no valid PDF objects.\n%%EOF\n", None, "malformed")
fixtures["wrong-bytes"] = (b"This is synthetic plain text despite the .pdf filename.", None, "wrong_type")
fixtures["page-limit"] = (document([["PAGE LIMIT BEGIN"]] + [[]] * 500), None, "extraction_limit")
output = io.BytesIO()
doc = canvas.Canvas(output, pagesize=(612, 792), invariant=1, pageCompression=1)
for p in range(90):
    doc.setFont("Helvetica", 0.3)
    for line in range(25):
        doc.drawString(40, 750 - line * 16, "X" * 900)
    doc.showPage()
doc.save()
fixtures["text-limit"] = (output.getvalue(), None, "extraction_limit")

output = io.BytesIO()
doc = canvas.Canvas(output, pagesize=(612, 792), invariant=1)
doc.setFont("Helvetica", 11)
layout = [(40, 750, "LAYOUT BEGIN"), (40, 710, "LEFT ONE"), (40, 690, "LEFT TWO"),
          (330, 710, "RIGHT ONE"), (330, 690, "RIGHT TWO"),
          (40, 610, "Item"), (200, 610, "Count"), (40, 590, "Apples"), (200, 590, "7"),
          (40, 570, "Pears"), (200, 570, "9"), (40, 510, "LAYOUT FINAL")]
for x, y, value in layout:
    doc.drawString(x, y, value)
doc.showPage()
doc.save()
fixtures["layout-table"] = (output.getvalue(), [[value for _, _, value in layout]], None)

manifest = {"generator": "tests/integration/generate-pdf-fixtures.py", "fileLimitBytes": 25_000_000, "fixtures": []}
for name, (data, pages, error) in fixtures.items():
    target = OUT / f"{name}.pdf"
    target.write_bytes(data)
    item = {"name": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "expectedError": error,
            "expectedPages": pages, "expectedPageCount": len(pages) if pages else None}
    if name not in ("corrupt", "wrong-bytes"):
        reader = PdfReader(io.BytesIO(data), strict=True)
        item["encrypted"] = reader.is_encrypted
        if reader.is_encrypted:
            assert reader.decrypt("" if name == "encrypted-empty-password" else "synthetic-password")
        item["independentPageCount"] = len(reader.pages)
        texts = [page.extract_text() for page in reader.pages]
        item["independentTextCharacters"] = sum(len(text) for text in texts)
        if name == "text-limit":
            assert item["independentTextCharacters"] > 2_000_000
        if pages is not None:
            assert len(texts) == len(pages)
            for text, expected in zip(texts, pages):
                for line in expected:
                    assert line in text, (name, line)
        if name.startswith(("exact-", "over-")):
            assert len(reader.trailer["/Root"]["/TD04aPadding"].get_data()) > 24_000_000
            assert data.rstrip().endswith(b"%%EOF")
        item["independentValidation"] = "PASS: strict pypdf structure, page count, every expected line; decrypt where applicable"
    else:
        try:
            PdfReader(io.BytesIO(data), strict=True)
            raise AssertionError("Invalid fixture unexpectedly valid")
        except Exception as exc:
            if isinstance(exc, AssertionError):
                raise
            item["independentValidation"] = "PASS: strict pypdf rejects invalid fixture"
    manifest["fixtures"].append(item)
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps([{k: item[k] for k in ("name", "bytes", "sha256", "independentValidation")} for item in manifest["fixtures"]], indent=2))
