from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
root=Path(__file__).resolve().parents[1]
target=root.parent/'shigu-classics.zip'
folders=['src','dist','scripts','tests','qa']
files=[root/name for name in ['README.md','package.json','package-lock.json']]
for folder in folders:
    files.extend(path for path in (root/folder).rglob('*') if path.is_file() and '__pycache__' not in path.parts)
with ZipFile(target,'w',ZIP_DEFLATED) as archive:
    for file in sorted(files):
        archive.write(file,Path('shigu-classics')/file.relative_to(root))
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert 'shigu-classics/dist/index.html' in archive.namelist()
    assert 'shigu-classics/dist/content/g9b4.js' in archive.namelist()
    print('PACKAGE_VERIFIED',target)
    print('Files',len(archive.namelist()),'Bytes',target.stat().st_size)
print('SHA256',sha256(target.read_bytes()).hexdigest())
