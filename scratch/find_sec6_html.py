import json
import os
import re

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "sec6-mitigation-playbook" in line:
                if "replace_file_content" in line or "write_to_file" in line:
                    try:
                        step = json.loads(line)
                        if step.get("source") != "MODEL":
                            continue
                        for tc in step.get("tool_calls", []):
                            args = tc.get("args", {})
                            content = args.get("ReplacementContent") or args.get("CodeContent")
                            target_file = args.get("TargetFile", "")
                            if "scratch" in target_file:
                                continue
                            if content and "sec6-mitigation-playbook" in content:
                                match = re.search(r'<section[^>]*id="sec6-mitigation-playbook"[^>]*>.*?</section>', content, re.DOTALL)
                                if match:
                                    print(f"Found HTML in Step {idx}:")
                                    print(match.group(0))
                                    exit(0)
                    except Exception as e:
                        pass
    print("Not found in sections")
else:
    print("No transcript")
