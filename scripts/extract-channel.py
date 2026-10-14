# Превращает сохранённые страницы каналов (t.me/s/<канал>, «Сохранить как HTML») в posts.json.
# Запуск: python3 scripts/extract-channel.py <папка с .html> [куда сохранить, по умолчанию posts.json]
# Нужен: pip install beautifulsoup4 lxml
import sys,json,glob,re
from bs4 import BeautifulSoup
d=(sys.argv[1] if len(sys.argv)>1 else '.').rstrip('/')+'/'
out={}
for f in glob.glob(d+'*.html'):
    s=open(f,encoding='utf-8').read()
    key='cosmetic' if 'kupol_cosmetic' in s[:200] else 'model'
    soup=BeautifulSoup(s,'lxml')
    posts=[]
    for m in soup.select('.tgme_widget_message'):
        t=m.select_one('.tgme_widget_message_text')
        txt=t.get_text('\n').strip() if t else ''
        tm=m.select_one('time'); dt=tm.get('datetime') if tm else None
        pid=m.get('data-post')
        imgs=[re.search(r"url\('(.*?)'\)",p.get('style','')).group(1) for p in m.select('.tgme_widget_message_photo_wrap') if re.search(r"url\('(.*?)'\)",p.get('style',''))]
        views=m.select_one('.tgme_widget_message_views')
        posts.append(dict(id=pid,date=dt,text=txt,imgs=imgs,video=bool(m.select('video, .tgme_widget_message_video_player'))))
    out[key]=posts
    print(key,len(posts),sum(1 for p in posts if p['text']))
outp=sys.argv[2] if len(sys.argv)>2 else 'posts.json'
json.dump(out,open(outp,'w'),ensure_ascii=False,indent=1)
print('сохранено в',outp)
