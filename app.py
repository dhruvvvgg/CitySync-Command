from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
import json
import google.generativeai as genai

app = Flask(
    __name__,
    static_folder='.',
    static_url_path=''
)
CORS(app)
@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/simulation.html')
def simulation():
    return app.send_static_file('simulation.html')

@app.route('/index.css')
def css():
    return app.send_static_file('index.css')

@app.route('/index.js')
def js():
    return app.send_static_file('index.js')

@app.route('/simulation.js')
def simulation_js():
    return app.send_static_file('simulation.js')

print("Loading CitySync V7 Bundle...")
bundle = joblib.load('citysync_v7.pkl')
models = bundle['models']

print("Loading Theme2 CSV for real-time similarity metrics...")
try:
    df_historical = pd.read_csv('theme2.csv')
    df_historical['event_cause'] = df_historical['event_cause'].astype(str).str.strip().str.lower()
    df_historical['corridor'] = df_historical['corridor'].astype(str).str.strip().str.lower()
except Exception as e:
    print(f"Error loading theme2.csv: {e}")
    df_historical = None

def get_similar_incidents_count(event_cause, corridor):
    if df_historical is None:
        return 0
    c_cause = str(event_cause).strip().lower()
    c_corr = str(corridor).strip().lower()
    match = df_historical[(df_historical['event_cause'] == c_cause) & (df_historical['corridor'] == c_corr)]
    count = len(match)
    if count == 0:
        match_cause = df_historical[df_historical['event_cause'] == c_cause]
        count = len(match_cause)
    return count

def get_vulnerable_junctions(corridor):
    # Mapping coordinates profiles to match simulation.js
    junctions = {
        'Silk Board Junction': ["HSR Layout Junction", "Dairy Circle Junction", "Agara Flyover"],
        'Outer Ring Road': ["Kadubeesanahalli Junction", "Bellandur Junction", "Marathahalli Bridge"],
        'Tumkur Road': ["Goraguntepalya Junction", "Peenya Junction", "Jalahalli Cross"],
        'Bannerghata Road': ["Dairy Circle Junction", "Silk Board Junction", "Jayadeva Flyover"],
        'Bellary Road 1': ["Mekhri Circle Junction", "Nagawara Junction", "Hebbal Circle"]
    }
    return junctions.get(corridor, ["Adjacent Intersection A", "Adjacent Intersection B"])

def generate_playbook_fallback(event_cause, corridor, p_lo, p_med, p_hi, u_score, u_tier, corridor_risk, cause_risk, corridor_density, similar_count):
    p_med_min = round(p_med * 60)
    p_lo_min = round(p_lo * 60)
    p_hi_min = round(p_hi * 60)
    
    # Calculate deterministic risk percentages
    corridor_risk_pct = min(100, max(15, round((corridor_risk + corridor_density) * 55)))
    cascade_risk_pct = min(100, max(15, round((corridor_risk + cause_risk) * 20 + (1.5 if u_score > 60 else 0.5) * 15)))
    delay_risk_pct = min(100, max(10, round((p_med * 50) + (15 if u_score > 60 else 0))))
    diversion_need_pct = min(100, max(5, round((cause_risk * 15 + corridor_density * 30) * (2.0 if u_score > 60 else 0.8))))
    
    vulnerable_juncs = get_vulnerable_junctions(corridor)
    
    return {
        "priority": "Critical" if u_score > 70 else "High" if u_score > 40 else "Medium",
        "micro_zone": f"Zone {(hash(corridor) % 20) + 1}",
        "timestamp": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        "similar_count": similar_count,
        "decision_drivers": [
            f"Primary anomaly trigger is classified as {event_cause.replace('_', ' ')}.",
            f"Location {corridor} carries a base volatility score of {corridor_risk:.2f}.",
            "High historical load at merge segments during current time window.",
            "Density build-up exceeds normal buffer threshold on incident approach."
        ],
        "confidence_drivers": [
            "Clearance prediction is bounded by high variance in local road layout.",
            f"Quantile forecast interval ranges from {p_lo_min} min to {p_hi_min} min.",
            "Historical recovery logs for this segment show minor timeline clustering."
        ],
        "cascade_spread_window": f"{round(p_med_min * 0.4)}–{round(p_med_min * 0.7)} minutes",
        "risk_radar_explanations": [
            f"Corridor baseline volatility is currently at {corridor_risk_pct}% based on risk mapping.",
            f"Cascade risk is {cascade_risk_pct}% due to spillover load spreading to {vulnerable_juncs[0]}.",
            f"Delay risk of {delay_risk_pct}% is computed from quantile expected clearance times.",
            f"Diversion need is rated {diversion_need_pct}% because main corridor lanes are heavily obstructed."
        ],
        "playbook": {
            "barricading": f"Deploy barricade units at the {corridor} incident location. Standby barricades at {vulnerable_juncs[0]}.",
            "manpower": "Deploy traffic officers at incident node and adjacent junctions for flow control.",
            "diversion": f"Redirect heavy vehicles to Outer Ring Road routes. Maintain local access for private cars.",
            "timeline": f"T+00 Dispatch, T+10 Traffic Control, T+25 Cordon segment, T+{p_med_min} Expected Clearance.",
            "escalation": f"If actual clearance exceeds upper bound of {p_hi_min} minutes, escalate to Regional command."
        },
        "future_readiness": {
            "strategic_insight": f"This incident indicates that traffic anomalies on {corridor} rapidly bottleneck surrounding arteries due to limited arterial spacing.",
            "preparedness_recommendations": [
                f"Pre-position response assets near {vulnerable_juncs[0]} during peak hours.",
                "Review signal timing offset patterns for emergency diversions on adjacent routes."
            ],
            "historical_context": f"Historically, {event_cause.replace('_', ' ')} incidents on {corridor} lead to an average congestion recovery window of {p_med_min} minutes.",
            "resilience_opportunities": [
                "Install automated sensor gates at main merge lanes to control bottleneck flow.",
                "Strengthen camera surveillance coverage on adjacent junction approaches."
            ]
        }
    }

def generate_playbook_llm(event_cause, corridor, closure, p_lo, p_med, p_hi, u_score, u_tier, corridor_risk, cause_risk, corridor_density, similar_count):
    # Try to load API key from environment first, then local .env file
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key and os.path.exists('.env'):
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                        break
        except Exception:
            pass
            
    if not api_key:
        print("GEMINI_API_KEY not found in environment or .env. Using fallback playbook generation.")
        return generate_playbook_fallback(event_cause, corridor, p_lo, p_med, p_hi, u_score, u_tier, corridor_risk, cause_risk, corridor_density, similar_count)

    # Calculate deterministic risk percentages in python
    corridor_risk_pct = min(100, max(15, round((corridor_risk + corridor_density) * 55)))
    cascade_risk_pct = min(100, max(15, round((corridor_risk + cause_risk) * 20 + (1.5 if closure else 0.5) * 15)))
    delay_risk_pct = min(100, max(10, round((p_med * 50) + (15 if closure else 0))))
    diversion_need_pct = min(100, max(5, round((cause_risk * 15 + corridor_density * 30) * (2.0 if closure else 0.8))))

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
You are the AI Playbook & Reasoning Engine for the CitySync Command Traffic Management Center (TMC).
Generate a structured response playbook and explainable AI insights for the following traffic anomaly:

Incident Type: {event_cause}
Corridor: {corridor}
Road Closure Required: {closure}
Expected Clearance Duration (P50): {round(p_med * 60)} minutes
Quantile Range: P10 = {round(p_lo * 60)} minutes, P90 = {round(p_hi * 60)} minutes
Urgency Score: {u_score}/100 (Tier: {u_tier})
Deterministic Risk Score Metrics:
- Corridor Risk: {corridor_risk_pct}%
- Cascade Risk: {cascade_risk_pct}%
- Delay Risk: {delay_risk_pct}%
- Diversion Need: {diversion_need_pct}%
Historical Similar Incidents Count: {similar_count}

CRITICAL PLAYBOOK GENERALIZATION RULE:
- The Playbook action descriptions (specifically for 'barricading' and 'manpower') must NOT contain specific headcount numbers or equipment quantities (e.g. do NOT say "2 barricade units" or "4 officers"). Instead, use generalized phrases (e.g. "Deploy barricade units", "Deploy traffic officers").

Format your response strictly as a valid JSON object with the following keys. Do not include markdown code fence wrappers, just raw JSON:
{{
  "priority": "<priority tier matching incident urgency, e.g. Medium, High, Critical>",
  "micro_zone": "<inferred spatial micro zone identifier, e.g. Zone 14>",
  "timestamp": "<current timestamp, e.g. '2026-06-21 11:45'>",
  "decision_drivers": [
    "<reason 1: concise sentence explaining how the incident type affects the corridor, max 12 words>",
    "<reason 2: concise sentence explaining how historical corridor risk affects this segment, max 12 words>",
    "<reason 3: concise sentence explaining how peak hours or current metrics drive volatility, max 12 words>",
    "<reason 4: concise sentence explaining density or merge conflicts, max 12 words>"
  ],
  "confidence_drivers": [
    "<driver 1: explanation of forecast range variability, max 12 words>",
    "<driver 2: explanation of historical queue variance, max 12 words>",
    "<driver 3: explanation of junction coordination factor, max 12 words>"
  ],
  "cascade_spread_window": "<estimated spread time window, e.g., '20-30 minutes'>",
  "risk_radar_explanations": [
    "<explanation for Corridor Risk of {corridor_risk_pct}%, max 12 words>",
    "<explanation for Cascade Risk of {cascade_risk_pct}%, max 12 words>",
    "<explanation for Delay Risk of {delay_risk_pct}%, max 12 words>",
    "<explanation for Diversion Need of {diversion_need_pct}%, max 12 words>"
  ],
  "playbook": {{
    "barricading": "<physical cordoning setup details, STRICTLY NO headcount/equipment counts/numbers, e.g., 'Deploy barricade units', max 15 words>",
    "manpower": "<traffic personnel deployment details, STRICTLY NO headcount/personnel counts/numbers, e.g., 'Deploy traffic officers', max 15 words>",
    "diversion": "<dynamic signal and VMS rerouting instructions, max 15 words>",
    "timeline": "<chronological milestones, e.g. 'T+00 Dispatch, T+10 Active, T+25 Cordon, T+{round(p_med * 60)} Clear'>",
    "escalation": "<rules for automatic elevation if bounds are exceeded, max 15 words>"
  }},
  "future_readiness": {{
    "strategic_insight": "<forward-looking insight about this corridor's vulnerability pattern, max 18 words>",
    "preparedness_recommendations": [
      "<recommendation 1 for pre-positioning or readiness, max 15 words>",
      "<recommendation 2 for timing sync or monitoring, max 15 words>"
    ],
    "historical_context": "<brief summary of historical volatility patterns for this corridor/cause, max 18 words>",
    "resilience_opportunities": [
      "<infrastructure or technological opportunity, max 15 words>",
      "<deployment or monitoring opportunity, max 15 words>"
    ]
  }}
}}
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Strip code fences if generated
        if text.startswith('```'):
            lines = text.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines[-1].startswith('```'):
                lines = lines[:-1]
            text = '\n'.join(lines).strip()
            
        data = json.loads(text)
        
        # Structure the risk radar maps deterministically into the parsed object
        data["risk_radar"] = {
            "corridor_risk": corridor_risk_pct,
            "cascade_risk": cascade_risk_pct,
            "delay_risk": delay_risk_pct,
            "diversion_need": diversion_need_pct
        }
        data["cascade"] = {
            "primary_zone": corridor,
            "spread_window": data.get("cascade_spread_window", "20-30 minutes"),
            "vulnerable_junctions": get_vulnerable_junctions(corridor),
            "cascade_risk": cascade_risk_pct
        }
        data["similar_count"] = similar_count
        
        return data
    except Exception as e:
        print(f"Error calling Gemini API: {e}. Falling back to rule-based playbook.")
        return generate_playbook_fallback(event_cause, corridor, p_lo, p_med, p_hi, u_score, u_tier, corridor_risk, cause_risk, corridor_density, similar_count)

def assign_bucket(h):
    bounds = bundle['bucket_bounds']
    labels = bundle['bucket_labels']
    for i in range(len(bounds) - 1):
        if h < bounds[i + 1]: return labels[i], i
    return labels[-1], len(labels)-1

def soft_classify(lo, med, hi):
    b_lo, _ = assign_bucket(lo)
    b_med, idx_med = assign_bucket(med)
    b_hi, _ = assign_bucket(hi)
    
    idx_lo = bundle['bucket_labels'].index(b_lo)
    idx_hi = bundle['bucket_labels'].index(b_hi)
    full_span = idx_hi - idx_lo
    relative_width = (hi - lo) / max(med, 0.25)

    if full_span == 0 and relative_width < 1.5: conf = "High"
    elif full_span <= 1 and relative_width < 4.0: conf = "Moderate"
    else: conf = "Low"

    return b_med, conf

def compute_urgency(p50, p90, bkt_idx, closure, cause_risk_val, density_val):
    sev_pts = [10, 30, 60, 90][bkt_idx]
    ceiling = bundle['bucket_bounds'][min(bkt_idx + 1, len(bundle['bucket_bounds']) - 1)]
    
    spread_r = min(p90 / max(ceiling, 0.01), 2.0)
    spread = spread_r * 12.5
    if closure: spread = min(spread * 1.3, 25)

    recurrence = density_val * 20
    cause_s = min(cause_risk_val / 4.28, 1.0) * 15
    score = min(max(sev_pts + spread + recurrence + cause_s, 0), 100)

    tier = 'LOW'
    for t, threshold in bundle['urgency_tiers'].items():
        if score >= threshold:
            tier = t
            break
    return round(score, 1), tier

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    dt = pd.to_datetime(data['start_datetime'])
    
    # 1. Initialize the row with default values mimicking the training set
    row = {}
    
    # --- Time Features ---
    row['hour'] = dt.hour
    row['day_of_week'] = dt.dayofweek
    row['month'] = dt.month
    row['day_of_month'] = dt.day
    row['week_of_year'] = int(dt.isocalendar().week)
    row['is_weekend'] = int(dt.dayofweek >= 5)
    row['is_night'] = int(dt.hour in bundle['night_hours'])
    row['is_predawn'] = int(dt.hour in bundle['predawn_hours'])
    row['hour_sin'] = np.sin(2 * np.pi * dt.hour / 24)
    row['hour_cos'] = np.cos(2 * np.pi * dt.hour / 24)
    row['dow_sin'] = np.sin(2 * np.pi * dt.dayofweek / 7)
    row['dow_cos'] = np.cos(2 * np.pi * dt.dayofweek / 7)
    row['month_sin'] = np.sin(2 * np.pi * dt.month / 12)
    row['month_cos'] = np.cos(2 * np.pi * dt.month / 12)
    
    # --- Inputs from UI ---
    row['event_cause'] = data['event_cause']
    row['corridor'] = data['corridor']
    row['requires_road_closure'] = int(data['requires_road_closure'])
    
    # --- Defaults for fields not provided by UI ---
    row['event_type'] = 'Unknown'
    row['priority'] = 'Unknown'
    row['veh_grouped'] = 'Unknown'
    row['zone'] = 'Unknown'
    row['police_station'] = 'Unknown'
    row['cause_closure'] = f"{row['event_cause']}_{row['requires_road_closure']}"
    row['cause_priority'] = f"{row['event_cause']}_Unknown"
    
    # --- Spatial (Defaulting to City Center for standalone inference) ---
    spatial_df = pd.DataFrame([{'latitude': 12.9716, 'longitude': 77.5946}])
    row['micro_zone'] = str(bundle['kmeans'].predict(spatial_df)[0])
    
    # --- Risk Maps ---
    row['corridor_risk'] = bundle['corridor_risk_map'].get(row['corridor'], bundle['global_fallback'])
    row['cause_risk'] = bundle['cause_risk_map'].get(row['event_cause'], bundle['global_fallback'])
    row['corridor_density'] = bundle['corridor_density_map'].get(row['corridor'], 0.0)
    row['risk_x_closure'] = row['cause_risk'] * (1.0 + row['requires_road_closure'] * 0.68)
    row['vb_junction_risk'] = 0.0 
    
    # --- Rolling Counts ---
    row['events_1h'] = 0
    row['events_3h'] = 0
    row['events_6h'] = 0
    
    # 2. Convert to DataFrame
    df = pd.DataFrame([row])
    
    # 3. CRITICAL: Cast categorical features using EXACT training categories
    for col in bundle['cat_features']:
        df[col] = pd.Categorical(df[col], categories=bundle['known_categories'][col])
        
    # 4. Enforce exact feature order
    df = df[bundle['features']]
    
    # 5. Predict
    p_lo = np.expm1(models['lower'].predict(df))[0]
    p_med = np.expm1(models['median'].predict(df))[0]
    p_hi = np.expm1(models['upper'].predict(df))[0]
    
    p_lo = max(min(p_lo, p_med), 0.0)
    p_med = max(p_med, 0.0)
    p_hi = max(max(p_hi, p_med), 0.0)

    # 6. Score
    sev, conf = soft_classify(p_lo, p_med, p_hi)
    _, bkt_idx = assign_bucket(p_med)
    closure = bool(row['requires_road_closure'])
    u_score, u_tier = compute_urgency(p_med, p_hi, bkt_idx, closure, row['cause_risk'], row['corridor_density'])

    # Query true similar incidents count from dataset
    similar_count = get_similar_incidents_count(row['event_cause'], row['corridor'])

    # 7. Generate Playbook via Gemini LLM / fallback
    playbook_data = generate_playbook_llm(
        event_cause=row['event_cause'],
        corridor=row['corridor'],
        closure=closure,
        p_lo=p_lo,
        p_med=p_med,
        p_hi=p_hi,
        u_score=u_score,
        u_tier=u_tier,
        corridor_risk=row['corridor_risk'],
        cause_risk=row['cause_risk'],
        corridor_density=row['corridor_density'],
        similar_count=similar_count
    )

    # Convert predictions to minutes
    p10_min = round(p_lo * 60)
    p50_min = round(p_med * 60)
    p90_min = round(p_hi * 60)

    # 8. Return Payload
    return jsonify({
        "predictions": {"p10": p10_min, "p50": p50_min, "p90": p90_min},
        "classification": {"severity": f"Short → Medium" if p_med < 0.75 else "Medium → High", "confidence": conf},
        "urgency": {"score": u_score, "tier": u_tier},
        "event_cause": row['event_cause'],
        "corridor": row['corridor'],
        "requires_road_closure": closure,
        "vulnerable_junctions": get_vulnerable_junctions(row['corridor']),
        "intelligence": playbook_data
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)