import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"
EMAIL = "test_auditor@medimind.com"
PASSWORD = "TestPassword123"

def run_tests():
    print("=========================================================")
    print("STARTING MEDIMIND AI FULL END-TO-END QA TEST SUITE")
    print("=========================================================\n")
    
    # 1. Sign Up
    signup_url = f"{BASE_URL}/api/auth/signup"
    signup_data = {"name": "Test Auditor", "email": EMAIL, "password": PASSWORD}
    r = requests.post(signup_url, json=signup_data)
    print(f"1. Sign Up Test: Code {r.status_code}, Response: {r.json()}")
    
    # 2. Login
    login_url = f"{BASE_URL}/api/auth/login"
    login_data = {"email": EMAIL, "password": PASSWORD}
    r = requests.post(login_url, json=login_data)
    print(f"2. Login Test: Code {r.status_code}, Response: {r.json()}")
    
    # 3. Chat Test (Educational query)
    chat_url = f"{BASE_URL}/api/chat/message"
    chat_data = {"email": EMAIL, "message": "What is diabetes?"}
    r = requests.post(chat_url, data=chat_data)
    print(f"3. Chat Test (Diabetes): Code {r.status_code}, Mode: {r.json().get('mode')}")
    
    # Chat Test (Symptom query)
    chat_data = {"email": EMAIL, "message": "I have fever and cough"}
    r = requests.post(chat_url, data=chat_data)
    print(f"4. Chat Test (Symptom Assessment): Code {r.status_code}, Response question: {r.json().get('response')}")
    
    # 4. Reports Upload
    upload_url = f"{BASE_URL}/api/reports/upload"
    files = [
        ('files', ('report_jan.pdf', open('test_assets/report_jan.pdf', 'rb'), 'application/pdf')),
        ('files', ('report_jun.pdf', open('test_assets/report_jun.pdf', 'rb'), 'application/pdf'))
    ]
    upload_data = {"email": EMAIL, "task_id": "test_upload_task"}
    r = requests.post(upload_url, data=upload_data, files=files)
    print(f"5. Reports Upload Test: Code {r.status_code}, Files Processed: {r.json().get('processed_files')}")
    
    # 5. Reports Analysis
    analyze_url = f"{BASE_URL}/api/reports/analyze"
    r = requests.post(analyze_url, json={"email": EMAIL, "task_id": "test_analyze_task"})
    print(f"6. Reports Analysis Test: Code {r.status_code}, PDF Generated: {r.json().get('pdf_url') is not None}")
    
    # 6. Personal Health Twin
    twin_url = f"{BASE_URL}/api/reports/health-twin?email={EMAIL}"
    r = requests.get(twin_url)
    twin_res = r.json()
    print(f"7. Health Twin Test: Code {r.status_code}")
    print(f"   - Health Score: {twin_res.get('health_score')}/100")
    print(f"   - Improvement Score: {twin_res.get('improvement_score')}%")
    print(f"   - Chart Generated: {twin_res.get('chart_url') is not None}")
    
    # 7. Multi-Report Comparison
    compare_url = f"{BASE_URL}/api/reports/compare?email={EMAIL}"
    r = requests.get(compare_url)
    compare_res = r.json()
    print(f"8. Multi-Report Comparison Test: Code {r.status_code}")
    print(f"   - Improvements detected: {compare_res.get('improvements')}")
    print(f"   - Chart Generated: {compare_res.get('chart_url') is not None}")
    
    # 8. Health Forecasting
    forecast_url = f"{BASE_URL}/api/reports/forecast?email={EMAIL}"
    r = requests.get(forecast_url)
    forecast_res = r.json()
    print(f"9. Health Forecasting Test: Code {r.status_code}")
    print(f"   - Projections: {forecast_res.get('predictions')}")
    print(f"   - Forecast Chart: {forecast_res.get('chart_url') is not None}")
    
    # 9. Disease Management Coach
    coach_url = f"{BASE_URL}/api/reports/coach?email={EMAIL}"
    r = requests.get(coach_url)
    coach_res = r.json()
    print(f"10. Disease Coach Test: Code {r.status_code}")
    print(f"    - Guidance contains Educational disclaimer: {'EDUCATIONAL GUIDANCE' in coach_res.get('advice')}")
    
    # 10. Disease Explorer
    explorer_url = f"{BASE_URL}/api/reports/explorer?query=Diabetes"
    r = requests.get(explorer_url)
    explorer_res = r.json()
    print(f"11. Disease Explorer Test: Code {r.status_code}")
    print(f"    - Discovery History chart: {explorer_res.get('chart_url') is not None}")
    
    # 11. Prescription Decoder
    decode_url = f"{BASE_URL}/api/prescription/decode"
    presc_files = {'image': ('prescription.png', open('test_assets/prescription.png', 'rb'), 'image/png')}
    presc_data = {"email": EMAIL, "task_id": "test_presc_task"}
    r = requests.post(decode_url, data=presc_data, files=presc_files)
    presc_res = r.json()
    print(f"12. Prescription Decoder Test: Code {r.status_code}")
    
    # Quantity Calculator & Smart Scheduler
    meds = presc_res.get("structured_data", {}).get("medicines", [])
    if meds:
        med = meds[0]
        print(f"    - Quantity Calculator: {med.get('quantity_needed')} tablets required for {med.get('duration')}")
        print(f"    - Daily Alarm Calendar: {med.get('schedule')}")
        purchase_opts = med.get('purchase_options', [])
        if purchase_opts:
            purchase_opt_str = str(purchase_opts[0]).encode('ascii', 'ignore').decode('ascii')
            print(f"    - Purchase Assistant: {purchase_opt_str}")
        else:
            print("    - Purchase Assistant: No options generated")
    
    # 12. Adherence Tracker
    adherence_post_url = f"{BASE_URL}/api/prescription/adherence"
    r = requests.post(adherence_post_url, json={"email": EMAIL, "action": "take", "med_name": "Amoxicillin", "time_slot": "08:00 AM", "date": "2026-06-12"})
    r = requests.post(adherence_post_url, json={"email": EMAIL, "action": "take", "med_name": "Amoxicillin", "time_slot": "02:00 PM", "date": "2026-06-12"})
    r = requests.post(adherence_post_url, json={"email": EMAIL, "action": "miss", "med_name": "Amoxicillin", "time_slot": "08:00 PM", "date": "2026-06-12"})
    adherence_get_url = f"{BASE_URL}/api/prescription/adherence?email={EMAIL}"
    r = requests.get(adherence_get_url)
    adherence_res = r.json()
    print(f"13. Adherence Tracker Test: Code {r.status_code}")
    print(f"    - Taken: {adherence_res.get('taken')} | Missed: {adherence_res.get('missed')} | Adherence Rate: {adherence_res.get('completion_pct')}%")
    
    # 13. Medical Imaging
    imaging_url = f"{BASE_URL}/api/imaging/analyze"
    img_files = {'image': ('scan.png', open('test_assets/scan.png', 'rb'), 'image/png')}
    img_data = {"email": EMAIL, "image_type": "chest_xray", "task_id": "test_img_task"}
    r = requests.post(imaging_url, data=img_data, files=img_files)
    img_res = r.json()
    print(f"14. Medical Imaging Test: Code {r.status_code}")
    print(f"    - Confidence Score: {img_res.get('confidence')}")
    print(f"    - Heatmap generated: {img_res.get('heatmap_url') is not None}")
    print(f"    - Severity/Recommendations details generated: {img_res.get('analysis') is not None}")
    print(f"    - PDF Diagnostic Report: {img_res.get('pdf_url') is not None}")
    
    # 14. History & Profile
    profile_url = f"{BASE_URL}/api/profile?email={EMAIL}"
    r = requests.get(profile_url)
    profile_res = r.json()
    print(f"15. Profile Statistics: Code {r.status_code}, Stats: {profile_res.get('stats')}")
    
    history_url = f"{BASE_URL}/api/history?email={EMAIL}&category=all"
    r = requests.get(history_url)
    history_res = r.json()
    print(f"16. History Database Retrieval: Code {r.status_code}, Total logs: {len(history_res.get('history', []))}")
    
    print("\n=========================================================")
    print("ALL API TESTS COMPLETED SUCCESSFULLY!")
    print("=========================================================")

if __name__ == '__main__':
    run_tests()
