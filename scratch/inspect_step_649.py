import json
import os
import re

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx == 649:
                try:
                    step = json.loads(line)
                    print(f"Step {idx}: type={step.get('type')}")
                    for tc in step.get("tool_calls", []):
                        args = tc.get("args", {})
                        content = args.get("ReplacementContent")
                        if content:
                            print("ReplacementContent snippet:")
                            print(content[:2000])
                except Exception as e:
                    print("Err:", e)
else:
    print("No file")
