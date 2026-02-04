# Using Ollama through Claude (pragmatic setup)

## What this means
- **Claude (Anthropic)** = your “smart router/orchestrator” (planning, tool use, long context).
- **Ollama (local)** = your “cheap local model” for drafts, summaries, code transforms, embeddings, etc.

In practice: Claude decides *when* to call a local model and invokes it via a tool (shell or HTTP). This avoids trying to make Claude “run Ollama” directly.

## Local Ollama endpoint
Ollama runs a local HTTP server:
- `http://127.0.0.1:11434`

Models present on this machine:
- `llama3.1:8b`
- `mistral:7b`
- `deepseek-coder-v2:16b`
- `nomic-embed-text:latest`

## One-shot local call helper
We added:
- `scripts/ollama_chat.py`

Example:
```bash
python scripts/ollama_chat.py "Rewrite this more concisely: ..." --model llama3.1:8b
```

## Pattern to use inside a Claude-driven agent
1) Claude receives request.
2) If task is low-risk/cheap (rewrite/summarize/draft), Claude calls Ollama via `ollama_chat.py`.
3) Claude post-processes / validates output and returns final.

## Next step (if you want it)
We can add an **MCP server** for Ollama so Claude/Claude Code can call it as a tool without shell scripts.
