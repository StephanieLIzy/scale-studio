const state = {
      canvas: { width: 4800, height: 2700, divisions: 4, gridStep: 100, mode: 'grid', bg: 'white' },
      viewMode: 'outline',
      zoom: 0.2,
      pan: { x: 0, y: 0 },
      logos: [],
      selectedId: null,
      selectedIds: [],
      clipboard: null,
      projects: [],
      activeProjectId: null,
      saveTimer: null,
      workspaceOpen: false,
      panels: { right: true }
    };

    const els = {
      app: document.getElementById('app'),
      projectHomeStatus: document.getElementById('projectHomeStatus'),
      backProjectsBtn: document.getElementById('backProjectsBtn'),
      stage: document.getElementById('stage'),
      stageShell: document.getElementById('stageShell'),
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
      templateViewSwitch: document.getElementById('templateViewSwitch'),
      outlineViewBtn: document.getElementById('outlineViewBtn'),
      photoViewBtn: document.getElementById('photoViewBtn'),
      canvasSettingsBtn: document.getElementById('canvasSettingsBtn'),
      canvasSettingsMenu: document.getElementById('canvasSettingsMenu'),
      uploadMenuBtn: document.getElementById('uploadMenuBtn'),
      uploadMenu: document.getElementById('uploadMenu'),
      uploadImagesBtn: document.getElementById('uploadImagesBtn'),
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
    const DEFAULT_CANVAS = { width: 4800, height: 2700, divisions: 4, gridStep: 100, mode: 'grid', bg: 'white' };
    const TEMPLATE_CONFIG = {
      'record-wall': {
        name: '上海店 · 唱片墙',
        version: 3,
        width: 1980,
        height: 3000,
        divisions: 6,
        gridStep: 100,
        canvasMode: 'solid',
        background: 'white',
        photo: 'assets/shanghai-record-wall-front-v3.jpg',
        constructionImage: 'assets/shanghai-record-wall-construction.png',
        geometry: {
          columns: 6,
          rows: 9,
          cell: 320,
          offsetX: 30,
          offsetY: 60,
          radii: [130, 90, 60]
        },
        note: '整体 1980 × 3000 mm · 6 × 9 单元 · 单元 320 mm · 圆环 R130 / R90 / R60'
      },
      'peg-wall': {
        name: '上海店 · 洞洞墙',
        width: 4700,
        height: 2000,
        divisions: 5,
        gridStep: 100,
        note: '4700 × 2000 mm · 实拍图待补'
      },
      'window-wall-mock': {
        name: '上海店 · 临窗展示面 Mock',
        width: 3600,
        height: 2400,
        divisions: 4,
        gridStep: 100,
        note: '测试数据，不用于实际制作'
      }
    };
    const GUEST_STORE_KEY = 'scale-studio-guest-projects-v1';
    const isGuestMode = new URLSearchParams(location.search).get('mode') === 'guest';
    const isReadOnlyMode = new URLSearchParams(location.search).get('readonly') === '1';
    const compactWorkspace = window.matchMedia('(max-width: 900px)');
    const screen = value => `${value * state.zoom}px`;

    function activeTemplateFromUrl() {
      const params = new URLSearchParams(location.search);
      const templateId = params.get('template');
      return templateId ? { id: templateId, ...TEMPLATE_CONFIG[templateId] } : null;
    }

    function applyTemplateToNewProject() {
      const template = activeTemplateFromUrl();
      if (!template) return;
      state.canvas = {
        ...DEFAULT_CANVAS,
        width: template.width,
        height: template.height,
        divisions: template.divisions,
        gridStep: template.gridStep,
        mode: template.canvasMode || DEFAULT_CANVAS.mode,
        bg: template.background || DEFAULT_CANVAS.bg
      };
      state.zoom = template.id === 'record-wall' ? 0.18 : 0.14;
      state.template = template;
      state.viewMode = template.photo ? 'photo' : 'outline';
    }

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

    async function trimTransparentImage(src) {
      const image = await loadImage(src);
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      let pixels;
      try {
        pixels = ctx.getImageData(0, 0, width, height).data;
      } catch {
        return {
          src,
          width,
          height,
          bounds: { x: 0, y: 0, width, height }
        };
      }

      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = pixels[(y * width + x) * 4 + 3];
          if (alpha > 8) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (maxX < minX || maxY < minY) {
        return {
          src,
          width,
          height,
          bounds: { x: 0, y: 0, width, height }
        };
      }

      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      if (cropWidth === width && cropHeight === height) {
        return {
          src,
          width,
          height,
          bounds: { x: 0, y: 0, width, height }
        };
      }

      const output = document.createElement('canvas');
      output.width = cropWidth;
      output.height = cropHeight;
      output
        .getContext('2d')
        .drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      return {
        src: output.toDataURL('image/png'),
        width: cropWidth,
        height: cropHeight,
        bounds: { x: minX, y: minY, width: cropWidth, height: cropHeight },
        original: { width, height }
      };
    }

    async function tryTrimTransparentImage(src) {
      try {
        return await trimTransparentImage(src);
      } catch (error) {
        console.warn('Could not trim transparent padding.', error);
        const size = await getImageSize(src);
        return {
          src,
          width: size.width,
          height: size.height,
          bounds: { x: 0, y: 0, width: size.width, height: size.height }
        };
      }
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
        state.pan = { x: 0, y: 0 };
        positionStage();
      });
    }

    function positionStage() {
      els.stageFrame.style.transform = `translate(calc(-50% + ${state.pan.x}px), calc(-50% + ${state.pan.y}px))`;
    }

    function renderPanels() {
      els.app.classList.toggle('right-collapsed', !state.panels.right);
      els.toggleRightBtn.textContent = state.panels.right ? '›' : '‹';
      els.toggleRightBtn.title = state.panels.right ? '收起物料属性' : '展开物料属性';
      els.toggleRightBtn.setAttribute('aria-label', els.toggleRightBtn.title);
      els.toggleRightBtn.setAttribute('aria-expanded', String(state.panels.right));
    }

    function renderCanvas() {
      els.stage.style.width = screen(state.canvas.width);
      els.stage.style.height = screen(state.canvas.height);
      els.stage.style.backgroundColor = state.canvas.bg === 'black' ? '#111' : '#fff';
      els.stage.classList.toggle('dark', state.canvas.bg === 'black');
      const showPhoto = Boolean(state.template?.photo && state.viewMode === 'photo');
      els.stage.classList.toggle('template-photo', showPhoto);
      els.stage.style.setProperty('--template-photo', state.template?.photo ? `url("${state.template.photo}")` : 'none');
      els.canvasSummary.textContent = state.template
        ? state.template.name
        : '自由画布';
      els.zoomReadout.value = `${Math.round(state.zoom * 100)}%`;
      els.gridModeBtn.classList.toggle('active', state.canvas.mode === 'grid');
      els.solidModeBtn.classList.toggle('active', state.canvas.mode === 'solid');
      els.whiteBgBtn.classList.toggle('active', state.canvas.bg === 'white');
      els.blackBgBtn.classList.toggle('active', state.canvas.bg === 'black');
      els.templateViewSwitch.hidden = !state.template;
      els.outlineViewBtn.classList.toggle('active', state.viewMode === 'outline');
      els.photoViewBtn.classList.toggle('active', state.viewMode === 'photo');
      els.photoViewBtn.disabled = !state.template?.photo;
      positionStage();
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
        state.pan.x -= newStageRect.left + worldX * state.zoom - anchorEvent.clientX;
        state.pan.y -= newStageRect.top + worldY * state.zoom - anchorEvent.clientY;
        positionStage();
      }
    }

    function setExportMenu(open) {
      els.exportMenu.classList.toggle('open', open);
      els.exportMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function setUploadMenu(open) {
      els.uploadMenu.classList.toggle('open', open);
      els.uploadMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function setCanvasSettingsMenu(open) {
      els.canvasSettingsMenu.classList.toggle('open', open);
      els.canvasSettingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function setProjectStatus(message) {
      els.projectHomeStatus.textContent = message;
    }

    async function readProjects() {
      if (isGuestMode) {
        try {
          return JSON.parse(sessionStorage.getItem(GUEST_STORE_KEY) || '[]');
        } catch (error) {
          console.warn('Could not read guest session.', error);
          return [];
        }
      }
      const portalState = JSON.parse(localStorage.getItem('scale-studio-mvp-state-v1') || '{}');
      const requestedProjectId = new URLSearchParams(location.search).get('project');
      return (portalState.projects || [])
        .filter(project => !requestedProjectId || project.id === requestedProjectId)
        .map(project => ({
        id: `editor-${project.id}`,
        portalProjectId: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
          payload: project.editorPayload || {}
        }));
    }

    async function writeProject(project) {
      if (isGuestMode) {
        const projects = await readProjects();
        const next = projects.filter(item => item.id !== project.id).concat(project);
        sessionStorage.setItem(GUEST_STORE_KEY, JSON.stringify(next));
        return project;
      }
      if (!project.portalProjectId) return project;
      const portalState = JSON.parse(localStorage.getItem('scale-studio-mvp-state-v1') || '{}');
      if (!Array.isArray(portalState.projects)) return project;
      const index = portalState.projects.findIndex(item => item.id === project.portalProjectId);
      if (index < 0) return project;
      portalState.projects[index] = {
        ...portalState.projects[index],
        name: project.name,
        updatedAt: project.updatedAt,
        editorPayload: project.payload
      };
      localStorage.setItem('scale-studio-mvp-state-v1', JSON.stringify(portalState));
      return project;
    }

    function currentProjectName() {
      const project = state.projects.find(item => item.id === state.activeProjectId);
      return project?.name?.trim() || '未命名项目';
    }

    function createProjectRecord(name = '未命名项目') {
      const now = Date.now();
      return {
        id: uid(),
        name,
        updatedAt: now,
        payload: canvasPayload()
      };
    }

    function currentProjectRecord() {
      const existing = state.projects.find(project => project.id === state.activeProjectId);
      return {
        id: state.activeProjectId || uid(),
        portalProjectId: existing?.portalProjectId || null,
        name: existing?.name || '未命名项目',
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
        payload: canvasPayload()
      };
    }

    function showProjectHome() {
      const returnTarget = new URLSearchParams(location.search).get('return');
      location.href = !isGuestMode || returnTarget === 'workspace'
        ? 'index.html#/workspace?view=projects'
        : 'index.html#/';
    }

    function showWorkspace() {
      state.workspaceOpen = true;
      if (compactWorkspace.matches) {
        state.panels.right = false;
      }
      els.app.classList.remove('hidden');
      render();
      centerCanvas();
    }

    function applyProjectPayload(payload = {}) {
      state.canvas = { ...DEFAULT_CANVAS, ...payload.canvas };
      const currentTemplate = activeTemplateFromUrl();
      state.template = payload.template || currentTemplate;
      if (currentTemplate && state.template?.id === currentTemplate.id) {
        state.template = { ...state.template, photo: currentTemplate.photo };
      }
      if (currentTemplate && state.template?.id === currentTemplate.id && Number(state.template.version || 1) < Number(currentTemplate.version || 1)) {
        const previousWidth = state.canvas.width || state.template.width || currentTemplate.width;
        const previousHeight = state.canvas.height || state.template.height || currentTemplate.height;
        const xOffset = (currentTemplate.width - previousWidth) / 2;
        const yOffset = (currentTemplate.height - previousHeight) / 2;
        state.canvas = {
          ...state.canvas,
          width: currentTemplate.width,
          height: currentTemplate.height,
          divisions: currentTemplate.divisions,
          gridStep: currentTemplate.gridStep,
          mode: currentTemplate.canvasMode || state.canvas.mode,
          bg: currentTemplate.background || state.canvas.bg
        };
        state.template = currentTemplate;
        if (Array.isArray(payload.logos)) {
          payload.logos = payload.logos.map(logo => ({ ...logo, x: logo.x + xOffset, y: logo.y + yOffset }));
        }
      }
      state.viewMode = payload.viewMode || (state.template?.photo ? 'photo' : 'outline');
      state.zoom = clamp(Number(payload.zoom) || 0.2, MIN_ZOOM, MAX_ZOOM);
      state.pan = { x: 0, y: 0 };
      state.logos = Array.isArray(payload.logos) ? payload.logos.map(logo => ({
        ...logo,
        rotation: logo.rotation || 0
      })) : [];
      clearSelection();
      syncInputs();
      render();
      centerCanvas();
    }

    async function persistActiveProject({ immediate = false } = {}) {
      if (isReadOnlyMode) return;
      if (!state.activeProjectId || !state.workspaceOpen) return;
      if (state.saveTimer) clearTimeout(state.saveTimer);

      const save = async () => {
        setProjectStatus('保存中...');
        const project = currentProjectRecord();
        await writeProject(project);
        state.projects = state.projects
          .filter(item => item.id !== project.id)
          .concat(project);
        state.saveTimer = null;
        setProjectStatus('已保存');
        syncPortalProject(project);
      };

      if (immediate) {
        await save();
      } else {
        setProjectStatus('正在等待保存...');
        state.saveTimer = setTimeout(() => {
          save().catch(error => {
            console.error(error);
            setProjectStatus('保存失败。');
          });
        }, 500);
      }
    }

    function syncPortalProject(project) {
      if (!project.portalProjectId) return;
      try {
        const portalState = JSON.parse(localStorage.getItem('scale-studio-mvp-state-v1') || '{}');
        if (!Array.isArray(portalState.projects)) return;
        const index = portalState.projects.findIndex(item => item.id === project.portalProjectId);
        if (index < 0) return;
        portalState.projects[index] = {
          ...portalState.projects[index],
          name: project.name,
          widthMm: project.payload.canvas.width,
          heightMm: project.payload.canvas.height,
          updatedAt: project.updatedAt,
          editorPayload: project.payload
        };
        localStorage.setItem('scale-studio-mvp-state-v1', JSON.stringify(portalState));
      } catch (error) {
        console.warn('Could not sync project preview.', error);
      }
    }

    function scheduleProjectSave() {
      if (isReadOnlyMode) return;
      persistActiveProject().catch(error => {
        console.error(error);
        setProjectStatus('保存失败。');
      });
    }

    async function initProjects() {
      const requestedProjectId = new URLSearchParams(location.search).get('project');
      const requestedTemplate = activeTemplateFromUrl();
      try {
        state.projects = await readProjects();
        if (requestedProjectId) {
          const existing = state.projects.find(project => project.portalProjectId === requestedProjectId);
          if (existing) {
            state.activeProjectId = existing.id;
            applyProjectPayload(existing.payload);
            return;
          }
          state.canvas = { ...DEFAULT_CANVAS };
          state.logos = [];
          state.template = requestedTemplate;
          applyTemplateToNewProject();
          let portalProject = null;
          try {
            const portalState = JSON.parse(localStorage.getItem('scale-studio-mvp-state-v1') || '{}');
            portalProject = portalState.projects?.find(project => project.id === requestedProjectId) || null;
          } catch (error) {
            console.warn('Could not restore portal project.', error);
          }
          if (portalProject?.editorPayload) applyProjectPayload(portalProject.editorPayload);
          const project = createProjectRecord(portalProject?.name || requestedTemplate?.name || '店内模板项目');
          project.portalProjectId = requestedProjectId;
          project.payload = canvasPayload();
          state.projects.push(project);
          state.activeProjectId = project.id;
          await writeProject(project);
          return;
        }
        if (!state.projects.length) {
          const project = createProjectRecord('未命名项目');
          state.projects = [project];
          await writeProject(project);
          return;
        }
      } catch (error) {
        console.error(error);
        setProjectStatus('项目读取失败。');
      }
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
      els.stage.querySelectorAll('.grid-line, .division-line, .template-cell, .template-ring').forEach(node => node.remove());
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

      if (state.template?.id === 'record-wall' && state.viewMode === 'outline') {
        const geometry = state.template.geometry;
        for (let row = 0; row < geometry.rows; row += 1) {
          for (let column = 0; column < geometry.columns; column += 1) {
            const cellX = geometry.offsetX + column * geometry.cell;
            const cellY = geometry.offsetY + row * geometry.cell;
            const cell = document.createElement('div');
            cell.className = 'template-cell';
            cell.style.left = screen(cellX);
            cell.style.top = screen(cellY);
            cell.style.width = screen(geometry.cell);
            cell.style.height = screen(geometry.cell);
            els.stage.appendChild(cell);

            geometry.radii.forEach((radius, index) => {
              const ring = document.createElement('div');
              ring.className = `template-ring ring-${index + 1}`;
              ring.style.left = screen(cellX + geometry.cell / 2 - radius);
              ring.style.top = screen(cellY + geometry.cell / 2 - radius);
              ring.style.width = screen(radius * 2);
              ring.style.height = screen(radius * 2);
              els.stage.appendChild(ring);
            });
          }
        }
      }

      if (state.template?.id !== 'record-wall') {
        const part = state.canvas.width / state.canvas.divisions;
        for (let i = 1; i < state.canvas.divisions; i++) {
          addLine('division-line', part * i, 0, 2 / state.zoom, state.canvas.height);
        }
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
          scheduleProjectSave();
        });
        document.getElementById('multiSendBackBtn').addEventListener('click', () => {
          const minZ = Math.min(0, ...state.logos.map(item => item.z));
          selected.forEach((item, index) => item.z = minZ - index - 1);
          render();
          scheduleProjectSave();
        });
        document.getElementById('multiDeleteBtn').addEventListener('click', deleteSelected);
        return;
      }
      if (!logo) {
        els.selectedPanel.className = 'selected-empty';
        els.selectedPanel.innerHTML = '选择一个物料后，可以在这里精确调整它的实际尺寸和位置。';
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
        ${logo.isVector ? '<p class="format-note">SVG · 已保留矢量清晰度</p>' : ''}
        <div class="toolbar" style="justify-content:flex-start;margin-top:10px">
          <button id="bringFrontBtn">置顶</button>
          <button id="sendBackBtn">置底</button>
          ${logo.isVector ? '' : '<button id="trimLogoBtn">裁剪透明边</button>'}
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
        scheduleProjectSave();
      });
      document.getElementById('bringFrontBtn').addEventListener('click', () => {
        logo.z = Math.max(0, ...state.logos.map(item => item.z)) + 1;
        render();
        scheduleProjectSave();
      });
      document.getElementById('sendBackBtn').addEventListener('click', () => {
        logo.z = Math.min(0, ...state.logos.map(item => item.z)) - 1;
        render();
        scheduleProjectSave();
      });
      const trimLogoBtn = document.getElementById('trimLogoBtn');
      if (trimLogoBtn) {
        trimLogoBtn.addEventListener('click', event => {
          event.target.textContent = '裁剪中...';
          cropLogoToContent(logo).catch(error => {
            console.error(error);
            event.target.textContent = '裁剪失败';
          });
        });
      }
      document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
    }

    function bindNumberEdit(id, updater) {
      document.getElementById(id).addEventListener('input', event => {
        const value = Number(event.target.value);
        if (Number.isFinite(value)) {
          updater(value);
          renderLogos();
          renderLogoList();
          scheduleProjectSave();
        }
      });
    }

    function renderLogoList() {
      if (!state.logos.length) {
        els.logoList.innerHTML = '<p class="status">还没有上传物料。</p>';
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
              <input class="logo-name-input" value="${escapeHtml(logo.name)}" aria-label="物料名称">
              <span>${Math.round(logo.width)} × ${Math.round(logo.height)} mm · ${Math.round(logo.rotation || 0)}°</span>
            </div>
            <button class="icon" title="删除">×</button>
          `;
          row.addEventListener('click', () => {
            selectOnly(logo.id);
            render();
          });
          row.querySelector('.logo-name-input').addEventListener('pointerdown', event => {
            event.stopPropagation();
          });
          row.querySelector('.logo-name-input').addEventListener('click', event => {
            event.stopPropagation();
            selectOnly(logo.id);
            renderLogos();
            renderSelectedPanel();
          });
          row.querySelector('.logo-name-input').addEventListener('input', event => {
            logo.name = event.target.value;
            const editName = document.getElementById('editName');
            if (editName && state.selectedId === logo.id) editName.value = logo.name;
            scheduleProjectSave();
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
        scheduleProjectSave();
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
        scheduleProjectSave();
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
        scheduleProjectSave();
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    async function addFiles(files) {
      if (isReadOnlyMode) return;
      const imageFiles = [...files].filter(file => file.type.startsWith('image/'));
      if (!imageFiles.length) return;
      if (imageFiles.some(file => file.size > 15 * 1024 * 1024)) {
        setProjectStatus('单张图片不能超过 15 MB。');
        return;
      }
      if (state.logos.length + imageFiles.length > 30) {
        setProjectStatus('单个项目最多放置 30 个物料。');
        return;
      }
      const startCount = state.logos.length;
      const columns = 8;
      const gapX = 150;
      const gapY = 115;
      const originX = 120;
      const originY = 120;

      for (const file of imageFiles) {
        const index = state.logos.length - startCount;
        const originalSrc = await readFileAsDataURL(file);
        const isVector = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
        const prepared = isVector
          ? { src: originalSrc, ...(await getImageSize(originalSrc)) }
          : await tryTrimTransparentImage(originalSrc);
        const src = prepared.src;
        const aspect = prepared.width / prepared.height;
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
          pixelWidth: prepared.width,
          pixelHeight: prepared.height,
          isVector,
          rotation: 0,
          z: startCount + state.logos.length
        });
      }
      setSelection(state.logos.at(-1)?.id ? [state.logos.at(-1).id] : []);
      render();
      scheduleProjectSave();
    }

    async function cropLogoToContent(logo) {
      if (logo.isVector || /^data:image\/svg\+xml/i.test(logo.src)) {
        setProjectStatus('SVG 会保留矢量清晰度，不执行像素裁剪。');
        renderSelectedPanel();
        return;
      }
      const size = await getImageSize(logo.src);
      const trimmed = await tryTrimTransparentImage(logo.src);
      const sameSize = trimmed.width === size.width && trimmed.height === size.height;
      if (sameSize) {
        renderSelectedPanel();
        return;
      }

      const ratioX = logo.width / size.width;
      const ratioY = logo.height / size.height;
      logo.x += trimmed.bounds.x * ratioX;
      logo.y += trimmed.bounds.y * ratioY;
      logo.width = trimmed.width * ratioX;
      logo.height = trimmed.height * ratioY;
      logo.aspect = trimmed.width / trimmed.height;
      logo.pixelWidth = trimmed.width;
      logo.pixelHeight = trimmed.height;
      logo.src = trimmed.src;
      render();
      scheduleProjectSave();
    }

    function deleteSelected() {
      if (!state.selectedIds.length) return;
      state.logos = state.logos.filter(logo => !isSelected(logo.id));
      clearSelection();
      render();
      scheduleProjectSave();
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
      scheduleProjectSave();
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
      scheduleProjectSave();
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

    function startWorkspacePan(event) {
      if (event.button !== 0) return;
      if (event.shiftKey) return;
      if (event.target.closest?.('.logo')) return;
      if (event.target.closest?.('.canvas-view-switch')) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startPan = { ...state.pan };
      let moved = false;
      els.canvasWrap.classList.add('panning');

      const move = moveEvent => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < 3) return;
        moved = true;
        state.pan.x = startPan.x + dx;
        state.pan.y = startPan.y + dy;
        positionStage();
      };
      const up = () => {
        els.canvasWrap.classList.remove('panning');
        if (!moved) {
          clearSelection();
          renderLogos();
          renderSelectedPanel();
          renderLogoList();
        }
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
        template: state.template || null,
        viewMode: state.viewMode,
        zoom: state.zoom,
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
          src: logo.src,
          isVector: Boolean(logo.isVector),
          pixelWidth: logo.pixelWidth,
          pixelHeight: logo.pixelHeight
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
      await drawBackground(ctx, 1);

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

    async function drawBackground(ctx, scale) {
      ctx.fillStyle = state.canvas.bg === 'black' ? '#111111' : '#ffffff';
      ctx.fillRect(0, 0, state.canvas.width * scale, state.canvas.height * scale);

      if (state.template?.photo && state.viewMode === 'photo') {
        try {
          const photo = await loadImage(state.template.photo);
          ctx.drawImage(photo, 0, 0, state.canvas.width * scale, state.canvas.height * scale);
        } catch (error) {
          console.warn('Template photo could not be included in export.', error);
        }
      }

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

      if (state.template?.id !== 'record-wall') {
        ctx.strokeStyle = 'rgba(228,166,0,.85)';
        ctx.lineWidth = 4;
        const part = state.canvas.width / state.canvas.divisions;
        for (let i = 1; i < state.canvas.divisions; i++) {
          ctx.beginPath();
          ctx.moveTo(part * i * scale, 0);
          ctx.lineTo(part * i * scale, state.canvas.height * scale);
          ctx.stroke();
        }
      }

      if (state.template?.id === 'record-wall' && state.viewMode === 'outline') {
        const geometry = state.template.geometry;
        const stroke = state.canvas.bg === 'black' ? 'rgba(255,255,255,.62)' : 'rgba(52,51,60,.5)';
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        for (let row = 0; row < geometry.rows; row += 1) {
          for (let column = 0; column < geometry.columns; column += 1) {
            const x = geometry.offsetX + column * geometry.cell;
            const y = geometry.offsetY + row * geometry.cell;
            ctx.strokeRect(x * scale, y * scale, geometry.cell * scale, geometry.cell * scale);
            geometry.radii.forEach(radius => {
              ctx.beginPath();
              ctx.arc((x + geometry.cell / 2) * scale, (y + geometry.cell / 2) * scale, radius * scale, 0, Math.PI * 2);
              ctx.stroke();
            });
          }
        }
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
        state.zoom = clamp(Number(payload.zoom) || state.zoom, MIN_ZOOM, MAX_ZOOM);
        setSelection(state.logos[0]?.id ? [state.logos[0].id] : []);
        syncInputs();
        render();
        scheduleProjectSave();
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
        scheduleProjectSave();
      });
      els.canvasH.addEventListener('input', event => {
        state.canvas.height = Math.max(100, Number(event.target.value) || 2700);
        render();
        scheduleProjectSave();
      });
      els.divisions.addEventListener('input', event => {
        state.canvas.divisions = clamp(Number(event.target.value) || 1, 1, 24);
        render();
        scheduleProjectSave();
      });
      els.gridStep.addEventListener('input', event => {
        state.canvas.gridStep = Math.max(5, Number(event.target.value) || 100);
        render();
        scheduleProjectSave();
      });
      els.zoom.addEventListener('input', event => {
        setZoom(Number(event.target.value) / 100);
        scheduleProjectSave();
      });
      els.canvasWrap.addEventListener('wheel', event => {
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          const factor = Math.exp(-event.deltaY * 0.002);
          setZoom(state.zoom * factor, event);
          return;
        }
        const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? Math.min(innerWidth, innerHeight) : 1;
        state.pan.x -= event.deltaX * unit;
        state.pan.y -= event.deltaY * unit;
        positionStage();
      }, { passive: false });
      els.gridModeBtn.addEventListener('click', () => {
        state.canvas.mode = 'grid';
        render();
        scheduleProjectSave();
      });
      els.solidModeBtn.addEventListener('click', () => {
        state.canvas.mode = 'solid';
        render();
        scheduleProjectSave();
      });
      els.whiteBgBtn.addEventListener('click', () => {
        state.canvas.bg = 'white';
        render();
        scheduleProjectSave();
      });
      els.blackBgBtn.addEventListener('click', () => {
        state.canvas.bg = 'black';
        render();
        scheduleProjectSave();
      });
      els.outlineViewBtn.addEventListener('click', () => {
        state.viewMode = 'outline';
        render();
        scheduleProjectSave();
      });
      els.photoViewBtn.addEventListener('click', () => {
        if (!state.template?.photo) return;
        state.viewMode = 'photo';
        render();
        scheduleProjectSave();
      });
      els.backProjectsBtn.addEventListener('click', () => {
        persistActiveProject({ immediate: true })
          .then(() => {
            showProjectHome();
          })
          .catch(error => {
            console.error(error);
            setProjectStatus('返回项目列表失败。');
          });
      });
      els.uploadMenuBtn.addEventListener('click', event => {
        event.stopPropagation();
        setUploadMenu(!els.uploadMenu.classList.contains('open'));
        setExportMenu(false);
        setCanvasSettingsMenu(false);
      });
      els.uploadMenu.addEventListener('click', event => event.stopPropagation());
      els.uploadImagesBtn.addEventListener('click', () => {
        setUploadMenu(false);
        els.fileInput.click();
      });
      els.exportMenuBtn.addEventListener('click', event => {
        event.stopPropagation();
        setUploadMenu(false);
        setCanvasSettingsMenu(false);
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
        const filename = `${currentProjectName().replace(/[\\/:*?"<>|]+/g, '-') || 'scale-studio-project'}.json`;
        download(filename, JSON.stringify(canvasPayload(), null, 2), 'application/json');
        setExportMenu(false);
      });
      els.loadProjectBtn.addEventListener('click', () => {
        setUploadMenu(false);
        setExportMenu(false);
        els.jsonInput.click();
      });
      els.canvasSettingsBtn.addEventListener('click', event => {
        event.stopPropagation();
        setExportMenu(false);
        setUploadMenu(false);
        setCanvasSettingsMenu(!els.canvasSettingsMenu.classList.contains('open'));
      });
      els.canvasSettingsMenu.addEventListener('click', event => event.stopPropagation());
      els.toggleRightBtn.addEventListener('click', () => {
        state.panels.right = !state.panels.right;
        renderPanels();
      });
      compactWorkspace.addEventListener('change', event => {
        if (!event.matches) return;
        state.panels.right = false;
        renderPanels();
      });
      els.jsonInput.addEventListener('change', event => {
        if (event.target.files[0]) importProject(event.target.files[0]);
      });

      window.addEventListener('keydown', event => {
        const target = event.target;
        const editing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
        if (event.key === 'Escape') {
          setExportMenu(false);
          setUploadMenu(false);
          setCanvasSettingsMenu(false);
        }
        if ((event.ctrlKey || event.metaKey) && ['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault();
          if (event.key === '0') {
            setZoom(0.2);
          } else {
            setZoom(state.zoom * (event.key === '-' ? 0.9 : 1.1));
          }
          return;
        }
        if (editing || isReadOnlyMode) return;
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
      window.addEventListener('click', () => {
        setExportMenu(false);
        setUploadMenu(false);
        setCanvasSettingsMenu(false);
      });

      els.stage.addEventListener('pointerdown', event => {
        if (isReadOnlyMode) return;
        if (event.target === els.stage && event.shiftKey) {
          startMarquee(event);
        }
      });
      els.canvasWrap.addEventListener('pointerdown', startWorkspacePan);
    }

    async function boot() {
      syncInputs();
      wireInputs();
      await initProjects();
      if (isReadOnlyMode) {
        document.body.classList.add('read-only-mode');
        setProjectStatus('授权已过期：项目只读，可查看与导出。');
      }
      if (!state.activeProjectId && state.projects.length) state.activeProjectId = state.projects[0].id;
      const active = state.projects.find(project => project.id === state.activeProjectId);
      if (active) applyProjectPayload(active.payload);
      showWorkspace();
    }

    boot();
