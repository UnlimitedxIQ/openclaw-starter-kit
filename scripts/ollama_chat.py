import argparse, json, sys
from urllib import request


def ollama_chat(model: str, prompt: str, host: str = "http://127.0.0.1:11434") -> str:
    url = host.rstrip("/") + "/api/chat"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }
    req = request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    with request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data.get("message", {}).get("content", "")


def main():
    ap = argparse.ArgumentParser(description="One-shot Ollama chat")
    ap.add_argument("prompt", help="Prompt text")
    ap.add_argument("--model", default="llama3.1:8b")
    ap.add_argument("--host", default="http://127.0.0.1:11434")
    args = ap.parse_args()

    out = ollama_chat(args.model, args.prompt, args.host)
    sys.stdout.write(out)


if __name__ == "__main__":
    main()
