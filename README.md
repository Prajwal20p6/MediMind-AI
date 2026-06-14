# MediMind AI v4.0 - Premium Intelligent Healthcare Platform

MediMind AI is an advanced, production-grade intelligent healthcare companion that provides a unified, interactive suite of patient-empowerment and clinical assistance tools. It integrates multi-modal AI capabilities to analyze medical reports, decode prescriptions, visualize medical scans (using Grad-CAM), and answer general medical inquiries with built-in safety rails and intent classification.

---

## 🌟 Key Features

### 💬 1. Unified Intelligence & Chat
*   **Intent Classifier**: Dynamically distinguishes between general medical knowledge queries and active symptom reports to route conversation appropriately.
*   **Symptom Assessment**: A structured, step-by-step diagnostic dialog that avoids premature advice and collects patient age, duration, severity, and secondary symptoms before rendering a clinical guide.
*   **Medical Report RAG (Retrieval-Augmented Generation)**: Uses Faiss vector databases and sentence-transformers to query loaded medical records for context-specific answers.

### 📄 2. Document Intelligence (Multi-Report Analysis)
*   **Multi-Report Upload**: Supports uploading and analyzing up to three clinical reports simultaneously.
*   **Visual Historical Comparison**: Evaluates changes in key biomarkers across multiple visits/dates, rendering a comparison chart showing improvements or declines.
*   **Health Twin Generation**: Projects a personalized digital health score out of 100 with tailored improvement recommendations.
*   **Biomarker Forecasting**: Predicts future values for markers (e.g., Blood Sugar, Cholesterol, Creatinine) at 3 and 6-month horizons.
*   **Disease Coach & Explorer**: Offers lifestyle recommendations, dietary advice, and interactive tools for tracking disease progress.

### 💊 3. Prescription Decoder
*   **EasyOCR Extraction**: Decodes scanned or photographed prescription sheets using local optical character recognition.
*   **Smart Adherence Calendar**: Automatically maps extracted dosages into daily alarm lists and schedule tracking.
*   **Cost Calculator & Purchase Assistant**: Auto-calculates the quantity required for a treatment cycle and redirects to purchase pages (e.g., Tata 1mg) with cost estimations.

### 🩻 4. Medical Imaging (Modality Auto-Detection & Grad-CAM)
*   **Zero-Selection Analysis**: Eliminates manual scan modality configuration; the system automatically detects organs and scan types (e.g., Brain MRI, Chest X-ray) internally.
*   **Grad-CAM Heatmaps**: Uses a ResNet18 backbone to overlay visual heatmaps on scanned images, highlighting suspicious target regions.
*   **Diagnostic Report Export**: Builds and downloads detailed, letter-sized PDF diagnostic reports containing the scan image, heatmap, confidence scores, and clinical recommendations.

---

## 🛠️ Tech Stack

*   **Backend Framework**: FastAPI (Python)
*   **LLM Integration**: Groq SDK (`llama-3.1-8b-instant`)
*   **Vector Database**: FAISS (Facebook AI Similarity Search)
*   **Embeddings**: SentenceTransformers (`all-MiniLM-L6-v2`)
*   **Computer Vision**: PyTorch (ResNet18), OpenCV, EasyOCR, Pillow (PIL)
*   **Document Generation**: PyMuPDF (Fitz), ReportLab
*   **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism design, responsive layouts, horizontal-scrolling tab system), Vanilla JavaScript (ES6+)

---

## 📸 Screenshots

Here is a preview of the MediMind AI interface:

| Dashboard & Interface | Medical Imaging & Heatmaps |
|:---:|:---:|
| ![Dashboard](screenshots/Screenshot%202026-06-14%20130612.png) | ![Imaging](screenshots/Screenshot%202026-06-14%20131632.png) |

| Document Intelligence & Comparison | Chat & Symptom Assessment |
|:---:|:---:|
| ![Document Intelligence](screenshots/Screenshot%202026-06-14%20131728.png) | ![Chat](screenshots/Screenshot%202026-06-14%20132407.png) |

---

## ⚙️ Installation Guide

### Prerequisites
*   Python 3.9 or higher
*   Git

### Steps

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Prajwal20p6/MediMind-AI.git
    cd MediMind-AI
    ```

2.  **Install Required Dependencies**:
    ```bash
    pip install -r requirements.txt
    # Alternatively, install packages individually:
    pip install fastapi uvicorn python-multipart pymupdf faiss-cpu sentence-transformers groq reportlab matplotlib pandas numpy easyocr opencv-python-headless Pillow torchvision pillow-heif
    ```

3.  **Environment Configuration**:
    *   Create a `.env` file in the root directory (based on `.env.example`):
        ```env
        GROQ_API_KEY=your_groq_api_key_here
        ```

---

## 🚀 Usage Instructions

### Starting the Server
Run the startup script:
```bash
python launch.py
```
Or launch FastAPI directly:
```bash
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser and navigate to `http://localhost:8000` to interact with the web interface.

### Running the E2E Test Suite
To verify backend routing, authentication, report extraction, and model inference:
```bash
python run_api_tests.py
```

---

## 📁 Project Structure

```
MediMind_AI_v4/
├── static/                    # Frontend files
│   ├── index.html             # Main web dashboard
│   ├── script.js              # Application logic and API interactions
│   ├── style.css              # Custom styling (glassmorphism UI)
│   └── output/                # Generated reports & intermediate assets
├── screenshots/               # Interface preview images
├── app.py                     # Main FastAPI backend application
├── launch.py                  # Server entrypoint helper
├── run_api_tests.py           # Automated end-to-end API verification suite
├── db.json                    # Flat file user/session database
├── .env                       # Environment secrets (ignored)
├── .env.example               # Template environment configuration
├── .gitignore                 # Files excluded from git
└── README.md                  # Project documentation
```

---

## 🔮 Future Enhancements
*   **Federated Patient Records**: Secure integration with HL7/FHIR-compliant electronic health records.
*   **Deep Learning Segmentation**: Adding U-Net models for pixel-level boundary segmentation of visual tumors or anomalies.
*   **Offline Mode**: Integrating quantized ONNX LLMs to allow patient assessments directly in offline clinics.

---

## 📄 License
This project is licensed under the MIT License. See `LICENSE` for details.
