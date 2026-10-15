"""Build all bundled example reports and a local launch page (no network)."""
from pathlib import Path
import argparse
import html
import importlib.util
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('paper_map',ROOT/'skills/paper-argument-map/scripts/paper_map.py')
pm=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(pm)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,default=ROOT/'outputs')
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    cards=[]
    for index,source in enumerate(sorted((ROOT/'examples').glob('*.argument.json')),1):
        data=json.loads(source.read_text(encoding='utf-8'))
        name=source.name.removesuffix('.argument.json')
        (args.out/(name+'.html')).write_text(pm.render(data, home_url="index.html"),encoding='utf-8')
        (args.out/source.name).write_bytes(source.read_bytes())
        p=data['paper']
        zh=html.escape(data['analysis'].get('plain_reading_title_zh',data['analysis'].get('reading_title',p['title'])),quote=True)
        en=html.escape(data['analysis'].get('plain_reading_title_en',data['analysis'].get('reading_title_en',p['title'])),quote=True)
        cards.append(f'<a class="card" data-file="{html.escape(name)}.html" href="{html.escape(name)}.html"><span>0{index}</span><div><h2 data-zh="{zh}" data-en="{en}"></h2><p>{html.escape(p["authors"])} · {html.escape(str(p.get("year","")))}</p></div><b>↗</b></a>')
    index=(ROOT/'scripts/gallery.html').read_text(encoding='utf-8').replace('<!--CARDS-->',''.join(cards))
    (args.out/'index.html').write_text(index,encoding='utf-8')
    skill=ROOT/'skills/paper-argument-map'
    with zipfile.ZipFile(args.out/'paper-argument-map-skill.zip','w',zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(skill.rglob('*')):
            if source.is_file() and '__pycache__' not in source.parts and source.suffix!='.pyc':
                archive.write(source,Path('paper-argument-map')/source.relative_to(skill))
    print(f'Built {len(cards)} example reports, JSON files, launch page and skill archive in {args.out}')

if __name__=='__main__':
    main()
