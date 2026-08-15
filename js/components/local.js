// ============================================================
//  local.js — Pestaña "Local" de tiendas del vecindario
//  Muestra fotos-cartel de tiendas locales del scraper de FB
//  Agrupadas por día: Hoy / Ayer — Deslizables en carrusel
// ============================================================

window.APP_Local = {

  // Cache de sesión para no re-pedir datos en cada visita al tab
  _cache: null,

  async load(container) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:55vh;text-align:center;">
        <div style="position:relative;width:56px;height:56px;margin-bottom:20px;">
          <svg viewBox="0 0 100 100" style="width:100%;height:100%;animation:spin 1.2s cubic-bezier(0.5,0,0.5,1) infinite;">
            <circle cx="50" cy="50" r="40" stroke="var(--orange-100)" stroke-width="8" fill="none"/>
            <circle cx="50" cy="50" r="40" stroke="var(--primary)" stroke-width="8" fill="none" stroke-dasharray="200" stroke-dashoffset="140" stroke-linecap="round"/>
          </svg>
        </div>
        <p style="color:var(--text-secondary);font-size:14px;">Cargando ofertas locales...</p>
      </div>
      <style>@keyframes spin{100%{transform:rotate(360deg)}}</style>`;

    let posts = this._cache;

    if (!posts) {
      try {
        const res = await fetch(`/api/local?t=${Date.now()}`);
        posts = res.ok ? await res.json() : [];
      } catch (e) {
        posts = [];
      }
      this._cache = posts;
    }

    this.render(container, posts);
  },

  render(container, posts) {
    // ── Agrupar por tienda ───────────────────────────────────
    const tiendaMap = {};
    for (const p of posts) {
      const key = p.tienda || 'Desconocida';
      if (!tiendaMap[key]) tiendaMap[key] = [];
      tiendaMap[key].push(p);
    }
    // Convertir a array ordenado
    const grupos = Object.entries(tiendaMap).map(([nombre, items]) => ({ nombre, items }));
    this._grupos = tiendaMap; // Guardar referencia para el lightbox

    const hayDatos = grupos.length > 0;

    container.innerHTML = `
      <style>
        /* ── Carrusel ── */
        .local-group-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 18px 0 10px 2px;
        }
        .local-carousel-wrap {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          margin-bottom: 8px;
        }
        .local-carousel-track {
          display: flex;
          transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
        }
        .local-slide {
          min-width: 100%;
          position: relative;
          user-select: none;
        }
        .local-slide img {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 18px;
          display: block;
          background: var(--gray-100);
        }
        .local-slide-no-img {
          width: 100%;
          aspect-ratio: 4/3;
          background: var(--surface);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          border: 1px solid var(--border);
        }
        /* Badges */
        .badge-tienda {
          position: absolute;
          bottom: 14px;
          left: 14px;
          background: rgba(0,0,0,0.62);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 11px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 5px;
          max-width: 60%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .badge-tiempo {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          white-space: nowrap;
        }
        /* Indicadores de puntos */
        .local-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          padding: 10px 0 4px;
        }
        .local-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--border);
          transition: background 0.2s, transform 0.2s;
        }
        .local-dot.active {
          background: var(--primary);
          transform: scale(1.4);
        }
        /* Botón ver publicación */
        .btn-ver-pub {
          display: block;
          text-align: center;
          padding: 6px 0 2px;
          font-size: 12px;
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
          opacity: 0.85;
        }
        .btn-ver-pub:active { opacity: 0.5; }
        /* Lightbox */
        #local-lightbox {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.96);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: lbFadeIn 0.2s ease;
        }
        @keyframes lbFadeIn { from{opacity:0} to{opacity:1} }
        #local-lightbox img {
          max-width: 100vw;
          max-height: 88vh;
          object-fit: contain;
          border-radius: 4px;
          touch-action: pinch-zoom;
          transition: transform 0.15s ease;
          cursor: zoom-in;
        }
        #local-lightbox img.zoomed { cursor: zoom-out; }
        #lb-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: none;
          color: #fff;
          font-size: 20px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 10;
        }
        .lb-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          color: white;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          backdrop-filter: blur(4px);
          z-index: 10;
          opacity: 0.7;
        }
        .lb-nav:hover { opacity: 1; background: rgba(255,255,255,0.2); }
        #lb-prev { left: 16px; }
        #lb-next { right: 16px; }
        #lb-caption {
          position: absolute;
          bottom: 20px;
          left: 0; right: 0;
          text-align: center;
          color: rgba(255,255,255,0.75);
          font-size: 13px;
          padding: 0 20px;
          z-index: 10;
        }
        #lb-fb-link {
          position: absolute;
          bottom: 44px;
          left: 0; right: 0;
          text-align: center;
          color: var(--primary);
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        }
        /* Estado vacío */
        .local-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          gap: 12px;
        }
        .local-empty-icon { font-size: 52px; }
        .local-empty h3 { font-size: 17px; font-weight: 700; color: var(--text); margin: 0; }
        .local-empty p  { font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5; }
      </style>

      ${!hayDatos ? this._emptyHTML() : ''}

      ${grupos.map(g => {
        const id = 'grupo-' + g.nombre.replace(/[^a-zA-Z0-9]/g, '_');
        return this._groupHTML('🏪 ' + g.nombre, id, g.items);
      }).join('')}

      <div style="height: 40px;"></div>
    `;

    // ── Inicializar carruseles ────────────────────────────────
    grupos.forEach(g => {
      const id = 'grupo-' + g.nombre.replace(/[^a-zA-Z0-9]/g, '_');
      if (g.items.length > 0) this._initCarousel(id, g.items.length);
    });
  },

  _groupHTML(titulo, id, posts) {
    // grupoKey es el nombre de la tienda para indexar en this._grupos
    const grupoKey = posts[0]?.tienda || id;
    const slides = posts.map((p, i) => {
      const imgClickHandler = p.imagen_url
        ? `onclick="APP_Local.openLightbox('${grupoKey}', ${i})" style="cursor:pointer;"`
        : '';

      const imgHTML = p.imagen_url
        ? `<img src="${p.imagen_url}" alt="Oferta ${p.tienda}" loading="lazy" ${imgClickHandler} onerror="this.parentElement.innerHTML='<div class=\\'local-slide-no-img\\'>🏪</div>'">`
        : `<div class="local-slide-no-img">🏪</div>`;

      const tiempo = this._formatTiempo(p.fecha_guardado);

      return `
        <div class="local-slide" data-idx="${i}">
          ${imgHTML}
          <div class="badge-tienda">🏪 ${this._esc(p.tienda)}</div>
          <div class="badge-tiempo">🕐 ${tiempo}</div>
        </div>`;
    }).join('');

    const dots = posts.length > 1
      ? `<div class="local-dots" id="${id}-dots">
           ${posts.map((_, i) => `<div class="local-dot ${i === 0 ? 'active' : ''}" data-i="${i}"></div>`).join('')}
         </div>`
      : '';

    // Link "Ver publicación" del post activo (se actualiza al deslizar)
    const firstHref = posts[0]?.post_url?.startsWith('http') ? posts[0].post_url : (posts[0]?.pagina_facebook || '#');

    return `
      <div class="local-group-title">${titulo} &nbsp;<span style="font-weight:400;color:var(--text-muted);font-size:11px;">${posts.length} publicación${posts.length !== 1 ? 'es' : ''}</span></div>
      <div class="local-carousel-wrap" id="${id}-wrap">
        <div class="local-carousel-track" id="${id}-track">
          ${slides}
        </div>
      </div>
      ${dots}
      <a class="btn-ver-pub" id="${id}-link" href="${firstHref}" target="_blank" rel="noopener">Ver publicación en Facebook ↗</a>
    `;
  },

  _initCarousel(id, total) {
    if (total <= 1) return;

    const track = document.getElementById(`${id}-track`);
    const dotsContainer = document.getElementById(`${id}-dots`);
    const link = document.getElementById(`${id}-link`);
    const wrap = document.getElementById(`${id}-wrap`);

    if (!track || !wrap) return;

    let current = 0;
    let startX = 0, startY = 0, isDragging = false, moved = false;

    // Reconstruimos los posts del DOM para el link
    const slides = track.querySelectorAll('.local-slide');

    const goTo = (idx) => {
      if (idx < 0 || idx >= total) return;
      current = idx;
      track.style.transform = `translateX(-${current * 100}%)`;

      // Actualizar dots
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.local-dot').forEach((d, i) => {
          d.classList.toggle('active', i === current);
        });
      }

      // Actualizar link
      if (link) {
        const slide = slides[current];
        // Buscamos el href en el data original via índice
        link.href = link.getAttribute('data-href-' + current) || link.href;
      }
    };

    // Guardar hrefs por índice en el link element
    slides.forEach((s, i) => {
      // Leer desde el span invisible que inyectamos
      // No tenemos acceso aquí al objeto post, así que extraemos del slide mismo
    });

    // Touch / Mouse events en el wrapper
    const onStart = (x, y) => { startX = x; startY = y; isDragging = true; moved = false; };
    const onEnd = (x, y) => {
      if (!isDragging) return;
      isDragging = false;
      const dx = x - startX;
      const dy = y - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
        goTo(dx < 0 ? current + 1 : current - 1);
      }
    };

    wrap.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    wrap.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY), { passive: true });
    wrap.addEventListener('mousedown',  e => onStart(e.clientX, e.clientY));
    wrap.addEventListener('mouseup',    e => onEnd(e.clientX, e.clientY));

    // Click en dots
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.local-dot').forEach(dot => {
        dot.addEventListener('click', () => goTo(parseInt(dot.dataset.i)));
      });
    }
  },

  _emptyHTML() {
    return `
      <div class="local-empty">
        <div class="local-empty-icon">🏪</div>
        <h3>Sin ofertas locales aún</h3>
        <p>Aquí verás las publicaciones de tiendas locales con carteles de precios de las últimas 48 horas.</p>
        <p style="font-size:11px;opacity:0.6;margin-top:4px;">Corre el scraper de Facebook para poblar este apartado.</p>
      </div>`;
  },

  // ── Helpers ──────────────────────────────────────────────

  _diasDesde(isoString) {
    if (!isoString) return 99;
    const ahora = new Date();
    const fecha = new Date(isoString);
    const diffMs = ahora - fecha;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  _labelDia(offset) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
  },

  _formatTiempo(isoString) {
    if (!isoString) return 'Reciente';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)  return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `hace ${hrs} h`;
    return `hace ${Math.floor(hrs / 24)} d`;
  },

  _esc(str) {
    return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  openLightbox(grupoKey, startIndex) {
    const posts = this._grupos && this._grupos[grupoKey] ? this._grupos[grupoKey] : [];
    if (!posts || posts.length === 0) return;

    let currentIndex = startIndex;

    // Eliminar lightbox previo
    const existing = document.getElementById('local-lightbox');
    if (existing) existing.remove();

    const lb = document.createElement('div');
    lb.id = 'local-lightbox';

    lb.innerHTML = `
      <button id="lb-close" title="Cerrar">✕</button>
      <button id="lb-prev" class="lb-nav" style="display:none;">❮</button>
      <button id="lb-next" class="lb-nav" style="display:none;">❯</button>
      <img id="lb-img" src="" alt="">
      <a id="lb-fb-link" href="#" target="_blank" rel="noopener">Ver publicación en Facebook ↗</a>
      <div id="lb-caption"></div>
    `;

    document.body.appendChild(lb);

    const imgEl = document.getElementById('lb-img');
    const captionEl = document.getElementById('lb-caption');
    const fbLinkEl = document.getElementById('lb-fb-link');
    const btnPrev = document.getElementById('lb-prev');
    const btnNext = document.getElementById('lb-next');
    let zoomed = false;

    const updateView = () => {
      const p = posts[currentIndex];
      imgEl.src = p.imagen_url;
      imgEl.alt = p.tienda;
      captionEl.textContent = `🏪 ${p.tienda} (${currentIndex + 1} de ${posts.length})`;
      
      const postUrl = p.post_url || p.pagina_facebook;
      if (postUrl && postUrl.startsWith('http')) {
        fbLinkEl.href = postUrl;
        fbLinkEl.style.display = 'block';
      } else {
        fbLinkEl.style.display = 'none';
      }

      btnPrev.style.display = posts.length > 1 ? 'flex' : 'none';
      btnNext.style.display = posts.length > 1 ? 'flex' : 'none';
      
      // Reset zoom al cambiar de foto
      if (zoomed) {
        zoomed = false;
        imgEl.style.transform = 'scale(1)';
        imgEl.classList.remove('zoomed');
      }
    };

    updateView();

    // Navegación
    const goPrev = (e) => { if(e) e.stopPropagation(); currentIndex = (currentIndex - 1 + posts.length) % posts.length; updateView(); };
    const goNext = (e) => { if(e) e.stopPropagation(); currentIndex = (currentIndex + 1) % posts.length; updateView(); };

    btnPrev.addEventListener('click', goPrev);
    btnNext.addEventListener('click', goNext);

    // Cerrar al hacer clic en fondo o botón X
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target.id === 'lb-close') lb.remove();
    });

    // Doble toque / doble clic para zoom
    imgEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      zoomed = !zoomed;
      imgEl.style.transform = zoomed ? 'scale(2)' : 'scale(1)';
      imgEl.classList.toggle('zoomed', zoomed);
    });

    // Gestos táctiles (Swipe)
    let startX = 0, startY = 0;
    lb.addEventListener('touchstart', e => { 
      startX = e.touches[0].clientX; 
      startY = e.touches[0].clientY; 
    }, { passive: true });
    
    lb.addEventListener('touchend', e => {
      if (zoomed) return; // Si hay zoom, no cambiar de slide
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        // Swipe horizontal
        if (dx < 0) goNext();
        else goPrev();
      } else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
        // Swipe abajo para cerrar
        lb.remove();
      }
    }, { passive: true });

    // Teclas
    const onKey = e => { 
      if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', onKey); }
      else if (e.key === 'ArrowRight' && !zoomed) goNext();
      else if (e.key === 'ArrowLeft' && !zoomed) goPrev();
    };
    document.addEventListener('keydown', onKey);
  }
};
