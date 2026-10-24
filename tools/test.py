import sys, time, json
from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/sotet/game/index.html'
OUT = '/home/claude/sotet/build/shots/'
import os; os.makedirs(OUT, exist_ok=True)

def run(script, w=1280, h=720, prefix='t'):
    logs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'])
        ctx = b.new_context(viewport={'width': w, 'height': h})
        pg = ctx.new_page()
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[PAGEERROR] {e} :: {getattr(e,"stack","")[:600]}'))
        pg.goto(URL)
        n = [0]
        def shot(name):
            n[0] += 1; pg.screenshot(timeout=90000, path=f'{OUT}{prefix}{n[0]:02d}_{name}.png')
        def ev(js, arg=None): return pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)
        def key(code, ms=100): pg.keyboard.down(code); pg.wait_for_timeout(ms); pg.keyboard.up(code)
        script(pg, shot, ev, key)
        b.close()
    errs = [l for l in logs if 'error' in l.lower() or 'PAGEERROR' in l or 'warn' in l.lower()]
    print('\n'.join(errs[:40]) if errs else 'no errors/warnings')
    return logs
