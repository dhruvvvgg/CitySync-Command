import json
import os

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "sec6" in line or "playbook-action-card" in line:
                if "replace_file_content" in line or "multi_replace_file_content" in line or "write_to_file" in line:
                    try:
                        step = json.loads(line)
                        print(f"\n================ STEP {idx} ================")
                        for call in step.get("tool_calls", []):
                            tool_name = call.get("name")
                            print(f"Tool Name: {tool_name}")
                            args = call.get("args", {})
                            if tool_name in ["replace_file_content", "multi_replace_file_content"]:
                                chunks = args.get("ReplacementChunks")
                                if chunks:
                                    for ch in chunks:
                                        if "sec6" in str(ch) or "playbook-action-card" in str(ch):
                                            print(f"Chunk (Lines {ch.get('StartLine')} - {ch.get('EndLine')})")
                                            print("TargetContent:")
                                            print(ch.get("TargetContent"))
                                            print("ReplacementContent:")
                                            print(ch.get("ReplacementContent"))
                                else:
                                    # check single replace_file_content
                                    if "sec6" in str(args) or "playbook-action-card" in str(args):
                                        print(f"Single replace: Target={args.get('TargetContent')}")
                                        print(f"Replacement={args.get('ReplacementContent')}")
                            elif tool_name == "write_to_file":
                                print(f"Write to file: {args.get('TargetFile')}")
                                print(args.get("CodeContent")[:300])
                    except Exception as e:
                        print("Error parsing", idx, e)
