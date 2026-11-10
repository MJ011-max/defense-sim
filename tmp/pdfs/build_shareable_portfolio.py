from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas


WORKSPACE = Path(__file__).resolve().parents[2]
IMAGE_DIR = WORKSPACE / "tmp" / "pdfs"
OUTPUT = WORKSPACE / "output" / "pdf" / "munashe-onias-jonga-complete-portfolio-shareable.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_LABELS = [
    "Curriculum Vitae",
    "University Degree Certificate",
    "Academic Transcript - Page 1",
    "Academic Transcript - Page 2",
    "Academic Transcript - Final Page",
    "Ordinary Level Certificate - June 2017",
    "Ordinary Level Certificate - November 2017",
    "Ordinary Level Provisional Results",
    "Advanced Level Statement of Results",
    "National ID - Copy 1",
    "Birth Certificate",
    "National ID - Certified Copy",
]
IMAGES = [IMAGE_DIR / f"shareable-150-{page:02}.jpg" for page in range(1, 13)]

if not all(image.exists() for image in IMAGES):
    missing = [str(image) for image in IMAGES if not image.exists()]
    raise FileNotFoundError(f"Missing rendered pages: {missing}")

page_width, page_height = A4
canvas = Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
canvas.setTitle("Munashe Onias Jonga - Complete CV Portfolio (Shareable)")
canvas.setAuthor("Munashe Onias Jonga")
canvas.setSubject("Compressed sharing copy of CV, academic records, certificates, and identity documents")

for index, (image_path, label) in enumerate(zip(IMAGES, PAGE_LABELS), start=1):
    bookmark = f"page-{index}"
    canvas.bookmarkPage(bookmark)
    canvas.addOutlineEntry(label, bookmark, level=0, closed=False)
    canvas.drawImage(ImageReader(str(image_path)), 0, 0, width=page_width, height=page_height)
    canvas.showPage()

canvas.save()
print(OUTPUT)
