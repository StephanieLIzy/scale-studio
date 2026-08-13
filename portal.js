const DEMO_CODE = 'SHANGHAI-20';
const STORE_KEY = 'scale-studio-mvp-state-v1';
const SESSION_KEY = 'scale-studio-guest-draft-v1';

const spaces = [
  {
    id: 'record-wall', name: '唱片墙', store: '上海店', widthCm: 192, heightCm: 288,
    dimensions: ['6 × 9 单元', '单元 32 × 32 cm', '圆孔内径 26 cm'],
    source: '用户提供照片与尺寸；整体尺寸由单元数量推导',
    image: 'assets/shanghai-record-wall-calibrated.jpg', kind: 'photo'
  },
  {
    id: 'peg-wall', name: '洞洞墙', store: '上海店', widthCm: 470, heightCm: 200,
    dimensions: ['470 × 200 cm', '轮廓视图', '实拍图待补'],
    source: '用户提供真实尺寸；当前使用低保真轮廓 Mock', image: null, kind: 'outline'
  },
  {
    id: 'window-wall-mock', name: '临窗展示面', store: '上海店 · Mock', widthCm: 360, heightCm: 240,
    dimensions: ['360 × 240 cm', '测试数据', '资料待替换'],
    source: '模拟数据，不用于实际制作', image: null, kind: 'outline'
  }
];

const defaultAccess = () => ({
  activityName: '上海店活动', code: DEMO_CODE, maxMembers: 20, members: [],
  startsAt: Date.now(), expiresAt: Date.now() + 30 * 86400000,
  storeNames: ['上海店'], spaceIds: spaces.map(space => space.id)
});

const defaultState = () => ({ member: null, access: defaultAccess(), projects: [], shares: [] });
let state = loadState();

const app = document.getElementById('app');
const accountLayer = document.getElementById('accountLayer');
const accountTrigger = document.getElementById('accountTrigger');
const freeCanvasEntry = document.getElementById('freeCanvasEntry');
const backHomeBtn = document.getElementById('backHomeBtn');

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!parsed) return defaultState();
    return {
      ...defaultState(), ...parsed,
      access: { ...defaultAccess(), ...(parsed.access || {}), members: parsed.access?.members || [] },
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      shares: Array.isArray(parsed.shares) ? parsed.shares : []
    };
  } catch { return defaultState(); }
}

function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function id(prefix) { return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 14)}`; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function formatDate(value, withTime = false) {
  return new Date(value).toLocaleString('zh-CN', withTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function toast(message) {
  const node = document.createElement('div'); node.className = 'toast'; node.textContent = message;
  document.getElementById('toastRegion').appendChild(node); setTimeout(() => node.remove(), 2600);
}

function navigate(path) { location.hash = path; window.scrollTo({ top: 0, behavior: 'instant' }); }
function routeInfo() {
  const raw = location.hash.slice(1) || '/';
  const [path, query = ''] = raw.split('?');
  return { path, query: new URLSearchParams(query) };
}

function encodeSnapshot(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value)); let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodeSnapshot(value) {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
  } catch { return null; }
}

async function copyText(value, success) {
  try { await navigator.clipboard.writeText(value); toast(success); }
  catch { window.prompt('复制下面的内容', value); }
}

function recoveryLink() {
  const snapshot = {
    version: 1, member: state.member,
    projects: state.projects.filter(project => project.memberId === state.member?.id), issuedAt: Date.now()
  };
  return `${location.origin}${location.pathname}#/access?recover=${encodeSnapshot(snapshot)}`;
}

function updateNavigation(path) {
  const inWorkspace = path === '/workspace';
  const inAccess = path === '/access';
  const inShare = path.startsWith('/share/');
  accountTrigger.hidden = !inWorkspace || !state.member;
  freeCanvasEntry.hidden = !inWorkspace;
  backHomeBtn.hidden = !(inAccess || inShare || inWorkspace);
  if (state.member) {
    document.getElementById('navNickname').textContent = state.member.nickname;
    document.getElementById('navAvatar').textContent = state.member.nickname.slice(0, 1).toUpperCase();
  }
}

function render() {
  state = loadState();
  closeAccountPanel();
  const { path, query } = routeInfo();
  updateNavigation(path);
  if (path === '/') renderLanding();
  else if (path === '/access') renderAccess(query);
  else if (path === '/workspace') renderWorkspace(query.get('view') || 'projects');
  else if (path.startsWith('/share/')) renderShare(path.split('/').pop());
  else renderLanding();
  app.focus({ preventScroll: true });
}

function renderLanding() {
  app.innerHTML = `
    <section class="landing-view">
      <div class="landing-copy">
        <p class="eyebrow">真实空间 · 实际尺寸 · 快速确认</p>
        <h1>把设计放进真实空间里看。</h1>
        <p>上传已经完成的视觉稿，在店内装饰位上确认制作尺寸、位置关系和现场效果。</p>
        <div class="hero-actions">
          <button class="button secondary" id="storeTemplateBtn" type="button">使用店内模板</button>
          <a class="button ghost" href="editor.html?mode=guest">打开自由画布</a>
        </div>
      </div>
      <div class="brand-canvas" aria-label="Scale Studio 品牌图案">
        <span class="brand-orbit orbit-one"></span>
        <span class="brand-orbit orbit-two"></span>
        <span class="brand-square square-one"></span>
        <span class="brand-square square-two"></span>
        <span class="brand-word">SCALE</span>
        <small>SIZE / SPACE / PREVIEW</small>
      </div>
    </section>`;
  document.getElementById('storeTemplateBtn').onclick = () => navigate(state.member ? '/workspace?view=projects' : '/access');
}

function renderAccess(query) {
  const recoverySnapshot = decodeSnapshot(query.get('recover') || '');
  if (!state.member && recoverySnapshot?.member) {
    state.member = recoverySnapshot.member;
    const recovered = Array.isArray(recoverySnapshot.projects) ? recoverySnapshot.projects : [];
    state.projects = state.projects.filter(project => project.memberId !== state.member.id).concat(recovered);
    if (!state.access.members.some(member => member.id === state.member.id)) state.access.members.push(state.member);
    saveState(); navigate('/workspace?view=projects'); toast('已恢复你的成员身份和项目。'); return;
  }
  if (state.member) { navigate('/workspace?view=projects'); return; }
  app.innerHTML = `
    <section class="access-view">
      <div class="access-intro">
        <p class="eyebrow">进入店内空间</p>
        <h1>两项信息，马上开始。</h1>
        <p>授权码决定你可以使用的店铺和空间；昵称用来创建你的独立项目身份。</p>
      </div>
      <section class="access-card">
        <form class="form-stack" id="joinForm">
          <label class="field"><span>授权码</span><input id="accessCode" value="${escapeHtml(state.access.code)}" autocomplete="off" required></label>
          <label class="field"><span>你的昵称</span><input id="nickname" maxlength="30" placeholder="例如 Steph" autocomplete="name" required></label>
          <button class="button secondary" type="submit">进入 ${escapeHtml(state.access.activityName)}</button>
          <p class="form-note">进入后可以随时从右上角账号菜单查看身份、授权范围和跨设备恢复方式。</p>
        </form>
      </section>
    </section>`;
  document.getElementById('joinForm').onsubmit = event => {
    event.preventDefault();
    const code = document.getElementById('accessCode').value.trim().toUpperCase();
    const nickname = document.getElementById('nickname').value.trim();
    if (code !== state.access.code) { toast('授权码无效。'); return; }
    if (Date.now() > state.access.expiresAt) { toast('该活动授权已过期。'); return; }
    if (state.access.members.length >= state.access.maxMembers) { toast('该授权已达到成员上限。'); return; }
    const member = { id: id('mem'), nickname, recoveryCode: createRecoveryCode(), createdAt: Date.now(), lastActiveAt: Date.now() };
    state.member = member; state.access.members.push(member); saveState();
    navigate('/workspace?view=projects'); toast('身份已创建，可在右上角账号菜单中随时查看。');
  };
}

function createRecoveryCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), value => chars[value % chars.length]).join('');
  return `${chunk()}-${chunk()}`;
}

function renderWorkspace(view) {
  if (!state.member) { navigate('/access'); return; }
  state.member.lastActiveAt = Date.now(); saveState();
  const projects = state.projects.filter(project => project.memberId === state.member.id);
  const isProjects = view !== 'templates';
  app.innerHTML = `
    <section class="workspace-view">
      <div class="workspace-heading">
        <div><p class="eyebrow">${escapeHtml(state.access.activityName)}</p><h1>${isProjects ? '我的项目' : '空间模板'}</h1></div>
        ${isProjects ? '<button class="button secondary" id="newProjectBtn" type="button">新建项目</button>' : ''}
      </div>
      <div class="workspace-tabs" role="tablist" aria-label="工作区内容">
        <button class="workspace-tab ${isProjects ? 'active' : ''}" data-view="projects" role="tab" aria-selected="${isProjects}">我的项目 <span>${projects.length}</span></button>
        <button class="workspace-tab ${!isProjects ? 'active' : ''}" data-view="templates" role="tab" aria-selected="${!isProjects}">空间模板 <span>${spaces.length}</span></button>
      </div>
      ${isProjects ? renderProjectGrid(projects) : `<div class="card-grid">${spaces.map(spaceCard).join('')}</div>`}
    </section>`;

  app.querySelectorAll('[data-view]').forEach(button => button.onclick = () => navigate(`/workspace?view=${button.dataset.view}`));
  app.querySelectorAll('[data-space]').forEach(button => button.onclick = () => createProject(button.dataset.space));
  app.querySelectorAll('[data-open-project]').forEach(button => button.onclick = () => openProject(button.dataset.openProject));
  app.querySelectorAll('[data-share-project]').forEach(button => button.onclick = () => createShare(button.dataset.shareProject));
  app.querySelectorAll('[data-rename-project]').forEach(button => button.onclick = () => renameProject(button.dataset.renameProject));
  document.getElementById('newProjectBtn')?.addEventListener('click', () => navigate('/workspace?view=templates'));
}

function renderProjectGrid(projects) {
  if (!projects.length) return `
    <div class="project-empty">
      <div class="empty-visual"><span></span><span></span><span></span></div>
      <h2>还没有项目</h2><p>从一个真实空间模板开始，建立你的第一份尺寸预览。</p>
      <button class="button secondary" data-view="templates" type="button">浏览空间模板</button>
    </div>`;
  return `<div class="card-grid">${projects.sort((a, b) => b.updatedAt - a.updatedAt).map(projectCard).join('')}</div>`;
}

function projectVisual(project) {
  const space = spaces.find(item => item.id === project.spaceId);
  const payload = project.editorPayload;
  const logos = Array.isArray(payload?.logos) ? payload.logos.slice(0, 12) : [];
  const background = space?.image ? `<img src="${space.image}" alt="">` : '<div class="outline-art"></div>';
  const overlays = logos.map(item => `<img class="project-overlay" src="${item.src}" alt="" style="left:${Math.max(0, Math.min(100, item.x / project.widthMm * 100))}%;top:${Math.max(0, Math.min(100, item.y / project.heightMm * 100))}%;width:${Math.max(2, Math.min(100, item.width / project.widthMm * 100))}%">`).join('');
  return `<div class="card-visual">${background}${overlays}<span class="project-status">${logos.length ? `${logos.length} 个物料` : '待编辑'}</span></div>`;
}

function projectCard(project) {
  return `<article class="content-card project-card">${projectVisual(project)}<div class="card-body"><small>${escapeHtml(project.spaceName)}</small><h2>${escapeHtml(project.name)}</h2><p>${project.widthMm} × ${project.heightMm} mm · 更新于 ${formatDate(project.updatedAt)}</p><div class="card-actions"><button class="button compact secondary" data-open-project="${project.id}" type="button">继续编辑</button><button class="icon-button" data-share-project="${project.id}" type="button" aria-label="复制只读分享链接">分享</button><button class="icon-button" data-rename-project="${project.id}" type="button" aria-label="重命名项目">•••</button></div></div></article>`;
}

function spaceCard(space) {
  const visual = space.image ? `<img src="${space.image}" alt="${space.name}实拍图">` : '<div class="outline-art"></div>';
  return `<article class="content-card"><div class="card-visual">${visual}<span class="project-status">${space.kind === 'photo' ? '实拍 + 轮廓' : '轮廓 Mock'}</span></div><div class="card-body"><small>${space.store}</small><h2>${space.name}</h2><div class="space-meta">${space.dimensions.map(item => `<span>${item}</span>`).join('')}</div><p>${space.source}</p><button class="button compact secondary" data-space="${space.id}" type="button">使用此模板</button></div></article>`;
}

function createProject(spaceId) {
  if (Date.now() > state.access.expiresAt) { toast('授权已过期，不能创建新项目。'); return; }
  if (state.projects.filter(project => project.memberId === state.member.id).length >= 20) { toast('每位成员最多创建 20 个项目。'); return; }
  const space = spaces.find(item => item.id === spaceId); if (!space) return;
  const project = { id: id('prj'), memberId: state.member.id, name: `${space.name}方案`, spaceId, spaceName: space.name, widthMm: space.widthCm * 10, heightMm: space.heightCm * 10, createdAt: Date.now(), updatedAt: Date.now(), readOnly: false };
  state.projects.push(project); saveState();
  location.href = `editor.html?project=${encodeURIComponent(project.id)}&template=${encodeURIComponent(spaceId)}`;
}

function openProject(projectId) {
  const project = state.projects.find(item => item.id === projectId && item.memberId === state.member.id);
  if (!project) { toast('无法访问这个项目。'); return; }
  const readOnly = Date.now() > state.access.expiresAt || project.readOnly ? '&readonly=1' : '';
  location.href = `editor.html?project=${encodeURIComponent(project.id)}&template=${encodeURIComponent(project.spaceId)}${readOnly}`;
}

function renameProject(projectId) {
  if (Date.now() > state.access.expiresAt) { toast('授权已过期，项目保持只读。'); return; }
  const project = state.projects.find(item => item.id === projectId && item.memberId === state.member.id); if (!project) return;
  const nextName = window.prompt('输入新的项目名称', project.name)?.trim(); if (!nextName) return;
  project.name = nextName.slice(0, 60); project.updatedAt = Date.now(); saveState(); render(); toast('项目名称已更新。');
}

function createShare(projectId) {
  const project = state.projects.find(item => item.id === projectId && item.memberId === state.member.id); if (!project) return;
  let share = state.shares.find(item => item.projectId === projectId && !item.revokedAt);
  if (!share) { share = { id: id('share'), projectId, token: id('s'), createdAt: Date.now(), revokedAt: null }; state.shares.push(share); saveState(); }
  const space = spaces.find(item => item.id === project.spaceId);
  const link = `${location.origin}${location.pathname}#/share/${encodeSnapshot({ version: 1, share, project, space })}`;
  if (link.length > 120000) { toast('项目图片较大，请先导出 PNG。'); return; }
  copyText(link, '只读分享链接已复制。');
}

function renderShare(token) {
  const snapshot = decodeSnapshot(token);
  const share = snapshot?.share || state.shares.find(item => item.token === token && !item.revokedAt);
  const project = snapshot?.project || (share && state.projects.find(item => item.id === share.projectId));
  if (!share || !project) { app.innerHTML = '<section class="simple-state"><h1>分享链接不可用</h1><p>链接可能已经失效或被撤销。</p><button class="button ghost" data-back>返回首页</button></section>'; app.querySelector('[data-back]').onclick = () => navigate('/'); return; }
  const space = snapshot?.space || spaces.find(item => item.id === project.spaceId);
  const payload = project.editorPayload; const logos = Array.isArray(payload?.logos) ? payload.logos : [];
  const background = space.image ? `<img src="${space.image}" alt="${space.name}实拍预览">` : '<div class="outline-art share-outline"></div>';
  const overlays = logos.map(item => `<img src="${item.src}" alt="${escapeHtml(item.name)}" style="position:absolute;left:${item.x / project.widthMm * 100}%;top:${item.y / project.heightMm * 100}%;width:${item.width / project.widthMm * 100}%;transform:rotate(${item.rotation || 0}deg)">`).join('');
  app.innerHTML = `<section class="share-view"><div class="share-heading"><p class="eyebrow">只读预览</p><h1>${escapeHtml(project.name)}</h1><p>${space.store} · ${space.name} · ${project.widthMm} × ${project.heightMm} mm</p></div><div class="share-canvas">${background}${overlays}</div></section>`;
}

function openAccountPanel() {
  if (!state.member) return;
  const valid = Date.now() <= state.access.expiresAt;
  accountLayer.innerHTML = `<div class="account-scrim" data-close-account></div><aside class="account-panel" role="dialog" aria-modal="true" aria-label="账号与授权信息"><div class="account-head"><div><small>当前身份</small><h2>${escapeHtml(state.member.nickname)}</h2></div><button class="modal-close" data-close-account type="button" aria-label="关闭">×</button></div><div class="account-section"><span class="account-label">活动</span><strong>${escapeHtml(state.access.activityName)}</strong><p>${formatDate(state.access.startsAt)} — ${formatDate(state.access.expiresAt)} · ${valid ? '授权有效' : '已过期'}</p></div><div class="account-section"><span class="account-label">授权范围</span><strong>${state.access.storeNames.map(escapeHtml).join('、')}</strong><p>${state.access.spaceIds.length} 个可用空间 · 成员 ${state.access.members.length} / ${state.access.maxMembers}</p><button class="copy-row" id="copyAccessCode" type="button"><span><small>活动授权码</small><b>${escapeHtml(state.access.code)}</b></span><em>复制</em></button></div><div class="account-section"><span class="account-label">跨设备继续</span><p>恢复码属于你个人，不要和活动授权码混用。</p><button class="copy-row" id="copyRecoveryCode" type="button"><span><small>个人恢复码</small><b>${escapeHtml(state.member.recoveryCode)}</b></span><em>复制</em></button><button class="button secondary full" id="copyRecoveryLink" type="button">复制个人恢复链接</button></div><div class="account-footer"><span>成员 ID：${state.member.id}</span><button class="text-button" id="logoutBtn" type="button">退出当前身份</button></div></aside>`;
  accountLayer.hidden = false; accountTrigger.setAttribute('aria-expanded', 'true');
  accountLayer.querySelectorAll('[data-close-account]').forEach(node => node.onclick = closeAccountPanel);
  document.getElementById('copyAccessCode').onclick = () => copyText(state.access.code, '活动授权码已复制。');
  document.getElementById('copyRecoveryCode').onclick = () => copyText(state.member.recoveryCode, '个人恢复码已复制。');
  document.getElementById('copyRecoveryLink').onclick = () => copyText(recoveryLink(), '个人恢复链接已复制。');
  document.getElementById('logoutBtn').onclick = () => { state.member = null; saveState(); closeAccountPanel(); navigate('/'); };
}

function closeAccountPanel() { accountLayer.hidden = true; accountLayer.innerHTML = ''; accountTrigger?.setAttribute('aria-expanded', 'false'); }

accountTrigger.onclick = openAccountPanel;
backHomeBtn.onclick = () => navigate('/');
window.addEventListener('hashchange', render);
window.addEventListener('keydown', event => { if (event.key === 'Escape') closeAccountPanel(); });
render();
