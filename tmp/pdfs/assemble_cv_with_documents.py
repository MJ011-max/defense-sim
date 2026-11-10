from pathlib import Path

from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.lib.pagesizes import A4


WORKSPACE = Path(__file__).resolve().parents[2]
CV = WORKSPACE / "output" / "pdf" / "munashe-onias-jonga-cv.pdf"
SCANS = [
    ("Degree Certificate", Path(r"C:\Users\MUNASHE\Pictures\Scans\Scan_20260824.pdf"), 0),
    ("Academic Transcript - Page 1", Path(r"C:\Users\MUNASHE\Pictures\Scans\Scan_20260824 (2).pdf"), 0),
    ("Academic Transcript - Page 2", Path(r"C:\Users\MUNASHE\Pictures\Scans\Scan_20260824 (3).pdf"), 180),
    ("Academic Transcript - Final Page", Path(r"C:\Users\MUNASHE\Pictures\Scans\Scan_20260824 (4).pdf"), 0),
]
OUTPUT = WORKSPACE / "output" / "pdf" / "munashe-onias-jonga-cv-with-documents.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def append_fitted_page(writer, source_path, rotation=0):
    reader = PdfReader(str(source_path))
    page = reader.pages[0]
    if rotation:
        page.rotate(rotation)
        page.transfer_rotation_to_content()

    source_width = float(page.mediabox.width)
    source_height = float(page.mediabox.height)
    target_width, target_height = A4
    margin = 24
    scale = min((target_width - 2 * margin) / source_width, (target_height - 2 * margin) / source_height)
    fitted_width = source_width * scale
    fitted_height = source_height * scale
    x = (target_width - fitted_width) / 2
    y = (target_height - fitted_height) / 2

    target = writer.add_blank_page(width=target_width, height=target_height)
    target.merge_transformed_page(page, Transformation().scale(scale).translate(x, y))


writer = PdfWriter()
cv_reader = PdfReader(str(CV))
writer.add_page(cv_reader.pages[0])
writer.add_outline_item("Curriculum Vitae", 0)

for index, (title, scan_path, rotation) in enumerate(SCANS, start=1):
    append_fitted_page(writer, scan_path, rotation)
    writer.add_outline_item(title, index)

writer.add_metadata({
    "/Title": "Munashe Onias Jonga - CV and Supporting Documents",
    "/Author": "Munashe Onias Jonga",
    "/Subject": "Curriculum Vitae with Degree Certificate and Academic Transcript",
})

with OUTPUT.open("wb") as file:
    writer.write(file)

print(OUTPUT)
