#!/usr/bin/env python3
"""Prepare, validate, and render source-grounded argument maps; Python stdlib only."""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROLES = {'problem', 'prior', 'gap', 'question', 'method', 'finding', 'contribution', 'assumption', 'limitation', 'joint'}
RELATIONS = {'motivates', 'addresses', 'supports', 'qualifies', 'contradicts', 'requires', 'reports'}
STATUSES = {'explicit', 'inferred', 'not_in_input'}
REVIEWS = {'unreviewed', 'accepted', 'excluded'}
ASSETS = Path(__file__).resolve().parents[1] / 'assets'


def validate(data):
    errors, warnings = [], []
    if not isinstance(data, dict):
        return ['Document must be an object.'], []
    if data.get('schema_version') != '0.1':
        errors.append('schema_version must be 0.1.')
    paper = data.get('paper', {})
    analysis = data.get('analysis', {})
    if not isinstance(paper, dict):
        errors.append('paper must be an object.')
        paper = {}
    if not isinstance(analysis, dict):
        errors.append('analysis must be an object.')
        analysis = {}
    for obj, key, label in [(paper, 'title', 'paper'), (analysis, 'language', 'analysis'),
                             (analysis, 'input_scope', 'analysis'), (analysis, 'notice', 'analysis')]:
        if not isinstance(obj.get(key), str) or not obj[key].strip():
            errors.append(f'{label}.{key} must be a nonempty string.')
    if not isinstance(paper.get('source_kind'), str) or paper['source_kind'] not in {'user_supplied', 'open_access', 'synthetic'}:
        errors.append('paper.source_kind is invalid.')
    lists = {}
    for name in ('passages', 'nodes', 'edges', 'revisions'):
        value = data.get(name)
        if not isinstance(value, list):
            errors.append(f'{name} must be an array.')
            value = []
        if any(not isinstance(x, dict) for x in value):
            errors.append(f'{name} entries must be objects.')
            value = [x for x in value if isinstance(x, dict)]
        lists[name] = value
    passages, nodes, edges = (lists[k] for k in ('passages', 'nodes', 'edges'))
    if len(nodes) > 300 or len(edges) > 1500:
        errors.append('Reader supports at most 300 nodes and 1500 edges; split large graphs.')
    all_ids = []
    for name in ('passages', 'nodes', 'edges'):
        for item in lists[name]:
            ident = item.get('id')
            if not isinstance(ident, str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]*', ident):
                errors.append(f'{name}: ID must start with a letter and contain only letters, digits, _ or -.')
            else:
                all_ids.append(ident)
    for ident, count in Counter(all_ids).items():
        if count > 1:
            errors.append(f'Duplicate ID: {ident}.')
    pmap = {p['id']: p for p in passages if isinstance(p.get('id'), str)}
    nmap = {n['id']: n for n in nodes if isinstance(n.get('id'), str)}
    for p in passages:
        for key in ('section', 'locator', 'text'):
            if not isinstance(p.get(key), str) or not p[key].strip():
                errors.append(f'{p.get("id", "passage")}.{key} must be nonempty text.')
    for item in nodes + edges:
        ident = item.get('id', '?')
        if not isinstance(item.get('status'), str) or item['status'] not in STATUSES:
            errors.append(f'{ident}: invalid status.')
        if not isinstance(item.get('review'), str) or item['review'] not in REVIEWS:
            errors.append(f'{ident}: invalid review state.')
        for key in ('rationale', 'note'):
            if not isinstance(item.get(key), str):
                errors.append(f'{ident}.{key} must be text.')
        basis = item.get('basis')
        if not isinstance(basis, list):
            errors.append(f'{ident}.basis must be an array.')
            basis = []
        if item.get('status') in ('explicit', 'inferred') and not basis:
            errors.append(f'{ident}: source basis required for {item.get("status")}.')
        if item.get('status') in ('inferred', 'not_in_input') and not str(item.get('rationale') or '').strip():
            errors.append(f'{ident}: rationale required for {item.get("status")}.')
        for b in basis:
            if not isinstance(b, dict):
                errors.append(f'{ident}: basis must contain objects.')
                continue
            pid, quote = b.get('passage_id'), b.get('quote')
            p = pmap.get(pid) if isinstance(pid, str) else None
            if p is None:
                errors.append(f'{ident}: unknown passage {pid!r}.')
            if not isinstance(quote, str) or not quote:
                errors.append(f'{ident}: quotation must be nonempty text.')
            elif p and (not isinstance(p.get('text'), str) or quote not in p['text']):
                errors.append(f'{ident}: quotation is not an exact substring of {pid}.')
    for n in nodes:
        if not isinstance(n.get('role'), str) or n['role'] not in ROLES:
            errors.append(f'{n.get("id")}: invalid node role.')
        if not isinstance(n.get('label'), str) or not n['label'].strip():
            errors.append(f'{n.get("id")}: label must be nonempty text.')
        if not isinstance(n.get('core'), bool):
            errors.append(f'{n.get("id")}: core must be Boolean.')
    outgoing, neighbors = defaultdict(list), set()
    for e in edges:
        source, target = e.get('source'), e.get('target')
        if not isinstance(source, str) or source not in nmap or not isinstance(target, str) or target not in nmap:
            errors.append(f'{e.get("id")}: unknown node endpoint.')
            continue
        if source == target:
            errors.append(f'{e.get("id")}: self-edge is not supported.')
        if not isinstance(e.get('relation'), str) or e['relation'] not in RELATIONS:
            errors.append(f'{e.get("id")}: invalid relation.')
        if e.get('relation') == 'requires' and nmap[target].get('role') != 'joint':
            errors.append(f'{e.get("id")}: requires must target a joint inference node.')
        outgoing[source].append(target)
        neighbors.update((source, target))
    for n in nodes:
        if n.get('role') == 'joint':
            inputs = {e.get('source') for e in edges if e.get('target') == n.get('id') and e.get('relation') == 'requires' and isinstance(e.get('source'), str)}
            if len(inputs) < 2:
                errors.append(f'{n.get("id")}: joint inference needs at least two distinct required premises.')
    # Kahn's algorithm detects cycles without recursion on long inputs.
    degree = {nid: 0 for nid in nmap}
    for targets in outgoing.values():
        for target in targets:
            degree[target] += 1
    queue = [nid for nid, d in degree.items() if d == 0]
    visited = 0
    while queue:
        nid = queue.pop()
        visited += 1
        for target in outgoing[nid]:
            degree[target] -= 1
            if degree[target] == 0:
                queue.append(target)
    if visited < len(nmap):
        warnings.append('Graph contains a directed cycle; preserved for inspection (not automatically a reasoning error).')
    if not nodes:
        warnings.append('No argument nodes yet; this may be a prepared input awaiting analysis.')
    for status in ('inferred', 'not_in_input'):
        count = sum(x.get('status') == status for x in nodes + edges)
        if count:
            warnings.append(f'{count} item(s) are {status}; inspect interpretation and input scope.')
    isolated = [nid for nid in nmap if nid not in neighbors]
    if isolated:
        warnings.append('Isolated nodes: ' + ', '.join(isolated))
    if nodes and not any(n.get('core') for n in nodes):
        warnings.append('No core nodes selected; overview will fall back to all nodes.')
    return errors, warnings


def render(data):
    errors, warnings = validate(data)
    if errors:
        raise ValueError('\n'.join(errors))
    packed = dict(data)
    packed['validation_warnings'] = warnings
    # HTML's raw-text parser treats </script> as markup even in JSON strings.
    payload = json.dumps(packed, ensure_ascii=False).replace('&', '\\u0026').replace('<', '\\u003c').replace('>', '\\u003e').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    template = (ASSETS / 'reader.html').read_text(encoding='utf-8')
    return template.replace('<!--TITLE-->', html.escape(data['paper']['title'])).replace('/*STYLE*/', (ASSETS / 'reader.css').read_text(encoding='utf-8')).replace('/*APP*/', (ASSETS / 'reader.js').read_text(encoding='utf-8')).replace('/*DATA*/', payload)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest='command', required=True)
    prep = subs.add_parser('prepare', help='Split UTF-8 text into source paragraphs; no model call.')
    prep.add_argument('input', type=Path)
    prep.add_argument('--title', required=True)
    prep.add_argument('--out', required=True, type=Path)
    prep.add_argument('--language', default='zh')
    prep.add_argument('--scope', default='User-provided text')
    for command in ('validate', 'render'):
        sub = subs.add_parser(command)
        sub.add_argument('input', type=Path)
        if command == 'render':
            sub.add_argument('--out', required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == 'prepare':
            text = args.input.read_text(encoding='utf-8-sig').strip()
            if not text:
                raise ValueError('Input text is empty.')
            paragraphs = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
            data = {'schema_version': '0.1', 'paper': {'title': args.title, 'source_kind': 'user_supplied'},
                    'analysis': {'language': args.language, 'input_scope': args.scope, 'notice': 'Prepared source text; argument analysis has not been performed.'},
                    'passages': [{'id': f'P{i}', 'section': args.scope, 'locator': f'Paragraph {i}', 'text': p} for i, p in enumerate(paragraphs, 1)],
                    'nodes': [], 'edges': [], 'revisions': []}
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(f'Prepared {len(paragraphs)} passages: {args.out}')
            return 0
        data = json.loads(args.input.read_text(encoding='utf-8-sig'))
        errors, warnings = validate(data)
        for message in errors:
            print('ERROR: ' + message, file=sys.stderr)
        for message in warnings:
            print('NOTE: ' + message)
        if errors:
            return 1
        if args.command == 'render':
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(render(data), encoding='utf-8')
            print(f'Rendered: {args.out}')
        else:
            print(f'Valid structure and source spans: {len(data["nodes"])} nodes, {len(data["edges"])} edges. Semantic correctness is not checked.')
        return 0
    except (OSError, ValueError, TypeError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
