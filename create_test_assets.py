import os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from PIL import Image

def create_pdf(filename, text):
    doc = SimpleDocTemplate(filename)
    styles = getSampleStyleSheet()
    story = [Paragraph("MediMind Clinical Lab Report", styles['Heading1']), Spacer(1, 10)]
    for line in text.split('\n'):
        if line.strip():
            story.append(Paragraph(line, styles['Normal']))
            story.append(Spacer(1, 5))
    doc.build(story)

def create_image(filename):
    img = Image.new('RGB', (300, 300), color = (240, 240, 240))
    img.save(filename)

if __name__ == '__main__':
    os.makedirs('test_assets', exist_ok=True)
    
    # Report 1
    report1_text = """
    Patient: Auditor
    Date: 2026-01-10
    Glucose: 125 mg/dL
    Cholesterol: 220 mg/dL
    Hemoglobin: 12.8 g/dL
    Creatinine: 1.1 mg/dL
    ALT: 48 U/L
    """
    create_pdf('test_assets/report_jan.pdf', report1_text)
    
    # Report 2
    report2_text = """
    Patient: Auditor
    Date: 2026-06-10
    Glucose: 110 mg/dL
    Cholesterol: 195 mg/dL
    Hemoglobin: 13.5 g/dL
    Creatinine: 0.9 mg/dL
    ALT: 32 U/L
    """
    create_pdf('test_assets/report_jun.pdf', report2_text)
    
    # Prescription image
    create_image('test_assets/prescription.png')
    
    # Scan image
    create_image('test_assets/scan.png')
    
    print("Test assets created successfully in './test_assets'")
