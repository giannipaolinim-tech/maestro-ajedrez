# Prueba de humo en navegador headless (opcional). Requiere: pip install playwright && playwright install chromium
# Uso: python tests/smoke.py   (después de node scripts/build.js)
import pathlib
from playwright.sync_api import sync_playwright
url = (pathlib.Path(__file__).resolve().parent.parent / 'dist' / 'index.html').as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(300)
    # Caro-Kann: lección + práctica
    pg.click('[data-op="caro-kann"]'); pg.click('[data-line="cl-main"]')
    for _ in range(6): pg.click('[data-a="next"]')
    pg.click('[data-tab="practica"]'); pg.click('[data-line="cl-main"]'); pg.wait_for_timeout(700)
    pg.click('[data-sq="c7"]'); pg.click('[data-sq="c6"]'); pg.wait_for_timeout(700)
    # Viena con blancas
    pg.click('#back'); pg.click('[data-op="viena"]'); pg.click('[data-tab="practica"]'); pg.click('[data-line="bc-bc5"]'); pg.wait_for_timeout(300)
    for a, z in [('e2', 'e4'), ('b1', 'c3'), ('f1', 'c4'), ('d1', 'g4')]:
        pg.click(f'[data-sq="{a}"]'); pg.click(f'[data-sq="{z}"]'); pg.wait_for_timeout(700)
    # Holandesa: repertorio completo + examen + progreso
    pg.click('#back'); pg.click('[data-op="holandesa"]'); pg.click('[data-tab="practica"]'); pg.click('[data-line="__all"]'); pg.wait_for_timeout(800)
    pg.click('[data-sq="f7"]'); pg.click('[data-sq="f5"]'); pg.wait_for_timeout(800)
    pg.click('[data-tab="examen"]'); pg.click('[data-g="all"]'); pg.wait_for_timeout(300)
    pg.click('[data-tab="progreso"]')
    pg.screenshot(path='tests/ultima_captura.png', full_page=True)
    b.close()
print('Errores JS:', errs or 'ninguno')
