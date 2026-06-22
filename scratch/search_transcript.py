import json
import os
import glob

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript.jsonl")

if os.path.exists(transcript_path):
    print("Found transcript!")
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            try:
                step = json.loads(line)
                # Check for simulation.html content or replacements
                if "simulation.html" in str(step.get("tool_calls", [])):
                    print(f"Step {i} has tool call modifying simulation.html")
            except Exception as e:
                pass
else:
    print(f"Transcript not found at {transcript_path}")
