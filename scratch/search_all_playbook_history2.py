import json
import os
import re

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "playbook" in line:
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
                            if content and "playbook" in content and "html" in target_file:
                                print(f"Step {idx} target: {target_file}")
                                # Search for playbook cards or elements
                                elements = re.findall(r'<[^>]*class="[^"]*playbook[^"]*"[^>]*>.*?</[^>]+>', content, re.DOTALL)
                                if elements:
                                    print(f"Elements in Step {idx}:")
                                    for elem in elements:
                                        print(elem[:500])
                                else:
                                    print("No specific playbook class elements found in content.")
                    except Exception as e:
                        pass
else:
    print("No file")
