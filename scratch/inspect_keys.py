import json
import os

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "sec6" in line:
                try:
                    step = json.loads(line)
                    print(f"Step {idx} keys: {list(step.keys())}")
                    if "tool_calls" in step:
                        print(f"  tool_calls list length: {len(step['tool_calls'])}")
                        for tc in step["tool_calls"]:
                            print(f"    keys: {list(tc.keys())}")
                            if "function" in tc:
                                print(f"      function: {tc['function']}")
                            if "name" in tc:
                                print(f"      name: {tc['name']}")
                            if "arguments" in tc:
                                print(f"      arguments keys: {list(tc['arguments'].keys())}")
                            if "args" in tc:
                                print(f"      args keys: {list(tc['args'].keys())}")
                    break
                except Exception as e:
                    print("Err:", e)
