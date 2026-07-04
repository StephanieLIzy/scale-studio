const state = {
      canvas: { width: 4800, height: 2700, divisions: 4, gridStep: 100, mode: 'grid', bg: 'white' },
      zoom: 0.2,
      logos: [],
      selectedId: null,
      selectedIds: [],
      clipboard: null,
      panels: { left: true, right: true }
    };

    const els = {
      app: document.getElementById('app'),
      stage: document.getElementById('stage'),
      stageFrame: document.getElementById('stageFrame'),
      rulerTop: document.getElementById('rulerTop'),
      rulerLeft: document.getElementById('rulerLeft'),
      canvasSummary: document.getElementById('canvasSummary'),
      canvasW: document.getElementById('canvasW'),
      canvasH: document.getElementById('canvasH'),
      divisions: document.getElementById('divisions'),
      gridStep: document.getElementById('gridStep'),
      zoom: document.getElementById('zoom'),
      zoomReadout: document.getElementById('zoomReadout'),
      gridModeBtn: document.getElementById('gridModeBtn'),
      solidModeBtn: document.getElementById('solidModeBtn'),
      whiteBgBtn: document.getElementById('whiteBgBtn'),
      blackBgBtn: document.getElementById('blackBgBtn'),
      uploadBtn: document.getElementById('uploadBtn'),
      exportMenuBtn: document.getElementById('exportMenuBtn'),
      exportMenu: document.getElementById('exportMenu'),
      canvasWrap: document.getElementById('canvasWrap'),
      fileInput: document.getElementById('fileInput'),
      jsonInput: document.getElementById('jsonInput'),
      selectedPanel: document.getElementById('selectedPanel'),
      logoList: document.getElementById('logoList'),
      exportPngBtn: document.getElementById('exportPngBtn'),
      exportCsvBtn: document.getElementById('exportCsvBtn'),
      saveProjectBtn: document.getElementById('saveProjectBtn'),
      loadProjectBtn: document.getElementById('loadProjectBtn'),
      toggleLeftBtn: document.getElementById('toggleLeftBtn'),
      toggleRightBtn: document.getElementById('toggleRightBtn')
    };

    const uid = () => `logo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const selectedLogo = () => state.logos.find(logo => logo.id === state.selectedId) || null;
    const selectedLogos = () => state.logos.filter(logo => state.selectedIds.includes(logo.id));
    const isSelected = id => state.selectedIds.includes(id);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const normalizeAngle = value => ((value % 360) + 360) % 360;
    const MIN_ZOOM = 0.05;
    const MAX_ZOOM = 2;
    const screen = value => `${value * state.zoom}px`;

    function download(filename, content, type) {
      const blob = content instanceof Blob ? content : new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function getImageSize(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth || 300, height: image.naturalHeight || 160 });
        image.onerror = reject;
        image.src = src;
      });
    }

    function render() {
      renderPanels();
      renderCanvas();
      renderGuides();
      renderLogos();
      renderSelectedPanel();
      renderLogoList();
    }

    function centerCanvas() {
      requestAnimationFrame(() => {
        const maxLeft = Math.max(0, els.canvasWrap.scrollWidth - els.canvasWrap.clientWidth);
        els.canvasWrap.scrollLeft = maxLeft / 2;
      });
    }

    function renderPanels() {
      els.app.classList.toggle('left-collapsed', !state.panels.left);
      els.app.classList.toggle('right-collapsed', !state.panels.right);
      els.toggleLeftBtn.textContent = state.panels.left ? '‹' : '›';
      els.toggleRightBtn.textContent = state.panels.right ? '›' : '‹';
      els.toggleLeftBtn.title = state.panels.left ? '收起画布设置' : '展开画布设置';
      els.toggleRightBtn.title = state.panels.right ? '收起 Logo 面板' : '展开 Logo 面板';
      els.toggleLeftBtn.setAttribute('aria-label', els.toggleLeftBtn.title);
      els.toggleRightBtn.setAttribute('aria-label', els.toggleRightBtn.title);
    }

    function renderCanvas() {
      els.stage.style.width = screen(state.canvas.width);
      els.stage.style.height = screen(state.canvas.height);
      els.stage.style.backgroundColor = state.canvas.bg === 'black' ? '#111' : '#fff';
      els.stage.classList.toggle('dark', state.canvas.bg === 'black');
      els.canvasSummary.textContent = `${state.canvas.width} × ${state.canvas.height} mm workspace`;
      els.zoomReadout.value = `${Math.round(state.zoom * 100)}%`;
      els.gridModeBtn.classList.toggle('active', state.canvas.mode === 'grid');
      els.solidModeBtn.classList.toggle('active', state.canvas.mode === 'solid');
      els.whiteBgBtn.classList.toggle('active', state.canvas.bg === 'white');
      els.blackBgBtn.classList.toggle('active', state.canvas.bg === 'black');
    }

    function setZoom(nextZoom, anchorEvent = null) {
      const oldZoom = state.zoom;
      const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(zoom - oldZoom) < 0.001) return;

      let worldX = null;
      let worldY = null;
      if (anchorEvent) {
        const stageRect = els.stage.getBoundingClientRect();
        worldX = (anchorEvent.clientX - stageRect.left) / oldZoom;
        worldY = (anchorEvent.clientY - stageRect.top) / oldZoom;
      }

      state.zoom = zoom;
      els.zoom.value = Math.round(state.zoom * 100);
      render();

      if (anchorEvent && Number.isFinite(worldX) && Number.isFinite(worldY)) {
        const newStageRect = els.stage.getBoundingClientRect();
        els.canvasWrap.scrollLeft += newStageRect.left + worldX * state.zoom - anchorEvent.clientX;
        els.canvasWrap.scrollTop += newStageRect.top + worldY * state.zoom - anchorEvent.clientY;
      } else {
        centerCanvas();
      }
    }

    function setExportMenu(open) {
      els.exportMenu.classList.toggle('open', open);
      els.exportMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function setSelection(ids) {
      state.selectedIds = [...new Set(ids)].filter(id => state.logos.some(logo => logo.id === id));
      state.selectedId = state.selectedIds.at(-1) || null;
    }

    function clearSelection() {
      state.selectedIds = [];
      state.selectedId = null;
    }

    function selectOnly(id) {
      setSelection([id]);
    }

    function toggleSelection(id) {
      if (isSelected(id)) {
        setSelection(state.selectedIds.filter(selectedId => selectedId !== id));
      } else {
        setSelection([...state.selectedIds, id]);
      }
    }

    function renderGuides() {
      els.stage.querySelectorAll('.grid-line, .division-line').forEach(node => node.remove());
      els.rulerTop.innerHTML = '';
      els.rulerLeft.innerHTML = '';
      els.rulerTop.style.width = screen(state.canvas.width);
      els.rulerLeft.style.height = screen(state.canvas.height);

      if (state.canvas.mode === 'grid') {
        for (let x = state.canvas.gridStep; x < state.canvas.width; x += state.canvas.gridStep) {
          addLine('grid-line', x, 0, 1, state.canvas.height);
        }
        for (let y = state.canvas.gridStep; y < state.canvas.height; y += state.canvas.gridStep) {
          addLine('grid-line', 0, y, state.canvas.width, 1);
        }
      }

      const part = state.canvas.width / state.canvas.divisions;
      for (let i = 1; i < state.canvas.divisions; i++) {
        addLine('division-line', part * i, 0, 2 / state.zoom, state.canvas.height);
      }

      const major = state.canvas.width > 3000 ? 500 : 250;
      for (let x = 0; x <= state.canvas.width; x += major) {
        addRulerTick('top', x);
      }
      for (let y = 0; y <= state.canvas.height; y += major) {
        addRulerTick('left', y);
      }
    }

    function addLine(className, x, y, w, h) {
      const line = document.createElement('div');
      line.className = className;
      line.style.left = screen(x);
      line.style.top = screen(y);
      line.style.width = screen(w);
      line.style.height = screen(h);
      els.stage.appendChild(line);
    }

    function addRulerTick(axis, value) {
      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.textContent = value;

      if (axis === 'top') {
        tick.style.left = screen(value);
        tick.style.bottom = '0';
        tick.style.width = '1px';
        tick.style.height = '10px';
        label.style.left = screen(value + 4 / state.zoom);
        label.style.bottom = '11px';
        els.rulerTop.append(tick, label);
      } else {
        tick.style.top = screen(value);
        tick.style.right = '0';
        tick.style.height = '1px';
        tick.style.width = '10px';
        label.style.top = screen(value + 4 / state.zoom);
        label.style.right = '12px';
        els.rulerLeft.append(tick, label);
      }
    }

    function renderLogos() {
      els.stage.querySelectorAll('.logo').forEach(node => node.remove());
      state.logos.forEach(logo => {
        const node = document.createElement('div');
        node.className = `logo${isSelected(logo.id) ? ' selected' : ''}`;
        node.dataset.id = logo.id;
        node.style.left = screen(logo.x);
        node.style.top = screen(logo.y);
        node.style.width = screen(logo.width);
        node.style.height = screen(logo.height);
        node.style.zIndex = String(10 + logo.z);
        node.style.transform = `rotate(${logo.rotation || 0}deg)`;
        node.style.transformOrigin = 'center center';

        const image = document.createElement('img');
        image.src = logo.src;
        image.alt = logo.name;
        const handle = document.createElement('div');
        handle.className = 'handle';
        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'rotate-handle';
        rotateHandle.title = '拖动旋转';

        node.append(image, handle, rotateHandle);
        node.addEventListener('pointerdown', event => startDrag(event, logo.id));
        handle.addEventListener('pointerdown', event => startResize(event, logo.id));
        rotateHandle.addEventListener('pointerdown', event => startRotate(event, logo.id));
        els.stage.appendChild(node);
      });
    }

    function renderSelectedPanel() {
      const logo = selectedLogo();
      const selected = selectedLogos();
      if (selected.length > 1) {
        els.selectedPanel.className = 'selected-empty';
        els.selectedPanel.innerHTML = `
          已选中 ${selected.length} 个物料。可以用方向键微调位置，按住 Shift 每次移动 10mm。
          <div class="toolbar" style="justify-content:flex-start;margin-top:10px">
            <button id="multiBringFrontBtn">置顶</button>
            <button id="multiSendBackBtn">置底</button>
            <button id="multiDeleteBtn" style="color:var(--danger)">删除</button>
          </div>
        `;
        document.getElementById('multiBringFrontBtn').addEventListener('click', () => {
          const maxZ = Math.max(0, ...state.logos.map(item => item.z));
          selected.forEach((item, index) => item.z = maxZ + index + 1);
          render();
        });
        document.getElementById('multiSendBackBtn').addEventListener('click', () => {
          const minZ = Math.min(0, ...state.logos.map(item => item.z));
          selected.forEach((item, index) => item.z = minZ - index - 1);
          render();
        });
        document.getElementById('multiDeleteBtn').addEventListener('click', deleteSelected);
        return;
      }
      if (!logo) {
        els.selectedPanel.className = 'selected-empty';
        els.selectedPanel.innerHTML = '选择一个 logo 后，可以在这里精确调整它的实际尺寸和位置。';
        return;
      }

      els.selectedPanel.className = '';
      els.selectedPanel.innerHTML = `
        <div class="fields one">
          <label>名称
            <input id="editName" value="${escapeHtml(logo.name)}">
          </label>
        </div>
        <div class="fields" style="margin-top:10px">
          <label>X mm
            <input id="editX" type="number" value="${Math.round(logo.x)}">
          </label>
          <label>Y mm
            <input id="editY" type="number" value="${Math.round(logo.y)}">
          </label>
          <label>宽 mm
            <input id="editW" type="number" min="10" value="${Math.round(logo.width)}">
          </label>
          <label>高 mm
            <input id="editH" type="number" min="10" value="${Math.round(logo.height)}">
          </label>
          <label>旋转 °
            <input id="editRotation" type="number" value="${Math.round(logo.rotation || 0)}">
          </label>
        </div>
        <div class="toolbar" style="justify-content:flex-start;margin-top:10px">
          <button id="bringFrontBtn">置顶</button>
          <button id="sendBackBtn">置底</button>
          <button id="deleteBtn" style="color:var(--danger)">删除</button>
        </div>
      `;

      bindNumberEdit('editX', value => logo.x = clamp(value, -state.canvas.width, state.canvas.width));
      bindNumberEdit('editY', value => logo.y = clamp(value, -state.canvas.height, state.canvas.height));
      bindNumberEdit('editW', value => {
        logo.width = Math.max(10, value);
        logo.height = logo.width / logo.aspect;
        document.getElementById('editH').value = Math.round(logo.height);
      });
      bindNumberEdit('editH', value => {
        logo.height = Math.max(10, value);
        logo.width = logo.height * logo.aspect;
        document.getElementById('editW').value = Math.round(logo.width);
      });
      bindNumberEdit('editRotation', value => {
        logo.rotation = normalizeAngle(value);
        document.getElementById('editRotation').value = Math.round(logo.rotation);
      });
      document.getElementById('editName').addEventListener('input', event => {
        logo.name = event.target.value;
        renderLogoList();
      });
      document.getElementById('bringFrontBtn').addEventListener('click', () => {
        logo.z = Math.max(0, ...state.logos.map(item => item.z)) + 1;
        render();
      });
      document.getElementById('sendBackBtn').addEventListener('click', () => {
        logo.z = Math.min(0, ...state.logos.map(item => item.z)) - 1;
        render();
      });
      document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
    }

    function bindNumberEdit(id, updater) {
      document.getElementById(id).addEventListener('input', event => {
        const value = Number(event.target.value);
        if (Number.isFinite(value)) {
          updater(value);
          renderLogos();
          renderLogoList();
        }
      });
    }

    function renderLogoList() {
      if (!state.logos.length) {
        els.logoList.innerHTML = '<p class="status">还没有上传 logo。</p>';
        return;
      }

      els.logoList.innerHTML = '';
      [...state.logos]
        .sort((a, b) => b.z - a.z)
        .forEach(logo => {
          const row = document.createElement('div');
          row.className = `logo-row${isSelected(logo.id) ? ' active' : ''}`;
          row.innerHTML = `
            <div>
              <strong>${escapeHtml(logo.name)}</strong>
              <span>${Math.round(logo.width)} × ${Math.round(logo.height)} mm · ${Math.round(logo.rotation || 0)}°</span>
            </div>
            <button class="icon" title="删除">×</button>
          `;
          row.addEventListener('click', () => {
            selectOnly(logo.id);
            render();
          });
          row.querySelector('button').addEventListener('click', event => {
            event.stopPropagation();
            selectOnly(logo.id);
            deleteSelected();
          });
          els.logoList.appendChild(row);
        });
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      })[char]);
    }

    function startDrag(event, id) {
      if (event.target.classList.contains('handle') || event.target.classList.contains('rotate-handle')) return;
      event.preventDefault();
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        toggleSelection(id);
      } else if (!isSelected(id)) {
        selectOnly(id);
      } else {
        state.selectedId = id;
      }
      const movingLogos = selectedLogos();
      const startX = event.clientX;
      const startY = event.clientY;
      const origins = new Map(movingLogos.map(logo => [logo.id, { x: logo.x, y: logo.y }]));
      render();

      const move = moveEvent => {
        const dx = (moveEvent.clientX - startX) / state.zoom;
        const dy = (moveEvent.clientY - startY) / state.zoom;
        movingLogos.forEach(logo => {
          const origin = origins.get(logo.id);
          logo.x = origin.x + dx;
          logo.y = origin.y + dy;
        });
        renderLogos();
        renderSelectedPanel();
        renderLogoList();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function startResize(event, id) {
      event.preventDefault();
      event.stopPropagation();
      selectOnly(id);
      const logo = selectedLogo();
      const startX = event.clientX;
      const startWidth = logo.width;

      const move = moveEvent => {
        const nextWidth = Math.max(10, startWidth + (moveEvent.clientX - startX) / state.zoom);
        logo.width = nextWidth;
        logo.height = nextWidth / logo.aspect;
        renderLogos();
        renderSelectedPanel();
        renderLogoList();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function startRotate(event, id) {
      event.preventDefault();
      event.stopPropagation();
      selectOnly(id);
      const logo = selectedLogo();

      const move = moveEvent => {
        const centerX = (logo.x + logo.width / 2) * state.zoom;
        const centerY = (logo.y + logo.height / 2) * state.zoom;
        const stageRect = els.stage.getBoundingClientRect();
        const pointerX = moveEvent.clientX - stageRect.left;
        const pointerY = moveEvent.clientY - stageRect.top;
        const angle = Math.atan2(pointerY - centerY, pointerX - centerX) * 180 / Math.PI + 90;
        logo.rotation = normalizeAngle(angle);
        renderLogos();
        renderSelectedPanel();
        renderLogoList();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    async function addFiles(files) {
      const imageFiles = [...files].filter(file => file.type.startsWith('image/'));
      if (!imageFiles.length) return;
      const startCount = state.logos.length;
      const columns = 8;
      const gapX = 150;
      const gapY = 115;
      const originX = 120;
      const originY = 120;

      for (const file of imageFiles) {
        const index = state.logos.length - startCount;
        const src = await readFileAsDataURL(file);
        const size = await getImageSize(src);
        const aspect = size.width / size.height;
        const width = Math.min(420, Math.max(180, state.canvas.width * 0.08));
        const height = width / aspect;
        state.logos.push({
          id: uid(),
          name: file.name.replace(/\.[^.]+$/, ''),
          src,
          x: originX + (index % columns) * gapX,
          y: originY + Math.floor(index / columns) * gapY,
          width,
          height,
          aspect,
          rotation: 0,
          z: startCount + state.logos.length
        });
      }
      setSelection(state.logos.at(-1)?.id ? [state.logos.at(-1).id] : []);
      render();
      centerCanvas();
    }

    function deleteSelected() {
      if (!state.selectedIds.length) return;
      state.logos = state.logos.filter(logo => !isSelected(logo.id));
      clearSelection();
      render();
    }

    function copySelected() {
      const logos = selectedLogos();
      if (logos.length) state.clipboard = logos.map(logo => ({ ...logo }));
    }

    function pasteLogo() {
      if (!state.clipboard) return;
      const items = Array.isArray(state.clipboard) ? state.clipboard : [state.clipboard];
      const maxZ = Math.max(0, ...state.logos.map(item => item.z));
      const copies = items.map((item, index) => ({
        ...item,
        id: uid(),
        name: `${item.name} copy`,
        x: item.x + 40,
        y: item.y + 40,
        z: maxZ + index + 1
      }));
      state.logos.push(...copies);
      setSelection(copies.map(copy => copy.id));
      state.clipboard = copies.map(copy => ({ ...copy }));
      render();
    }

    function moveSelected(dx, dy) {
      const logos = selectedLogos();
      if (!logos.length) return;
      logos.forEach(logo => {
        logo.x += dx;
        logo.y += dy;
      });
      renderLogos();
      renderSelectedPanel();
      renderLogoList();
    }

    function getStagePoint(event) {
      const rect = els.stage.getBoundingClientRect();
      return {
        x: clamp((event.clientX - rect.left) / state.zoom, 0, state.canvas.width),
        y: clamp((event.clientY - rect.top) / state.zoom, 0, state.canvas.height)
      };
    }

    function intersects(a, b) {
      return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
    }

    function startMarquee(event) {
      if (event.button !== 0) return;
      event.preventDefault();
      const start = getStagePoint(event);
      const box = document.createElement('div');
      box.className = 'marquee';
      els.stage.appendChild(box);

      const move = moveEvent => {
        const current = getStagePoint(moveEvent);
        const rect = {
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width: Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y)
        };
        box.style.left = screen(rect.x);
        box.style.top = screen(rect.y);
        box.style.width = screen(rect.width);
        box.style.height = screen(rect.height);

        const selectedIds = state.logos
          .filter(logo => intersects(rect, {
            x: logo.x,
            y: logo.y,
            width: logo.width,
            height: logo.height
          }))
          .map(logo => logo.id);
        setSelection(selectedIds);
        renderLogos();
        renderSelectedPanel();
        renderLogoList();
      };

      const up = () => {
        box.remove();
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function canvasPayload() {
      return {
        version: 1,
        canvas: state.canvas,
        logos: state.logos.map(logo => ({
          id: logo.id,
          name: logo.name,
          x: logo.x,
          y: logo.y,
          width: logo.width,
          height: logo.height,
          aspect: logo.aspect,
          rotation: logo.rotation || 0,
          z: logo.z,
          src: logo.src
        }))
      };
    }

    function exportCsv() {
      const rows = [['name', 'x_mm', 'y_mm', 'width_mm', 'height_mm', 'rotation_deg', 'z_index']];
      [...state.logos]
        .sort((a, b) => a.z - b.z)
        .forEach(logo => rows.push([
          logo.name,
          Math.round(logo.x),
          Math.round(logo.y),
          Math.round(logo.width),
          Math.round(logo.height),
          Math.round(logo.rotation || 0),
          logo.z
        ]));
      const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      download('logo-wall-size-list.csv', csv, 'text/csv;charset=utf-8');
    }

    async function exportPng() {
      const canvas = document.createElement('canvas');
      canvas.width = state.canvas.width;
      canvas.height = state.canvas.height;
      const ctx = canvas.getContext('2d');
      drawBackground(ctx, 1);

      const sorted = [...state.logos].sort((a, b) => a.z - b.z);
      for (const logo of sorted) {
        const image = await loadImage(logo.src);
        ctx.save();
        ctx.translate(logo.x + logo.width / 2, logo.y + logo.height / 2);
        ctx.rotate((logo.rotation || 0) * Math.PI / 180);
        ctx.drawImage(image, -logo.width / 2, -logo.height / 2, logo.width, logo.height);
        ctx.restore();
      }

      canvas.toBlob(blob => download('logo-wall-preview.png', blob, 'image/png'));
    }

    function drawBackground(ctx, scale) {
      ctx.fillStyle = state.canvas.bg === 'black' ? '#111111' : '#ffffff';
      ctx.fillRect(0, 0, state.canvas.width * scale, state.canvas.height * scale);

      if (state.canvas.mode === 'grid') {
        ctx.strokeStyle = state.canvas.bg === 'black' ? 'rgba(255,255,255,.22)' : 'rgba(107,91,78,.16)';
        ctx.lineWidth = 1;
        for (let x = state.canvas.gridStep; x < state.canvas.width; x += state.canvas.gridStep) {
          ctx.beginPath();
          ctx.moveTo(x * scale, 0);
          ctx.lineTo(x * scale, state.canvas.height * scale);
          ctx.stroke();
        }
        for (let y = state.canvas.gridStep; y < state.canvas.height; y += state.canvas.gridStep) {
          ctx.beginPath();
          ctx.moveTo(0, y * scale);
          ctx.lineTo(state.canvas.width * scale, y * scale);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = 'rgba(0,122,255,.8)';
      ctx.lineWidth = 4;
      const part = state.canvas.width / state.canvas.divisions;
      for (let i = 1; i < state.canvas.divisions; i++) {
        ctx.beginPath();
        ctx.moveTo(part * i * scale, 0);
        ctx.lineTo(part * i * scale, state.canvas.height * scale);
        ctx.stroke();
      }
    }

    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
    }

    function importProject(file) {
      const reader = new FileReader();
      reader.onload = () => {
        const payload = JSON.parse(reader.result);
        state.canvas = { ...state.canvas, ...payload.canvas };
        state.logos = Array.isArray(payload.logos) ? payload.logos.map(logo => ({
          ...logo,
          rotation: logo.rotation || 0
        })) : [];
        setSelection(state.logos[0]?.id ? [state.logos[0].id] : []);
        syncInputs();
        render();
      };
      reader.readAsText(file);
    }

    function syncInputs() {
      els.canvasW.value = state.canvas.width;
      els.canvasH.value = state.canvas.height;
      els.divisions.value = state.canvas.divisions;
      els.gridStep.value = state.canvas.gridStep;
      els.zoom.value = Math.round(state.zoom * 100);
    }

    function wireInputs() {
      els.canvasW.addEventListener('input', event => {
        state.canvas.width = Math.max(100, Number(event.target.value) || 4800);
        render();
        centerCanvas();
      });
      els.canvasH.addEventListener('input', event => {
        state.canvas.height = Math.max(100, Number(event.target.value) || 2700);
        render();
        centerCanvas();
      });
      els.divisions.addEventListener('input', event => {
        state.canvas.divisions = clamp(Number(event.target.value) || 1, 1, 24);
        render();
      });
      els.gridStep.addEventListener('input', event => {
        state.canvas.gridStep = Math.max(5, Number(event.target.value) || 100);
        render();
      });
      els.zoom.addEventListener('input', event => {
        setZoom(Number(event.target.value) / 100);
      });
      els.canvasWrap.addEventListener('wheel', event => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * 0.002);
        setZoom(state.zoom * factor, event);
      }, { passive: false });
      els.gridModeBtn.addEventListener('click', () => {
        state.canvas.mode = 'grid';
        render();
      });
      els.solidModeBtn.addEventListener('click', () => {
        state.canvas.mode = 'solid';
        render();
      });
      els.whiteBgBtn.addEventListener('click', () => {
        state.canvas.bg = 'white';
        render();
      });
      els.blackBgBtn.addEventListener('click', () => {
        state.canvas.bg = 'black';
        render();
      });
      els.uploadBtn.addEventListener('click', () => els.fileInput.click());
      els.exportMenuBtn.addEventListener('click', event => {
        event.stopPropagation();
        setExportMenu(!els.exportMenu.classList.contains('open'));
      });
      els.exportMenu.addEventListener('click', event => event.stopPropagation());
      els.fileInput.addEventListener('change', event => {
        addFiles(event.target.files);
        event.target.value = '';
      });
      els.canvasWrap.addEventListener('dragover', event => {
        event.preventDefault();
        els.canvasWrap.classList.add('dragging');
      });
      els.canvasWrap.addEventListener('dragleave', event => {
        if (!els.canvasWrap.contains(event.relatedTarget)) {
          els.canvasWrap.classList.remove('dragging');
        }
      });
      els.canvasWrap.addEventListener('drop', event => {
        event.preventDefault();
        els.canvasWrap.classList.remove('dragging');
        addFiles(event.dataTransfer.files);
      });
      els.exportCsvBtn.addEventListener('click', () => {
        exportCsv();
        setExportMenu(false);
      });
      els.exportPngBtn.addEventListener('click', () => {
        exportPng();
        setExportMenu(false);
      });
      els.saveProjectBtn.addEventListener('click', () => {
        download('logo-wall-project.json', JSON.stringify(canvasPayload(), null, 2), 'application/json');
        setExportMenu(false);
      });
      els.loadProjectBtn.addEventListener('click', () => {
        setExportMenu(false);
        els.jsonInput.click();
      });
      els.toggleLeftBtn.addEventListener('click', () => {
        state.panels.left = !state.panels.left;
        renderPanels();
        centerCanvas();
      });
      els.toggleRightBtn.addEventListener('click', () => {
        state.panels.right = !state.panels.right;
        renderPanels();
        centerCanvas();
      });
      els.jsonInput.addEventListener('change', event => {
        if (event.target.files[0]) importProject(event.target.files[0]);
      });

      window.addEventListener('keydown', event => {
        const target = event.target;
        const editing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
        if (event.key === 'Escape') setExportMenu(false);
        if ((event.ctrlKey || event.metaKey) && ['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault();
          if (event.key === '0') {
            setZoom(0.2);
          } else {
            setZoom(state.zoom * (event.key === '-' ? 0.9 : 1.1));
          }
          return;
        }
        if (editing) return;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          const moves = {
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0]
          };
          moveSelected(...moves[event.key]);
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          deleteSelected();
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
          event.preventDefault();
          copySelected();
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
          event.preventDefault();
          pasteLogo();
        }
      });
      window.addEventListener('click', () => setExportMenu(false));

      els.stage.addEventListener('pointerdown', event => {
        if (event.target === els.stage) {
          startMarquee(event);
        }
      });
    }

    syncInputs();
    wireInputs();
    render();
    centerCanvas();
