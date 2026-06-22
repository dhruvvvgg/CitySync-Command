import json
import os

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "sec6-mitigation-playbook" in line or "Mitigation Playbook" in line or "playbook-action-card" in line:
                if "replace_file_content" in line or "write_to_file" in line:
                    try:
                        step = json.loads(line)
                        for tc in step.get("tool_calls", []):
                            args = tc.get("args", {})
                            content = args.get("ReplacementContent") or args.get("CodeContent")
                            if content and ("sec6-mitigation-playbook" in content or "playbook-action-card" in content):
                                print(f"Found playbook HTML definition in Step {idx}:")
                                # Try to extract the HTML section
                                import re
                                match = re.search(r'<section[^>]*id="sec6-mitigation-playbook"[^>]*>.*?</section>', content, re.DOTALL)
                                if match:
                                    print(match.group(0))
                                else:
                                    # Print snippet around playbook-action-card
                                    card_match = re.search(r'.{0,300}playbook-action-card.{0,800}', content, re.DOTALL)
                                    if card_match:
                                        print("Snippet:")
                                        print(card_match.group(0))
                                    else:
                                        print("Content snippet (first 1000):")
                                        print(content[:1000])
                                # Just print one and exit
                                exit(0)
                    except Exception as e:
                        pass
else:
    print("No transcript")
