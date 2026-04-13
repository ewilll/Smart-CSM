from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load Smart-CSM/.env (parent of server_ai/) for HTTPSMS + Gmail keys
_env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(_env_path)
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Optional
import math
import random
from fastapi import Header, Depends, status
import csv
from datetime import datetime
from model_trainer import train_model
import json
from notify_routes import create_notify_router
from delivery_bootstrap import try_bootstrap_delivery_logs

# Security: set CSM_API_SECRET in .env (must match frontend X-CSM-Secret)
API_SECRET_KEY = os.getenv("CSM_API_SECRET", "csm_secure_ai_access_2024")

app = FastAPI(title="Smart_CSM Local AI")


@app.on_event("startup")
async def _bootstrap_delivery_logs_table() -> None:
    await try_bootstrap_delivery_logs()

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained model
MODEL_PATH = 'water_intent_model.joblib'
model = None

def load_ai_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print("AI Model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
            model = None
    else:
        print(f"Model file '{MODEL_PATH}' not found. AI features will run in fallback mode.")
        model = None

# Security Dependency
async def verify_secret(x_csm_secret: str = Header(None)):
    if x_csm_secret != API_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized access: Invalid or missing CSM Secret Key."
        )
    return x_csm_secret

load_ai_model()

app.include_router(create_notify_router(verify_secret))

class UserMessage(BaseModel):
    message: str

class DuplicateCheckRequest(BaseModel):
    text: str
    lat: float
    lng: float
    existing_incidents: List[dict]

class ClassificationRequest(BaseModel):
    text: str

# Global configuration state
SETTINGS_PATH = os.path.join(os.path.dirname(__file__), 'settings.json')
CONFIG = {}
RESPONSES = {}
SUGGESTED_ACTIONS = {}
MALAYBALAY_BARANGAYS = []

def load_system_config():
    global CONFIG, RESPONSES, SUGGESTED_ACTIONS, MALAYBALAY_BARANGAYS
    try:
        if os.path.exists(SETTINGS_PATH):
            with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
                CONFIG = json.load(f)
                RESPONSES = CONFIG.get("RESPONSES", {})
                SUGGESTED_ACTIONS = CONFIG.get("SUGGESTED_ACTIONS", {})
                MALAYBALAY_BARANGAYS = CONFIG.get("MALAYBALAY_BARANGAYS", [])
                print("System configuration loaded from settings.json")
        else:
            print(f"Warning: {SETTINGS_PATH} not found. Using empty defaults.")
    except Exception as e:
        print(f"Error loading settings.json: {e}")

# Initial load
load_system_config()

def check_malaybalay_context(text: str):
    """
    Checks if the user is talking about a location.
    If they are, ensures it is within Malaybalay.
    Returns (is_valid, matched_barangay)
    """
    text_lower = text.lower()
    
    # Common nearby cities to specifically trap
    nearby_cities = ["valencia", "maramag", "quezon", "don carlos", "manolo fortich", "lantapan", "musuan", "bukidnon state university"]
    if any(city in text_lower for city in nearby_cities if city != "malaybalay"):
         # If they mention a nearby city but NOT malaybalay, it's likely out of area
         if "malaybalay" not in text_lower:
             return False, None
             
    # If they mention a specific barangay that IS in our list, we're good
    for b in MALAYBALAY_BARANGAYS:
        if b.lower() in text_lower:
            return True, b
            
    # If they don't mention a location at all, we assume they are local or asking a general question
    # We only block if they mention a location that ISN'T in our city.
    return True, None

def haversine(lat1, lon1, lat2, lon2):
    # Distance between points in meters
    R = 6371000 # Radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

@app.get("/")
def read_root():
    return {"status": "online", "model_loaded": model is not None}

@app.post("/chat", dependencies=[Depends(verify_secret)])
async def chat(user_msg: UserMessage):
    if model is None:
        # Fallback to keyword matching if model is missing
        msg = user_msg.message.lower()
        if any(w in msg for w in ["bill", "amount", "pay"]):
            return {"response": random.choice(RESPONSES["check_bill"]), "intent": "check_bill", "fallback": True}
        if any(w in msg for w in ["leak", "burst", "water"]):
            return {"response": random.choice(RESPONSES["report_leak"]), "intent": "report_leak", "fallback": True}
        return {"response": random.choice(RESPONSES["greeting"]), "intent": "greeting", "fallback": True}
    
    try:
        # Malaybalay Boundary Check
        is_valid_loc, match = check_malaybalay_context(user_msg.message)
        if not is_valid_loc:
            return {"response": RESPONSES["out_of_area"], "intent": "unknown", "geofenced": True}

        # Phase 5: Mahoraga Adaptation Loop (Self-Learning)
        # Get prediction probabilities
        probs = model.predict_proba([user_msg.message])
        max_prob = np.max(probs)
        prediction = model.predict([user_msg.message])
        intent = prediction[0]

        # If confidence is too low, log it for future adaptation
        CONFIDENCE_THRESHOLD = 0.35 
        if max_prob < CONFIDENCE_THRESHOLD:
            # Log to unclassified_queries.csv
            log_path = os.path.join(os.path.dirname(__file__), 'unclassified_queries.csv')
            file_exists = os.path.isfile(log_path)
            with open(log_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow(['text', 'timestamp'])
                writer.writerow([user_msg.message, datetime.now().isoformat()])
            intent = "unknown" # Force unknown treatment
        
        # Select random variation for the intent
        variations = RESPONSES.get(intent, RESPONSES["unknown"])
        response = random.choice(variations) if isinstance(variations, list) else variations
        
        # Phase 4: Deep Linking mapped to intents
        DEEP_LINKS = {
            "report_leak": "/report-incident",
            "check_bill": "/bills",
            "no_supply": "/report-incident",
            "payment_methods": "/bills",
            "water_quality": "/report-incident",
            "bill_dispute": "/bills",
            "high_consumption": "/bills",
            "meter_issues": "/report-incident",
            "reach_admin": "/messages"
        }
        
        target_link = DEEP_LINKS.get(intent)
        if target_link:
            response += f" [LINK:{target_link}]"
        
        # Get suggested next steps for interactivity
        next_steps = SUGGESTED_ACTIONS.get(intent, SUGGESTED_ACTIONS["default"])
        
        return {
            "response": response, 
            "intent": intent, 
            "next_steps": next_steps,
            "smart_score": float(max_prob) # Return real confidence score
        }
    except Exception as e:
        print(f"Chat Prediction Error: {e}")
        return {"response": RESPONSES["unknown"], "intent": "unknown", "error": True}

@app.get("/unclassified", dependencies=[Depends(verify_secret)])
async def get_unclassified():
    log_path = os.path.join(os.path.dirname(__file__), 'unclassified_queries.csv')
    if not os.path.exists(log_path):
        return {"queries": []}
    
    queries = []
    with open(log_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            queries.append(row)
    return {"queries": queries}

class AdaptationRequest(BaseModel):
    text: str
    intent: str

@app.post("/adapt", dependencies=[Depends(verify_secret)])
async def adapt_query(req: AdaptationRequest):
    # 1. Add to main dataset
    dataset_path = os.path.join(os.path.dirname(__file__), 'dataset.csv')
    with open(dataset_path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([req.text.lower(), req.intent])
    
    # 2. Remove from unclassified (simplified: rewrite without the specific text)
    log_path = os.path.join(os.path.dirname(__file__), 'unclassified_queries.csv')
    remaining = []
    if os.path.exists(log_path):
        with open(log_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['text'] != req.text:
                    remaining.append(row)
        
        with open(log_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['text', 'timestamp'])
            writer.writeheader()
            writer.writerows(remaining)

    return {"status": "success", "message": f"Successfully learned: {req.text} as {req.intent}"}

@app.post("/retrain", dependencies=[Depends(verify_secret)])
async def trigger_retrain():
    try:
        train_model()
        # Reload the model in memory
        global model
        model = joblib.load(MODEL_PATH)
        return {"status": "success", "message": "Model retrained and reloaded successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/config", dependencies=[Depends(verify_secret)])
async def get_config():
    return CONFIG

@app.post("/update-config", dependencies=[Depends(verify_secret)])
async def update_config(new_config: dict):
    try:
        with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
            json.dump(new_config, f, indent=4)
        load_system_config()
        return {"status": "success", "message": "Configuration updated successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/classify", dependencies=[Depends(verify_secret)])
async def classify_text(req: ClassificationRequest):
    # Mapping for Malaybalay specific context
    type_mapping = {
        "report_leak": "Pipe Leakage",
        "no_supply": "No Water Supply",
        "water_quality": "Contaminated Water",
        "meter_issues": "Broken Water Meter",
        "illegal_connections": "Illegal Tapping / Water Theft"
    }

    if model is None:
        return {"type": "Other / Maintenance", "severity": "Medium", "fallback": True}
    
    try:
        # Malaybalay Boundary Check
        is_valid_loc, match = check_malaybalay_context(req.text)
        if not is_valid_loc:
            return {"type": "Out of Area", "severity": "Low", "geofenced": True, "error": "Location outside Malaybalay City"}

        prediction = model.predict([req.text])
        intent = prediction[0]
        
        # Heuristic for severity based on impact
        severity = "Medium"
        high_impact_words = ["flood", "burst", "massive", "gushing", "emergency", "stolen", "danger", "hospital", "school"]
        major_intents = ["report_leak", "no_supply", "water_quality"]
        
        if any(word in req.text.lower() for word in high_impact_words):
            severity = "High"
        elif intent in major_intents:
            severity = "Medium"
        else:
            severity = "Low"
        
        return {
            "type": type_mapping.get(intent, "Other / Maintenance"),
            "severity": severity,
            "intent": intent
        }
    except Exception as e:
        return {"type": "Other / Maintenance", "severity": "Medium", "error": str(e)}

@app.post("/check-duplicate", dependencies=[Depends(verify_secret)])
async def check_duplicate(reqBody: DuplicateCheckRequest):
    if not reqBody.existing_incidents or model is None:
        return {"is_duplicate": False}

    try:
        # 1. Spatial Filtering (500 meters for precise Malaybalay detection)
        nearby_incidents = [
            inc for inc in reqBody.existing_incidents
            if inc.get('latitude') and inc.get('longitude') and
            haversine(reqBody.lat, reqBody.lng, inc['latitude'], inc['longitude']) < 500
        ]

        if not nearby_incidents:
            return {"is_duplicate": False}

        # 2. Textual Similarity (Cosine Similarity via TF-IDF Vectorizer)
        # We use the vectorizer from our trained model pipeline
        tfidf = model.named_steps['tfidf']
        
        # Vectorize the new report
        new_vec = tfidf.transform([reqBody.text])
        
        # Vectorize existing nearby reports
        existing_texts = [inc.get('description', '') for inc in nearby_incidents]
        existing_vecs = tfidf.transform(existing_texts)
        
        # Calculate similarities
        similarities = cosine_similarity(new_vec, existing_vecs)[0]
        
        # Levenshtein Implementation for fine-grained textual matching
        def levenshtein_dist(s1, s2):
            if len(s1) < len(s2): return levenshtein_dist(s2, s1)
            if len(s2) == 0: return len(s1)
            prev_row = range(len(s2) + 1)
            for i, c1 in enumerate(s1):
                curr_row = [i + 1]
                for j, c2 in enumerate(s2):
                    insertions = prev_row[j + 1] + 1
                    deletions = curr_row[j] + 1
                    substitutions = prev_row[j] + (c1 != c2)
                    curr_row.append(min(insertions, deletions, substitutions))
                prev_row = curr_row
            return prev_row[-1]
            
        # Find matches above TF-IDF threshold (0.85 per paper) and fine-tune with Levenshtein
        dupes = []
        for idx, score in enumerate(similarities):
            if score > 0.85:
                # Calculate normalized Levenshtein distance
                lev_dist = levenshtein_dist(reqBody.text.lower(), existing_texts[idx].lower())
                max_len = max(len(reqBody.text), len(existing_texts[idx]), 1)
                lev_similarity = 1 - (lev_dist / max_len)
                
                # Combined Score
                final_score = (float(score) * 0.7) + (lev_similarity * 0.3)
                
                if final_score > 0.85:
                    dupes.append({
                        "id": nearby_incidents[idx].get('id'),
                        "score": final_score,
                        "type": nearby_incidents[idx].get('type'),
                        "location": nearby_incidents[idx].get('location')
                    })

        if dupes:
            # Return the highest scoring match
            best_match = max(dupes, key=lambda x: x['score'])
            return {
                "is_duplicate": True,
                "confidence": best_match['score'],
                "match": best_match
            }

        return {"is_duplicate": False}

    except Exception as e:
        print(f"Duplicate detection error: {e}")
        return {"is_duplicate": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
