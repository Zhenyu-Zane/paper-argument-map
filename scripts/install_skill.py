"""Install the bundled skill without replacing an existing installation."""
from pathlib import Path
import argparse
import os
import shutil

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, help='Parent directory for installed skills.')
    args=parser.parse_args()
    source=Path(__file__).resolve().parents[1]/'skills'/'paper-argument-map'
    parent=args.destination or Path(os.environ.get('CODEX_HOME', str(Path.home()/'.codex')))/'skills'
    target=parent/'paper-argument-map'
    if target.exists():
        parser.exit(1, f'Refusing to replace existing installation: {target}\n')
    parent.mkdir(parents=True,exist_ok=True)
    shutil.copytree(source,target,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    print(f'Installed: {target}')
    print('Open a new Codex chat to discover $paper-argument-map.')

if __name__=='__main__':
    main()
