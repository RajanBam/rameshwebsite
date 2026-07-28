import { useState } from 'preact/hooks';
import { downloadBlob } from '../../lib/format';

/** Link-in-bio page builder. Everything is entered locally and exported as a
 *  single self-contained HTML file the user can host free anywhere (GitHub
 *  Pages, Netlify, Cloudflare Pages). No account, no subscription, nothing
 *  uploaded. This is the free answer to the paid "bio page" upsell. */
interface LinkRow { id: number; label: string; url: string; }
const THEMES = {
  midnight: { label: 'Midnight', bg: '#0f1720', card: '#1c2530', text: '#f8fafc', sub: '#94a3b8', accent: '#38bdf8' },
  sunset: { label: 'Sunset', bg: '#1a1020', card: '#2a1830', text: '#fdf2f8', sub: '#d8b4d8', accent: '#f472b6' },
  forest: { label: 'Forest', bg: '#0c1a12', card: '#14261b', text: '#f0fdf4', sub: '#a7c4b0', accent: '#4ade80' },
  paper: { label: 'Paper', bg: '#f5f5f4', card: '#ffffff', text: '#1c1917', sub: '#78716c', accent: '#2563eb' },
} as const;
type ThemeKey = keyof typeof THEMES;

let nextId = 3;

function buildHtml(name: string, bio: string, avatar: string, links: LinkRow[], t: (typeof THEMES)[ThemeKey]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const linkHtml = links.filter((l) => l.label && l.url).map((l) =>
    `      <a class="lnk" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('\n');
  const avatarHtml = avatar
    ? `<img class="avatar" src="${avatar}" alt="${esc(name)}" />`
    : `<div class="avatar avatar-ph">${esc((name || '?').charAt(0).toUpperCase())}</div>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(name || 'My links')}</title>
<meta name="description" content="${esc(bio)}" />
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: ${t.bg}; color: ${t.text}; min-height: 100vh;
    display: flex; justify-content: center; padding: 3rem 1.25rem; }
  .wrap { width: 100%; max-width: 520px; text-align: center; }
  .avatar { width: 104px; height: 104px; border-radius: 50%; object-fit: cover;
    margin: 0 auto 1.25rem; display: block; border: 3px solid ${t.accent}; }
  .avatar-ph { display: grid; place-items: center; font-size: 2.5rem; font-weight: 700;
    background: ${t.card}; color: ${t.accent}; }
  h1 { font-size: 1.5rem; letter-spacing: -0.01em; }
  p.bio { color: ${t.sub}; margin: 0.5rem auto 2rem; max-width: 34ch; line-height: 1.5; }
  .lnk { display: block; background: ${t.card}; color: ${t.text}; text-decoration: none;
    padding: 1rem 1.25rem; border-radius: 14px; margin-bottom: 0.85rem; font-weight: 600;
    transition: transform .15s ease, box-shadow .15s ease; box-shadow: 0 2px 12px rgba(0,0,0,0.18); }
  .lnk:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.28); }
  footer { margin-top: 2.5rem; color: ${t.sub}; font-size: 0.8rem; }
</style>
</head>
<body>
  <main class="wrap">
    ${avatarHtml}
    <h1>${esc(name || 'Your name')}</h1>
    <p class="bio">${esc(bio)}</p>
${linkHtml}
    <footer>Made with a free tool. Hosted by you.</footer>
  </main>
</body>
</html>`;
}

export default function LinkInBio() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [theme, setTheme] = useState<ThemeKey>('midnight');
  const [links, setLinks] = useState<LinkRow[]>([
    { id: 1, label: 'My website', url: 'https://' },
    { id: 2, label: 'Instagram', url: 'https://' },
  ]);

  const t = THEMES[theme];
  const html = buildHtml(name, bio, avatar, links, t);

  const setLink = (id: number, patch: Partial<LinkRow>) =>
    setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const onAvatar = (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setAvatar(r.result as string);
    r.readAsDataURL(f);
  };

  return (
    <div class="tool-card">
      <div class="lib-grid">
        <div class="lib-form">
          <div class="field">
            <label class="field-label">Your name</label>
            <input class="text-input" value={name} placeholder="Ramesh Kadariya"
              onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label class="field-label">Short bio</label>
            <input class="text-input" value={bio} placeholder="Developer, maker, coffee enthusiast"
              onInput={(e) => setBio((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label class="field-label">Photo (optional)</label>
            <input class="text-input" type="file" accept="image/*" onChange={onAvatar} style="padding:0.4rem" />
          </div>
          <div class="field">
            <label class="field-label">Theme</label>
            <div class="theme-row">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <button key={k} class={`theme-chip ${theme === k ? 'on' : ''}`} onClick={() => setTheme(k)}
                  style={`background:${THEMES[k].bg};color:${THEMES[k].text};border-color:${theme === k ? THEMES[k].accent : 'transparent'}`}>
                  {THEMES[k].label}
                </button>
              ))}
            </div>
          </div>

          <label class="field-label">Links</label>
          {links.map((l) => (
            <div class="link-edit" key={l.id}>
              <input class="text-input" value={l.label} placeholder="Label"
                onInput={(e) => setLink(l.id, { label: (e.target as HTMLInputElement).value })} />
              <input class="text-input" value={l.url} placeholder="https://…"
                onInput={(e) => setLink(l.id, { url: (e.target as HTMLInputElement).value })} />
              <button class="fr-remove" title="Remove" onClick={() => setLinks((ls) => ls.filter((x) => x.id !== l.id))}>✕</button>
            </div>
          ))}
          <button class="btn btn-ghost" style="margin-top:0.5rem" onClick={() => setLinks((ls) => [...ls, { id: nextId++, label: '', url: 'https://' }])}>
            + Add link
          </button>

          <div class="btn-row">
            <button class="btn btn-primary" onClick={() => downloadBlob(new Blob([html], { type: 'text/html' }), (name.trim().toLowerCase().replace(/\s+/g, '-') || 'my-links') + '.html')}>
              Download page (HTML)
            </button>
          </div>
          <p class="method-note">Download the file and upload it to any free host (GitHub Pages, Netlify, Cloudflare Pages). It is one self-contained file, so it just works.</p>
        </div>

        <div class="lib-preview">
          <span class="pv-label">Live preview</span>
          <iframe class="pv-frame" title="preview" srcDoc={html} />
        </div>
      </div>
      <style>{`
        .lib-grid { display:grid; grid-template-columns:1fr 300px; gap:1.5rem; }
        .theme-row { display:flex; gap:0.5rem; flex-wrap:wrap; }
        .theme-chip { padding:0.45rem 0.9rem; border-radius:10px; border:2px solid transparent; cursor:pointer; font-size:var(--t-small); font-weight:500; }
        .theme-chip.on { box-shadow:0 0 0 1px currentColor; }
        .link-edit { display:grid; grid-template-columns:1fr 1.4fr auto; gap:0.5rem; align-items:center; margin-bottom:0.5rem; }
        .method-note { font-size:0.82rem; color:var(--dim); margin-top:0.75rem; line-height:1.5; }
        .lib-preview { position:sticky; top:70px; align-self:start; }
        .pv-label { display:block; font-size:var(--t-small); color:var(--dim); margin-bottom:0.5rem; }
        .pv-frame { width:100%; height:520px; border:1px solid var(--hairline); border-radius:var(--radius-sm); background:#fff; }
        @media (max-width:760px){ .lib-grid{ grid-template-columns:1fr; } .lib-preview{ position:static; } .pv-frame{ height:440px; } }
      `}</style>
    </div>
  );
}
