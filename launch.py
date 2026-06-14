import os
import subprocess
import sys

# Configure environment variables to limit thread counts and prevent OpenBLAS memory errors
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

REQUIRED_LIBS = [
    "fastapi",
    "uvicorn",
    "python-multipart",
    "pymupdf",
    "faiss-cpu",
    "sentence-transformers",
    "groq",
    "reportlab",
    "matplotlib",
    "pandas",
    "numpy",
    "easyocr",
    "opencv-python-headless",
    "Pillow",
    "torch",
    "torchvision",
    "pillow-heif"
]

def install_and_run():
    print("=" * 60)
    print("MEDIMIND AI v4.0 - RESILIENT DEPENDENCY LAUNCHER")
    print("=" * 60)
    
    # 1. Check and install missing libraries
    for lib in REQUIRED_LIBS:
        try:
            import_name = lib
            if lib == "pymupdf":
                import_name = "fitz"
            elif lib == "faiss-cpu":
                import_name = "faiss"
            elif lib == "python-multipart":
                import_name = "multipart"
            elif lib == "opencv-python-headless":
                import_name = "cv2"
            
            __import__(import_name)
            print(f"[OK] {lib} is installed.")
        except Exception as e:
            print(f"[!] {lib} import check encountered error: {e}. Attempting install...")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", lib])
                print(f"[OK] Successfully installed {lib}.")
            except Exception as ins_err:
                print(f"[ERROR] Failed to install {lib}: {ins_err}")
                
    print("\nAll dependencies checked.")
    print("=" * 60)
    print("LAUNCHING FASTAPI WEB SERVER")
    print("Access your premium app at: http://localhost:8000")
    print("=" * 60)
    
    # 2. Launch FastAPI using Uvicorn
    import uvicorn
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    install_and_run()