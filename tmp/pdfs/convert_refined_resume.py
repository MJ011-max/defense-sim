from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas


workspace = Path(__file__).resolve().parents[2]
image_path = workspace / "output" / "munashe-jonga-cv-refined.png"
pdf_path = workspace / "output" / "pdf" / "munashe-jonga-cv-refined.pdf"
pdf_path.parent.mkdir(parents=True, exist_ok=True)

page_width, page_height = A4
image_width = page_height * 2 / 3
image_height = page_height
x = (page_width - image_width) / 2

canvas = Canvas(str(pdf_path), pagesize=A4, pageCompression=1)
canvas.setTitle("Munashe O. Jonga - Resume")
canvas.setAuthor("Munashe O. Jonga")
canvas.drawImage(ImageReader(str(image_path)), x, 0, width=image_width, height=image_height)
canvas.showPage()
canvas.save()

print(pdf_path)
