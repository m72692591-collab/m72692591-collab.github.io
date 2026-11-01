"""Build an allowlisted static tree; never copy server files or repository secrets."""
from pathlib import Path
from urllib.parse import urlsplit
import argparse, hashlib, json, re, shutil

ROOT=Path(__file__).resolve().parents[1]
ALLOWED={'.html','.css','.js','.svg','.png','.webp','.jpg','.jpeg','.ico','.txt','.mp3','.m4a','.wav','.ogg'}

def origin(value):
    url=urlsplit(value)
    if (url.scheme!='https' or not url.hostname or url.username or url.password or url.port not in (None,443)
        or url.query or url.fragment or url.path not in ('','/') or not re.fullmatch(r'[A-Za-z0-9.-]+',url.hostname)):
        raise ValueError('Expected approved HTTPS origin without credentials, query or path')
    return 'https://'+url.hostname.lower()

def package(root, target, public_origin):
    public_origin=origin(public_origin)
    source=root/'maestro'
    if target.exists():
        raise FileExistsError('Output exists; choose a fresh directory, no automatic deletion')
    target.mkdir(parents=True)
    for item in source.rglob('*'):
        relative=item.relative_to(source)
        if item.is_symlink() or any(p.startswith('.') or p in {'server','admin'} for p in relative.parts):
            continue
        if not item.is_file() or item.suffix.lower() not in ALLOWED:
            continue
        destination=target/relative
        destination.parent.mkdir(parents=True,exist_ok=True)
        if item.suffix=='.html':
            text=item.read_text(encoding='utf-8')
            text=re.sub(r'(<meta\s+name="maestro-lead-endpoint"\s+content=")[^"]*(")',lambda m:m[1]+public_origin+'/api/leads'+m[2],text)
            destination.write_text(text,encoding='utf-8')
        else:
            shutil.copyfile(item,destination)
    index=(target/'index.html').read_text(encoding='utf-8')
    if public_origin+'/api/leads' not in index:
        raise ValueError('Receiver meta was not found; output is not ready')
    files={str(p.relative_to(target)):hashlib.sha256(p.read_bytes()).hexdigest() for p in target.rglob('*') if p.is_file()}
    return {'origin':public_origin,'files':files,'status':'packaged_not_deployed'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--origin',required=True)
    parser.add_argument('--output',type=Path,default=ROOT/'dist/maestro')
    args=parser.parse_args()
    result=package(ROOT,args.output,args.origin)
    args.output.parent.joinpath('package-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print('Packaged',len(result['files']),'public assets. No cloud resources changed.')
