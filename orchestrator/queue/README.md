This folder contains the durable orchestrator queue files.

- Append tasks to `inbox.jsonl`.
- A runner claims tasks into `processing/` and appends results to `done.jsonl` or `failed.jsonl`.
