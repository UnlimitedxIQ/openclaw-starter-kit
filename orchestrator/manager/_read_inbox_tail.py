import json, os, sys
state_path=r'C:\\agent\\openclaw-workspace\\orchestrator\\manager\\state.json'
inbox_path=r'C:\\agent\\openclaw-workspace\\orchestrator\\queue\\inbox.jsonl'
off=0
if os.path.exists(state_path):
    with open(state_path,'r',encoding='utf-8') as f:
        off=json.load(f).get('inboxByteOffset',0)
if not os.path.exists(inbox_path):
    print('NO_INBOX')
    sys.exit(0)
with open(inbox_path,'rb') as f:
    data=f.read()
ln=len(data)
if off>ln:
    off=0
print(ln)
sys.stdout.write(data[off:].decode('utf-8',errors='replace'))
