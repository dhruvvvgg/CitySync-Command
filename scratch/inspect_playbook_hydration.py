import json
import os
import re

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "playbook" in line and "simulation.js" in line:
                if "replace_file_content" in line or "write_to_file" in line:
                    try:
                        step = json.loads(line)
                        if step.get("source") != "MODEL":
                            continue
                        for tc in step.get("tool_calls", []):
                            args = tc.get("args", {})
                            target_file = args.get("TargetFile", "")
                            if "scratch" in target_file:
                                continue
                            content = args.get("ReplacementContent") or args.get("CodeContent")
                            if content and ("barricading" in content or "timeline" in content):
                                print(f"Step {idx} target: {target_file}")
                                # Look for code updating barricading or timeline elements
                                matches = re.findall(r'.{0,100}document\.getElementById.{0,100}playbook.{0,100}', content)
                                if matches:
                                    print(f"Hydration lines in Step {idx}:")
                                    for m in matches:
                                        print(m)
                    except Exception as e:
                        pass
else:
    print("No file")
