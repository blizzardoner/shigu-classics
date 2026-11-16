import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse, unquote
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
UA={'User-Agent':'ShiguLearning/1.0 educational-reference-check'}

def check(lesson):
    refs=[]
    for source in lesson['sources']:
        url=source['url']
        page=unquote(urlparse(url).path.split('/wiki/',1)[-1])
        try:
            response=requests.get('https://zh.wikisource.org/w/api.php',params={'action':'parse','page':page,'prop':'text','format':'json','variant':'zh-hans','redirects':1},headers=UA,timeout=22)
            result=response.json()
            if 'parse' not in result:
                refs.append({'url':url,'status':'unavailable','error':result.get('error',{}).get('code','bad response')})
                continue
            soup=BeautifulSoup(result['parse']['text']['*'],'html.parser')
            for node in soup.select('.mw-editsection,.reference,script,style'): node.decompose()
            text=soup.get_text(' ',strip=True)
            refs.append({'url':url,'status':'retrieved','title':result['parse']['title'],'text':text})
        except Exception as exc:
            refs.append({'url':url,'status':'unavailable','error':type(exc).__name__})
    return {'id':lesson['id'],'title':lesson['title'],'references':refs}

lessons=json.loads((ROOT/'artifacts'/'content-inventory.json').read_text(encoding='utf-8'))
audit_path=ROOT/'artifacts'/'source-audit.json'
previous=json.loads(audit_path.read_text(encoding='utf-8')) if audit_path.exists() else []
cached={row['id']:row for row in previous if any(ref['status']=='retrieved' and not ref.get('text','').startswith('重定向') for ref in row['references'])}
rows=[cached.get(lesson['id']) or check(lesson) for lesson in lessons]
(ROOT/'artifacts'/'source-audit.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
for row in rows:
    print(row['title'],','.join(ref['status'] for ref in row['references']))
print('Retrieved:',sum(any(r['status']=='retrieved' for r in row['references']) for row in rows),'/',len(rows))
