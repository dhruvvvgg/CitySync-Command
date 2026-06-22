import json
import os

app_data_dir = r"C:\Users\D\.gemini\antigravity"
convo_id = "25c45f92-e4f2-440f-99e4-b2f0bb2a8d7b"
transcript_path = os.path.join(app_data_dir, "brain", convo_id, ".system_generated", "logs", "transcript_full.jsonl")

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx == 427 or idx == 428:
                try:
                    step = json.loads(line)
                    print(f"Step {idx}: type={step.get('type')}")
                    # Print tool calls
                    for call in step.get("tool_calls", []):
                        print("  Call:", call.get("function"))
                        args = call.get("arguments", {})
                        if "ReplacementChunks" in args:
                            for chunk in args["ReplacementChunks"]:
                                print("    StartLine:", chunk.get("StartLine"), "EndLine:", chunk.get("EndLine"))
                                print("    Target:", chunk.get("TargetContent"))
                                print("    Replacement:", chunk.get("ReplacementContent"))
                        elif "CodeContent" in args:
                            print("    CodeContent length:", len(args["CodeContent"]))
                        elif "CommandLine" in args:
                            print("    CommandLine:", args["CommandLine"])
                except Exception as e:
                    print(f"Error parse: {e}")
