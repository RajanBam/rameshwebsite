// Ghostscript worker: compresses a PDF off the main thread so the page
// stays responsive. Loaded as a module worker from /gs/gs-worker.js.
// Message in: { data: ArrayBuffer, setting: '/ebook' | '/screen' | ... }
// Messages out: { type: 'page', page } progress, then
//               { type: 'done', out: Uint8Array } or { type: 'error', message }.
self.onmessage = async (e) => {
  const { data, setting } = e.data;
  try {
    const initGs = (await import('./gs.mjs')).default;
    const mod = await initGs({
      noInitialRun: true,
      locateFile: (f) => new URL(f, self.location.href).href,
      print: (line) => {
        const m = /^Page (\d+)/.exec(line);
        if (m) self.postMessage({ type: 'page', page: Number(m[1]) });
      },
      printErr: () => {},
    });
    mod.FS.writeFile('in.pdf', new Uint8Array(data));
    const code = mod.callMain([
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.5',
      `-dPDFSETTINGS=${setting}`,
      '-dNOPAUSE', '-dBATCH',
      '-o', 'out.pdf',
      'in.pdf',
    ]);
    if (code !== 0 && code !== undefined) throw new Error('Ghostscript exited with code ' + code);
    const out = mod.FS.readFile('out.pdf');
    self.postMessage({ type: 'done', out }, [out.buffer]);
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
  }
};
