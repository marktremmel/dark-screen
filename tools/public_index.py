# The public index.html: the school page with lesson codes off and the app's loading screen (art from assets/splash).
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
old = '<div id="loading"><div class="ltitle">SÖTÉT KÉPERNYŐ</div><div id="lbar"><div id="lfill"></div></div><div id="lmsg">Loading…</div></div>'
new = '''<div id="loading">
  <div id="loading-backdrop" class="loading-backdrop">
    <div id="loading-art-a" class="loading-art active"></div>
    <div id="loading-art-b" class="loading-art"></div>
    <div class="loading-vignette"></div>
    <div class="loading-scanlines"></div>
  </div>
  <div class="loading-content">
    <div class="ltitle">SÖTÉT KÉPERNYŐ</div>
    <div id="lstage" class="loading-stage"></div>
    <div id="lbar"><div id="lfill"></div></div>
    <div id="lmsg">Loading…</div>
    <div id="lquote" class="loading-quote"></div>
  </div>
</div>
<script>window.SK_LOCKS = false; // public build: no lesson codes</script>'''
assert old in s and s.count('touch_controls.js') == 1
open(dst, 'w', encoding='utf-8').write(s.replace(old, new))
