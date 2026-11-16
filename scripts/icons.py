from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1] / 'src' / 'icons'
root.mkdir(parents=True, exist_ok=True)
for name, size in [('icon-192.png',192),('icon-512.png',512),('maskable-512.png',512),('apple-touch-icon.png',180)]:
    im = Image.new('RGB',(size,size),'#f4f8ef')
    d=ImageDraw.Draw(im)
    pad=size*.18
    d.rounded_rectangle((pad,pad,size-pad,size-pad),radius=int(size*.1),fill='#287458')
    d.rounded_rectangle((pad+size*.025,pad+size*.025,size-pad-size*.025,size-pad-size*.025),radius=int(size*.08),outline='#a7c8a9',width=max(1,int(size*.008)))
    font=ImageFont.truetype('C:/Windows/Fonts/simsun.ttc',int(size*.43))
    d.text((size/2,size/2),'拾',font=font,fill='#fffdf2',anchor='mm')
    im.save(root/name)
print('Created 4 PNG icons')
