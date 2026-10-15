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
        (args.out/(name+'.html')).write_text(pm.render(data),encoding='utf-8')
        (args.out/source.name).write_bytes(source.read_bytes())
        p=data['paper']
        cards.append(f'<a class="card" href="{html.escape(name)}.html"><span>0{index} / 实证论文</span><h2>{html.escape(p["title"])}</h2><p>{html.escape(p["authors"])} · {html.escape(str(p.get("year","")))}</p><b>打开交互阅读报告 ↗</b></a>')
    index='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paper Argument Map · 阅读示例</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f6f3;color:#192e32;font:15px/1.65 "Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1080px;margin:auto;padding:56px 24px}.eyebrow{font-size:12px;color:#087f7a;letter-spacing:2px}h1{font-size:clamp(28px,5vw,46px);line-height:1.2;margin:18px 0}header p{max-width:700px;color:#62726c}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:36px}.card{display:flex;flex-direction:column;gap:14px;color:inherit;text-decoration:none;background:#fff;border:1px solid #d7e4da;padding:24px;border-radius:12px}.card:hover{border-color:#087f7a;transform:translateY(-2px)}.card span{font-size:11px;color:#087f7a}.card h2{font-size:19px;line-height:1.4;margin:0}.card p{font-size:12px;color:#62726c}.card b{font-size:12px;color:#087f7a;margin-top:auto}.note{margin-top:28px;background:#e8efea;padding:22px;border-radius:10px}.note h2{font-size:16px}.note p{font-size:13px}a{color:#087f7a}code{background:#fff;padding:2px 6px;border-radius:3px}footer{font-size:12px;color:#62726c;margin-top:24px}@media(max-width:760px){.grid{grid-template-columns:1fr}main{padding:30px 18px}}
</style><main><header><div class="eyebrow">PAPER ARGUMENT MAP / V0.1</div><h1>沿着依据，读懂研究逻辑。</h1><p>三篇金融／经济学实证论文，三张可以回到原文核对的论证图。先看问题、缺口和贡献，再展开模型推断与待核对的条件。</p></header><div class="grid">'''+''.join(cards)+'''</div><section class="note"><h2>如何试用</h2><p>点击节点或箭头查看依据；切换“文字提纲”比较阅读方式。接受、排除或编辑解读后，使用“导出修订 JSON”或“保存阅读报告”保存，原文件不会自动更新。</p><p>分析新论文：在新的 Codex 对话中使用 <code>$paper-argument-map</code> 并附上论文。当前版本由助手进行分析，离线报告负责展示和修订。</p><p>这些样例基于摘要与引言，由助手辅助重建，未经独立专家标注。来源匹配不代表论证有效，也不代表因果关系已被识别。</p></section><footer>论文摘录保留原作者与 CC BY 许可；各报告内附出处。此页面及阅读器离线工作，不包含遥测。<br><a href="https://github.com/Zhenyu-Zane/paper-argument-map">GitHub 私有仓库 ↗</a> · <a href="paper-argument-map-skill.zip">下载 Skill 安装包</a></footer></main></html>'''
    (args.out/'index.html').write_text(index,encoding='utf-8')
    skill=ROOT/'skills/paper-argument-map'
    with zipfile.ZipFile(args.out/'paper-argument-map-skill.zip','w',zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(skill.rglob('*')):
            if source.is_file() and '__pycache__' not in source.parts and source.suffix!='.pyc':
                archive.write(source,Path('paper-argument-map')/source.relative_to(skill))
    print(f'Built {len(cards)} example reports, JSON files, launch page and skill archive in {args.out}')

if __name__=='__main__':
    main()
