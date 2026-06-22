import json
import os

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "sec6" in line or "playbook-action-card" in line:
                try:
                    step = json.loads(line)
                    print(f"Match found in Step {idx}: type={step.get('type')}, source={step.get('source')}")
                    # Print tools called if any
                    for call in step.get("tool_calls", []):
                        print("  Tool call:", call.get("function"), "args:", list(call.get("arguments", {}).keys()))
                except Exception as e:
                    print(f"Error parsing line {idx}: {e}")
