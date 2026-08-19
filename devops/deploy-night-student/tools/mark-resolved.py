#!/usr/bin/env python3
import json, sys, datetime
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('usage: mark-resolved.py NN')

num=sys.argv[1].zfill(2)
root=Path(__file__).resolve().parent.parent
state_path=root/'.incident-state'/f'incident-{num}.json'

if state_path.exists():
    data=json.loads(state_path.read_text())
    data['resolved_at']=datetime.datetime.now().astimezone().isoformat(timespec='seconds')
    state_path.write_text(json.dumps(data,indent=2))

# Le bandeau visuel disparait uniquement lorsque le check de l'incident courant a reussi.
active_path=root/'runtime'/'active-incident.json'
if active_path.exists():
    try:
        active=json.loads(active_path.read_text())
        active_num=str(active.get('incident','')).zfill(2)
        if active_num == num:
            active_path.unlink()
    except (json.JSONDecodeError, OSError):
        # L'etat de resolution reste la source de verite pour la progression du TP.
        pass
