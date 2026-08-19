#!/usr/bin/env python3
from pathlib import Path
import csv, datetime, statistics, json
rows=list(csv.DictReader((Path(__file__).parent.parent/'ops'/'release-history.csv').open()))
lead=[]; failures=[]; restore=[]
for r in rows:
    a=datetime.datetime.strptime(r['merged_at'],'%H:%M')
    b=datetime.datetime.strptime(r['deployed_at'],'%H:%M')
    lead.append(int((b-a).total_seconds()/60))
    if r['result']=='incident':
        failures.append(r)
        restore.append(int(r['restored_minutes']))
print('GAME NIGHT - DONNEES DORA BRUTES')
print('--------------------------------')
print(f'- {len(rows)} déploiements sur 1 journée de release')
print(f'- temps merge -> production : {lead} minutes')
print(f'- {len(failures)} déploiements ont provoqué un incident sur {len(rows)}')
print(f'- temps de restauration des incidents historiques : {restore} minutes')
print('\nA vous de nommer les 4 métriques, calculer/estimer leur valeur et les classer en throughput ou stability.')
state=Path(__file__).parent.parent/'.incident-state'
if state.exists():
    durations=[]
    for p in sorted(state.glob('incident-*.json')):
        try:
            d=json.loads(p.read_text())
            if d.get('resolved_at') and d.get('started_at'):
                start=datetime.datetime.fromisoformat(d['started_at'])
                end=datetime.datetime.fromisoformat(d['resolved_at'])
                durations.append((d.get('incident'),int((end-start).total_seconds())))
        except Exception: pass
    if durations:
        print('\nVOS TEMPS DE RETABLISSEMENT (simulation)')
        for inc,sec in durations:
            print(f'- incident {inc}: {sec//60} min {sec%60:02d} s')
