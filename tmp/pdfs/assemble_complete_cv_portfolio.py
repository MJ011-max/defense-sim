from pathlib import Path

from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.lib.pagesizes import A4


WORKSPACE = Path(__file__).resolve().parents[2]
BASE_PORTFOLIO = WORKSPACE / "output" / "pdf" / "munashe-onias-jonga-cv-with-documents.pdf"
CERTIFICATES = Path(r"C:\Users\MUNASHE\Downloads\Certificates.pdf")
IDENTITY_DOCUMENTS = Path(r"C:\Users\MUNASHE\Downloads\20260921_083906.pdf")
OUTPUT = WORKSPACE / "output" / "pdf" / "munashe-onias-jonga-complete-portfolio.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def append_fitted_page(writer, reader, page_index, rotation=0):
    """Add a source page to a centred A4 canvas without cropping it."""
    page = reader.pages[page_index]
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
base_reader = PdfReader(str(BASE_PORTFOLIO))
for page in base_reader.pages:
    writer.add_page(page)

outline_entries = [
    ("Curriculum Vitae", 0),
    ("University Degree Certificate", 1),
    ("Academic Transcript - Page 1", 2),
    ("Academic Transcript - Page 2", 3),
    ("Academic Transcript - Final Page", 4),
]

cert_reader = PdfReader(str(CERTIFICATES))
certificate_entries = [
    ("Ordinary Level Certificate - June 2017", 0, 0),
    ("Ordinary Level Certificate - November 2017", 1, 0),
    ("Ordinary Level Provisional Results", 2, 270),
    ("Advanced Level Statement of Results", 3, 0),
    ("National ID - Copy 1", 4, 0),
]
for offset, (title, index, rotation) in enumerate(certificate_entries, start=5):
    append_fitted_page(writer, cert_reader, index, rotation)
    outline_entries.append((title, offset))

identity_reader = PdfReader(str(IDENTITY_DOCUMENTS))
identity_entries = [
    ("Birth Certificate", 0, 180),
    ("National ID - Certified Copy", 1, 0),
]
for offset, (title, index, rotation) in enumerate(identity_entries, start=10):
    append_fitted_page(writer, identity_reader, index, rotation)
    outline_entries.append((title, offset))

for title, page_number in outline_entries:
    writer.add_outline_item(title, page_number)

writer.add_metadata({
    "/Title": "Munashe Onias Jonga - Complete CV Portfolio",
    "/Author": "Munashe Onias Jonga",
    "/Subject": "CV, academic records, certificates, and identity documents",
})

with OUTPUT.open("wb") as file:
    writer.write(file)

print(OUTPUT)
