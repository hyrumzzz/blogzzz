/* resenas.js - pestana de reseñas (РЕЦЕНЗИИ) e imagenes en los textos.
   Se carga con una linea al final de index.html. Las reseñas son .txt dentro de la carpeta resenas/ */
(function () {
  const TAB = "resenas", CARPETA_R = "resenas", TITULO = "РЕЦЕНЗИИ";
  const IMG_RE = /^@@(https?:\/\/[^|\s@]+|[\w\-.]+\.(?:jpe?g|png|webp|gif))(?:\|([^@\n]*))?@@$/i;
  const src = u => u.replace(/^http:\/\//i, "https://");

  /* ---------- estilos ---------- */
  const st = document.createElement("style");
  st.textContent = `
.box{display:flow-root}
.img{float:right;display:block;width:34%;max-width:170px;margin:4px 0 8px 14px}
.img img{display:block;width:100%;height:auto;border:1px solid var(--fg)}
.img .cap{display:block;color:var(--dim);font-size:13px;line-height:1.3;margin-top:4px}
.rrow{display:flex;gap:12px;border:1px solid var(--fg);padding:8px;margin:0 0 10px}
.rrow:hover,.rrow:focus{background:none;color:var(--fg);border-color:var(--red)}
.rrow img{width:64px;height:64px;flex:none;object-fit:cover;border:1px solid var(--fg)}
.rrow .info{min-width:0;flex:1}
.rrow .t{font-weight:bold}
.rrow .ex{display:block;color:var(--dim);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stars{color:var(--red);letter-spacing:2px;white-space:nowrap}
.stars i{font-style:normal;color:var(--dim)}`;
  document.head.appendChild(st);

  /* ---------- imagen dentro de un texto: @@https://link|pie@@ (en su propio parrafo) ---------- */
  const figura = (u, pie) => `<span class="img"><img src="${esc(src(u))}" loading="lazy" alt="" onerror="this.parentNode.remove()">${pie ? `<span class="cap">${esc(pie)}</span>` : ""}</span>`;
  const fx0 = window.fx;
  window.fx = s => { const m = String(s).trim().match(IMG_RE); return m ? figura(m[1], m[2]) : fx0(s); };

  /* ---------- utilidades ---------- */
  const est = n => { n = Math.max(0, Math.min(5, n)); const f = Math.floor(n), h = n % 1 >= .5; return "★".repeat(f) + (h ? "½" : "") + "<i>" + "☆".repeat(5 - f - (h ? 1 : 0)) + "</i>"; };
  const sinfx = s => s.replace(FX_RE, (m, a, b, c, d, e, f) => a ?? b ?? c ?? d ?? f);

  /* ---------- lectura de la carpeta resenas/ ---------- */
  async function leerLista() {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${CARPETA_R}`);
    if (r.status === 404) return [];
    if (!r.ok) throw new Error(r.status);
    const files = await r.json();
    return files.filter(f => f.type === "file" && /\.txt$/i.test(f.name)).map(f => {
      const base = f.name.replace(/\.txt$/i, "");
      const m = base.match(/^(\d{4}-\d{2}-\d{2}(?:-\d{1,2})?)\s+(.+)$/);
      return { name: f.name, id: "r-" + slug(base), orden: m ? m[1] : "", titulo: m ? m[2] : base };
    }).sort((a, b) => b.orden.localeCompare(a.orden) || a.titulo.localeCompare(b.titulo));
  }
  let LISTA = null;
  const cargar = () => LISTA || (LISTA = leerLista().catch(e => { LISTA = null; throw e; }));

  /* Formato de cada .txt:  linea 1 = estrellas (ej. 4.5), linea 2 = link de la imagen o nombre de un archivo del repo (opcional), el resto = texto */
  function datos(x) {
    return x.d || (x.d = fetch(`${CARPETA_R}/${encodeURIComponent(x.name)}?v=${Date.now()}`, { cache: "no-store" })
      .then(r => { if (!r.ok) throw 0; return r.text(); })
      .then(t => {
        const l = t.replace(/\r/g, "").trim().split("\n");
        let r = null, img = "";
        if (l.length && /^\d(?:[.,][05])?$/.test(l[0].trim())) r = parseFloat(l.shift().replace(",", "."));
        if (l.length && /^(?:https?:\/\/\S+|[\w\-.]+\.(?:jpe?g|png|webp|gif))$/i.test(l[0].trim())) img = l.shift().trim();
        return { r, img, texto: l.join("\n").trim().split(/\n\s*\n/).filter(Boolean) };
      })
      .catch(() => ({ falla: true, texto: [] })));
  }

  /* ---------- vistas ---------- */
  async function vistaLista(h) {
    app.innerHTML = "<p class='dim'>cargando...</p>";
    try {
      const l = await cargar();
      const d = await Promise.all(l.map(datos));
      if (actual() !== h) return;
      app.innerHTML = `<h2>&gt; ${TITULO}</h2>` + (l.map((x, i) => {
        const t = d[i];
        const ex = sinfx((t.texto || []).find(p => !IMG_RE.test(p.trim())) || "").replace(/\s+/g, " ");
        return `<a class="rrow" href="#${x.id}">${t.img ? `<img src="${esc(src(t.img))}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="info"><span class="t">${esc(x.titulo)}</span><br>${t.r != null ? `<span class="stars">${est(t.r)}</span>` : ""}<span class="ex">${esc(ex)}</span></span></a>`;
      }).join("") || "<p class='dim'>No hay reseñas todavía.</p>");
    } catch (e) {
      if (actual() === h) app.innerHTML = "<div class='box'>No se pudieron cargar las reseñas.</div>";
    }
  }

  async function vistaResena(h) {
    app.innerHTML = "<p class='dim'>cargando...</p>";
    try {
      const x = (await cargar()).find(y => y.id === h);
      if (!x) { location.hash = TAB; return; }
      const t = await datos(x);
      if (actual() !== h) return;
      if (t.falla) { app.innerHTML = `<div class='box'>Esta reseña aún se está publicando. Intenta de nuevo en un minuto.</div><a href="#${TAB}">&lt;-- volver</a>`; return; }
      app.innerHTML = `<div class="row"><h2>&gt; ${esc(x.titulo)}</h2>${t.r != null ? `<span class="f stars">${est(t.r)}</span>` : ""}</div><div class="box body">${t.img ? figura(t.img, x.titulo) : ""}${parrafos(t.texto)}</div><a href="#${TAB}">&lt;-- volver</a>`;
    } catch (e) {
      if (actual() === h) app.innerHTML = "<div class='box'>No se pudo cargar la reseña.</div>";
    }
  }

  /* ---------- enganche con la pagina ---------- */
  function ruta() {
    const h = actual();
    if (h === TAB) vistaLista(h);
    else if (h.startsWith("r-")) vistaResena(h);
  }
  addEventListener("hashchange", ruta);
  const render0 = window.render;
  window.render = async function () { await render0(); ruta(); };

  const nav = document.querySelector("nav");
  if (nav) {
    const a = document.createElement("a");
    a.href = "#" + TAB;
    a.textContent = `[ ${TITULO.toLowerCase()} ]`;
    nav.insertBefore(a, nav.querySelector('a[href="#acerca"]'));
  }
})();
