from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph


WORKSPACE = Path(__file__).resolve().parents[2]
OUTPUT = WORKSPACE / "output" / "pdf" / "munashe-onias-jonga-cv.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_WIDTH, PAGE_HEIGHT = A4
NAVY = colors.HexColor("#123E72")
BLUE = colors.HexColor("#1F568F")
PALE_BLUE = colors.HexColor("#EAF0F7")
LIGHT_GREY = colors.HexColor("#F4F6F8")
INK = colors.HexColor("#18212B")
MUTED = colors.HexColor("#51606E")
LINE = colors.HexColor("#A9BED8")


def paragraph(canvas, text, style, x, y_top, width):
    """Draw a ReportLab paragraph from its top edge and return the next y."""
    item = Paragraph(text, style)
    _, height = item.wrap(width, 1000)
    item.drawOn(canvas, x, y_top - height)
    return y_top - height


def line(canvas, x1, y, x2, color=LINE, thickness=0.7):
    canvas.setStrokeColor(color)
    canvas.setLineWidth(thickness)
    canvas.line(x1, y, x2, y)


def main_heading(canvas, label, x, y, width):
    canvas.setFillColor(NAVY)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawString(x, y, label.upper())
    line(canvas, x, y - 5, x + width, BLUE, 1)
    return y - 17


def sidebar_heading(canvas, label, x, y, width):
    canvas.setFillColor(NAVY)
    canvas.roundRect(x, y - 21, width, 21, 3, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9.5)
    canvas.drawString(x + 10, y - 14, label.upper())
    return y - 31


def bullet_list(canvas, items, x, y, width, style):
    for item in items:
        y = paragraph(canvas, f'<font color="#1F568F">&#8226;</font>&nbsp;&nbsp;{item}', style, x, y, width)
        y -= 5
    return y


canvas = Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
canvas.setTitle("Munashe Onias Jonga - Curriculum Vitae")
canvas.setAuthor("Munashe Onias Jonga")
canvas.setSubject("Curriculum Vitae")

# Header
header_height = 65 * mm
canvas.setFillColor(NAVY)
canvas.rect(0, PAGE_HEIGHT - header_height, PAGE_WIDTH, header_height, fill=1, stroke=0)
canvas.setFillColor(colors.white)
canvas.setFont("Helvetica-Bold", 24)
canvas.drawString(22 * mm, PAGE_HEIGHT - 30 * mm, "MUNASHE ONIAS JONGA")
canvas.setFont("Helvetica-Bold", 10.5)
canvas.setFillColor(colors.HexColor("#DCEBFA"))
canvas.drawString(22 * mm, PAGE_HEIGHT - 39 * mm, "DATA SCIENCE AND INFORMATICS GRADUATE")

canvas.setFont("Helvetica", 8.7)
canvas.setFillColor(colors.white)
contact = "Harare, Zimbabwe   |   +263 778 925 018   |   munashejonga1234@gmail.com"
canvas.drawString(22 * mm, PAGE_HEIGHT - 51 * mm, contact)
canvas.setStrokeColor(colors.HexColor("#7EA5D2"))
canvas.setLineWidth(1.1)
canvas.line(22 * mm, PAGE_HEIGHT - 56 * mm, PAGE_WIDTH - 22 * mm, PAGE_HEIGHT - 56 * mm)

# Body background and columns
margin = 14 * mm
body_top = PAGE_HEIGHT - header_height - 10 * mm
body_bottom = 13 * mm
sidebar_x = margin
sidebar_width = 48 * mm
gutter = 8 * mm
main_x = sidebar_x + sidebar_width + gutter
main_width = PAGE_WIDTH - margin - main_x

canvas.setFillColor(LIGHT_GREY)
canvas.roundRect(sidebar_x, body_bottom, sidebar_width, body_top - body_bottom, 3, fill=1, stroke=0)

main_body = ParagraphStyle(
    "main_body", fontName="Helvetica", fontSize=8.9, leading=12.3, textColor=INK,
    alignment=TA_LEFT,
)
main_small = ParagraphStyle(
    "main_small", fontName="Helvetica", fontSize=8.4, leading=11.3, textColor=INK,
)
main_bullet = ParagraphStyle(
    "main_bullet", parent=main_body, leftIndent=0, firstLineIndent=0,
)
degree = ParagraphStyle(
    "degree", fontName="Helvetica-Bold", fontSize=10.4, leading=13, textColor=NAVY,
)
sidebar_body = ParagraphStyle(
    "sidebar_body", fontName="Helvetica", fontSize=8.4, leading=11.3, textColor=INK,
)
sidebar_small = ParagraphStyle(
    "sidebar_small", fontName="Helvetica", fontSize=8.1, leading=10.8, textColor=INK,
)

# Sidebar
side_y = body_top - 4
side_pad = 7 * mm
side_y = sidebar_heading(canvas, "Core Skills", sidebar_x, side_y, sidebar_width)
side_y = bullet_list(canvas, [
    "Database management and SQL",
    "Analytical troubleshooting",
    "Cybersecurity awareness",
    "Networking and infrastructure support",
    "Systems development and implementation",
    "Technical documentation and reporting",
    "Software engineering support",
], sidebar_x + side_pad, side_y, sidebar_width - 2 * side_pad, sidebar_body)

side_y -= 8
side_y = sidebar_heading(canvas, "Certificates", sidebar_x, side_y, sidebar_width)
side_y = bullet_list(canvas, [
    "IT Essentials (November 2024)",
    "Project Management (February 2023)",
], sidebar_x + side_pad, side_y, sidebar_width - 2 * side_pad, sidebar_body)

side_y -= 8
side_y = sidebar_heading(canvas, "Languages", sidebar_x, side_y, sidebar_width)
side_y = bullet_list(canvas, ["English", "Shona", "Ndebele"], sidebar_x + side_pad, side_y, sidebar_width - 2 * side_pad, sidebar_body)

side_y -= 8
side_y = sidebar_heading(canvas, "Academic Focus", sidebar_x, side_y, sidebar_width)
side_y = paragraph(canvas, "<b>Research focus</b><br/>Time Series Analytics", sidebar_small, sidebar_x + side_pad, side_y, sidebar_width - 2 * side_pad)
side_y -= 8
side_y = paragraph(canvas, "<b>Degree classification</b><br/>Upper Second Class (2.1)", sidebar_small, sidebar_x + side_pad, side_y, sidebar_width - 2 * side_pad)

# Main content
y = body_top - 3
y = main_heading(canvas, "Professional Profile", main_x, y, main_width)
y = paragraph(
    canvas,
    "Data Science and Informatics graduate with an Upper Second Class (2.1) degree and hands-on experience in IT support, database management, ERP deployment, and systems monitoring. Brings a strong foundation in data-driven systems, analytical troubleshooting, networking, cybersecurity awareness, and technical documentation.",
    main_body, main_x, y, main_width,
)
y -= 13

y = main_heading(canvas, "Education", main_x, y, main_width)
y = paragraph(canvas, "Bachelor of Science (Honours) in Data Science and Informatics", degree, main_x, y, main_width)
y = paragraph(canvas, "<b>University of Zimbabwe</b>, Faculty of Computer Engineering, Informatics and Communications", main_small, main_x, y - 2, main_width)
y = paragraph(canvas, "August 2022 - June 2026 &nbsp; | &nbsp; Awarded 1 July 2026 &nbsp; | &nbsp; Upper Second Class (2.1)", main_small, main_x, y - 2, main_width)
y = paragraph(canvas, "<b>Final-year project:</b> A Multilayered Model for Concept Drift-Resilient Keystroke Dynamics Authentication", main_small, main_x, y - 4, main_width)
y = paragraph(canvas, "<b>Relevant coursework:</b> Data Structures and Algorithms, Databases, Operating Systems, Web Technologies, Discrete Mathematics, Calculus, Data Mining, Machine Learning, and Software Engineering.", main_small, main_x, y - 4, main_width)
y -= 13

y = main_heading(canvas, "Professional Experience", main_x, y, main_width)
y = paragraph(canvas, "IT Intern", degree, main_x, y, main_width)
y = paragraph(canvas, "<b>Zimbabwe Data Center, Ministry of Information and Communication Technology, Zimbabwe</b><br/>Harare | August 2024 - July 2025", main_small, main_x, y - 1, main_width)
y -= 3
y = bullet_list(canvas, [
    "Supported database management, ERP deployment, network infrastructure, and security activities.",
    "Managed system monitoring, technical support, and protocol documentation to help maintain organisational continuity.",
], main_x, y, main_width, main_bullet)
y -= 6

y = main_heading(canvas, "Additional Information", main_x, y, main_width)
y = paragraph(canvas, "<b>Research focus:</b> Time Series Analytics &nbsp; | &nbsp; <b>References:</b> Available on request", main_small, main_x, y, main_width)

# Footer
footer_y = 8 * mm
line(canvas, margin, footer_y + 7, PAGE_WIDTH - margin, LINE, 0.6)
canvas.setFont("Helvetica", 7.3)
canvas.setFillColor(MUTED)
canvas.drawString(margin, footer_y, "Curriculum Vitae - Munashe Onias Jonga")
page_text = "Page 1 of 1"
canvas.drawRightString(PAGE_WIDTH - margin, footer_y, page_text)

canvas.showPage()
canvas.save()
print(OUTPUT)
