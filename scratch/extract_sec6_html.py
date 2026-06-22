import json
import os
import re

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "sec6-barricading" in line:
                if "replace_file_content" in line or "write_to_file" in line:
                    try:
                        step = json.loads(line)
                        if step.get("source") != "MODEL":
                            continue
                        for tc in step.get("tool_calls", []):
                            args = tc.get("args", {})
                            content = args.get("ReplacementContent") or args.get("CodeContent")
                            if content and "sec6-barricading" in content:
                                print(f"Found match in step {idx}!")
                                # Find the section that surrounds sec6-barricading
                                match = re.search(r'<section[^>]*id="sec6-[^>]*>.*?</section>', content, re.DOTALL)
                                if match:
                                    print("Exact section:")
                                    print(match.group(0))
                                    exit(0)
                                else:
                                    # Fallback: search for <section ...> that contains sec6-barricading
                                    pos = content.find("sec6-barricading")
                                    start = max(0, pos - 1000)
                                    end = min(len(content), pos + 2000)
                                    print("Snippet around sec6-barricading:")
                                    print(content[start:end])
                                    exit(0)
                    except Exception as e:
                        pass
else:
    print("No file")
