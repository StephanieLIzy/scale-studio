const DEMO_CODE = 'SHANGHAI-20';
const STORE_KEY = 'scale-studio-mvp-state-v1';
const SESSION_KEY = 'scale-studio-guest-draft-v1';

const spaces = [
  {
    id: 'record-wall',
    name: '唱片墙',
    store: '上海店',
    widthCm: 192,
    heightCm: 288,
    dimensions: ['6 × 9 单元', '单元 32 × 32 cm', '圆孔内径 26 cm'],
    source: '用户提供照片与尺寸；整体尺寸由单元数量推导',
    image: 'assets/shanghai-record-wall-calibrated.jpg',
    kind: 'photo'
  },
  {
    id: 'peg-wall',
    name: '洞洞墙',
    store: '上海店',
    widthCm: 470,
    heightCm: 200,
    dimensions: ['470 × 200 cm', '轮廓视图', '实拍图待补'],
    source: '用户提供真实尺寸；当前使用低保真轮廓 Mock',
    image: null,
    kind: 'outline'
  },
  {
    id: 'window-wall-mock',
    name: '临窗展示面',
    store: '上海店 · Mock',
    widthCm: 360,
    heightCm: 240,
    dimensions: ['360 × 240 cm', '测试数据', '后续由飞书资料替换'],
    source: '模拟数据，不用于实际制作',
    image: null,
    kind: 'outline'
  }
];

const defaultState = () => ({
  member: null,
  access: { code: DEMO_CODE, maxMembers: 20, members: [], expiresAt: Date.now() + 30 * 86400000 },
  projects: [],
  shares: [],
  adminUnlocked: false
});

let state = loadState();
const app = document.getElementById('app');

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
    return parsed ? { ...defaultState(), ...parsed } : defaultState();
  } catch { return defaultState(); }
}

function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function id(prefix) { return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 14)}`; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function formatDate(value) { return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }

function toast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  document.getElementById('toastRegion').appendChild(node);
  setTimeout(() => node.remove(), 2600);
}

function navigate(path) {
  location.hash = path;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function currentRoute() { return (location.hash.slice(1) || '/').split('?')[0]; }

function encodeSnapshot(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodeSnapshot(value) {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}

function hashQuery() {
  const query = location.hash.split('?')[1] || '';
  return new URLSearchParams(query);
}

function render() {
  const route = currentRoute();
  if (route === '/') renderLanding();
  else if (route === '/access') renderAccess();
  else if (route === '/workspace') renderWorkspace();
  else if (route === '/admin') renderAdmin();
  else if (route.startsWith('/share/')) renderShare(route.split('/').pop());
  else renderLanding();
  app.focus({ preventScroll: true });
}

function renderLanding() {
  app.innerHTML = `
    <section class="view">
      <div class="hero">
        <div>
          <p class="eyebrow">真实空间 · 实际尺寸 · 快速确认</p>
          <h1>把设计，放进真实空间里看。</h1>
          <p class="hero-copy">Scale Studio 不替你做设计。它帮助你把已经做好的视觉稿放进店内装饰位，确认制作尺寸、位置关系和最终效果。</p>
          <div class="hero-actions">
            <button class="button secondary" data-action="access" type="button">使用上海店模板</button>
            <button class="button ghost" data-action="guest" type="button">打开自由画布</button>
          </div>
        </div>
        <figure class="hero-visual">
          <img src="assets/shanghai-record-wall-calibrated.jpg" alt="上海店唱片墙校准实拍图">
          <figcaption class="measurement-card">
            <strong>上海店 · 唱片墙</strong>
            <div class="measurement-list"><span>6 × 9 单元</span><span>单元 32 cm</span><span>圆孔内径 26 cm</span></div>
          </figcaption>
        </figure>
      </div>
      <div class="path-grid">
        <article class="path-card dark">
          <div><p class="eyebrow">已获得店铺授权</p><h2>使用真实店内空间模板</h2><p>通过邀请链接、二维码或授权码进入。每位成员拥有独立身份和项目，互相不可见。</p></div>
          <button class="button" data-action="access" type="button">进入授权流程</button>
        </article>
        <article class="path-card">
          <div><p class="eyebrow">无需登录</p><h2>临时使用自定义画布</h2><p>可以上传、调整和导出。刷新可恢复，关闭标签页后不再保留。</p></div>
          <button class="button ghost" data-action="guest" type="button">直接开始</button>
        </article>
      </div>
    </section>`;

  app.querySelectorAll('[data-action="access"]').forEach(button => button.onclick = () => navigate('/access'));
  app.querySelectorAll('[data-action="guest"]').forEach(button => button.onclick = () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ startedAt: Date.now() }));
    location.href = 'editor.html?mode=guest';
  });
}

function renderAccess() {
  const recoverySnapshot = decodeSnapshot(hashQuery().get('recover') || '');
  if (!state.member && recoverySnapshot?.member) {
    state.member = recoverySnapshot.member;
    const importedProjects = Array.isArray(recoverySnapshot.projects) ? recoverySnapshot.projects : [];
    state.projects = state.projects.filter(project => project.memberId !== state.member.id).concat(importedProjects);
    if (!state.access.members.some(member => member.id === state.member.id)) state.access.members.push(state.member);
    saveState();
    toast('已从个人链接恢复成员身份和测试项目快照。');
  }
  if (state.member) { navigate('/workspace'); return; }
  app.innerHTML = `
    <section class="view">
      <div class="section-head"><div><p class="eyebrow">快速进入</p><h1>不注册账号，也能保留自己的项目。</h1></div><p>授权码只决定你能使用哪些空间；昵称和系统生成的成员凭证用于区分每个人。</p></div>
      <div class="access-layout">
        <section class="panel"><div class="panel-body"><h2 class="panel-title">第一次使用</h2><p class="panel-copy">输入活动授权码和你的昵称，系统会创建独立成员身份。</p>
          <form class="form-stack" id="joinForm">
            <label class="field"><span>授权码</span><input id="accessCode" value="${DEMO_CODE}" autocomplete="off" required></label>
            <label class="field"><span>你的昵称</span><input id="nickname" maxlength="30" placeholder="例如 Steph" autocomplete="name" required></label>
            <button class="button secondary" type="submit">创建身份并进入</button>
            <p class="form-note">测试版会在这个浏览器保存项目。创建后可复制个人恢复链接，在其他设备恢复同一个成员。</p>
          </form>
        </div></section>
        <aside class="demo-access"><p class="eyebrow">测试授权</p><h2>上海店全部 Mock 空间</h2><code>${DEMO_CODE}</code><ul><li>共享授权，最多 20 位成员</li><li>成员项目默认互相不可见</li><li>有效期 30 天</li><li>达到人数上限后禁止新成员加入</li></ul></aside>
      </div>
    </section>`;

  document.getElementById('joinForm').onsubmit = event => {
    event.preventDefault();
    const code = document.getElementById('accessCode').value.trim().toUpperCase();
    const nickname = document.getElementById('nickname').value.trim();
    if (code !== state.access.code) { toast('授权码无效，请使用页面提供的测试码。'); return; }
    if (state.access.members.length >= state.access.maxMembers) { toast('该共享授权已达到 20 人上限。'); return; }
    const member = { id: id('mem'), nickname, recoveryCode: createRecoveryCode(), createdAt: Date.now(), lastActiveAt: Date.now() };
    state.member = member;
    state.access.members.push(member);
    saveState();
    showCredential(member);
  };
}

function createRecoveryCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), value => chars[value % chars.length]).join('');
  return `${chunk()}-${chunk()}`;
}

function showCredential(member) {
  const snapshot = {
    version: 1,
    member,
    projects: state.projects.filter(project => project.memberId === member.id),
    issuedAt: Date.now()
  };
  const link = `${location.origin}${location.pathname}#/access?recover=${encodeSnapshot(snapshot)}`;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="credentialTitle"><div class="modal-head"><h2 id="credentialTitle">保存你的跨设备凭证</h2></div><div class="modal-body"><p class="panel-copy">这是恢复同一个成员身份与当前测试项目快照的凭证，不是团队共享授权码。请不要发到公开群聊。正式版将替换成服务端 Token。</p><div class="credential-box"><small>成员</small><code>${escapeHtml(member.nickname)} · ${member.id}</code><small>恢复码</small><code>${member.recoveryCode}</code></div><div class="hero-actions"><button class="button secondary" id="copyRecovery" type="button">复制个人恢复链接</button><button class="button ghost" id="continueWorkspace" type="button">我已保存，继续</button></div></div></section>`;
  document.body.appendChild(backdrop);
  document.getElementById('copyRecovery').onclick = async () => { await navigator.clipboard.writeText(link); toast('个人恢复链接已复制。'); };
  document.getElementById('continueWorkspace').onclick = () => { backdrop.remove(); navigate('/workspace'); };
}

function renderWorkspace() {
  if (!state.member) { navigate('/access'); return; }
  state.member.lastActiveAt = Date.now(); saveState();
  const projects = state.projects.filter(project => project.memberId === state.member.id);
  app.innerHTML = `
    <section class="view">
      <div class="workspace-bar"><div><p class="eyebrow">上海店活动工作区</p><h1 style="max-width:none;font-size:clamp(38px,6vw,76px)">选择一个真实空间开始。</h1></div><div class="member-chip"><span class="member-avatar">${escapeHtml(state.member.nickname.slice(0,1).toUpperCase())}</span><span>${escapeHtml(state.member.nickname)}</span></div></div>
      <div class="workspace-layout">
        <div>
          <div class="space-grid">${spaces.map(spaceCard).join('')}</div>
          <div style="margin-top:42px"><div class="section-head"><h2 style="font-size:36px">我的项目</h2><p>同一授权下的其他成员看不到这里的内容。</p></div>
          <div class="project-list">${projects.length ? projects.map(projectItem).join('') : '<div class="empty-state">还没有项目。请从上方选择一个空间开始。</div>'}</div></div>
        </div>
        <aside class="side-stack">
          <div class="info-card"><h3>跨设备继续</h3><p>复制个人恢复链接，在另一台设备打开后恢复同一个成员身份。</p><button class="button ghost" id="recoveryBtn" type="button">查看恢复凭证</button></div>
          <div class="info-card"><h3>自由画布</h3><p>临时项目只保留在当前标签页，可以导出预览图和数据。</p><a class="button ghost" href="editor.html?mode=guest">打开自由画布</a></div>
          <div class="info-card"><h3>授权状态</h3><p><span class="status-dot"></span>有效至 ${new Date(state.access.expiresAt).toLocaleDateString('zh-CN')}<br>${state.access.members.length} / ${state.access.maxMembers} 位测试成员</p></div>
          <div class="info-card"><h3>切换测试身份</h3><p>退出只会移除本设备上的当前身份，不会删除已有测试项目。</p><button class="button ghost" id="logoutBtn" type="button">退出当前身份</button></div>
        </aside>
      </div>
    </section>`;

  app.querySelectorAll('[data-space]').forEach(button => button.onclick = () => createProject(button.dataset.space));
  app.querySelectorAll('[data-open-project]').forEach(button => button.onclick = () => openProject(button.dataset.openProject));
  app.querySelectorAll('[data-share-project]').forEach(button => button.onclick = () => createShare(button.dataset.shareProject));
  app.querySelectorAll('[data-rename-project]').forEach(button => button.onclick = () => renameProject(button.dataset.renameProject));
  document.getElementById('recoveryBtn').onclick = () => showCredential(state.member);
  document.getElementById('logoutBtn').onclick = () => { state.member = null; saveState(); navigate('/access'); };
}

function spaceCard(space) {
  const visual = space.image ? `<img src="${space.image}" alt="${space.name}实拍图">` : '';
  return `<article class="space-card"><div class="space-preview ${space.kind === 'outline' ? 'outline' : ''}">${visual}</div><div class="space-data"><small>${space.store}</small><h3>${space.name}</h3><div class="space-meta">${space.dimensions.map(item => `<span>${item}</span>`).join('')}</div><p class="form-note">${space.source}</p><div class="space-actions"><button class="button compact secondary" data-space="${space.id}" type="button">创建项目</button></div></div></article>`;
}

function projectItem(project) {
  return `<article class="project-item"><div><strong>${escapeHtml(project.name)}</strong><small>${project.spaceName} · ${formatDate(project.updatedAt)}</small></div><div class="space-actions"><button class="button ghost compact" data-open-project="${project.id}" type="button">打开编辑</button><button class="button ghost compact" data-rename-project="${project.id}" type="button">重命名</button><button class="button ghost compact" data-share-project="${project.id}" type="button">只读分享</button></div></article>`;
}

function renameProject(projectId) {
  if (Date.now() > state.access.expiresAt) { toast('授权已过期，项目保持只读。'); return; }
  const project = state.projects.find(item => item.id === projectId && item.memberId === state.member.id);
  if (!project) return;
  const nextName = window.prompt('输入新的项目名称', project.name)?.trim();
  if (!nextName) return;
  project.name = nextName.slice(0, 60);
  project.updatedAt = Date.now();
  saveState();
  renderWorkspace();
  toast('项目名称已更新。');
}

function createProject(spaceId) {
  if (Date.now() > state.access.expiresAt) { toast('授权已过期，不能创建新的店内模板项目。'); return; }
  if (state.projects.filter(project => project.memberId === state.member.id).length >= 20) { toast('每位成员最多创建 20 个项目。'); return; }
  const space = spaces.find(item => item.id === spaceId);
  const project = { id: id('prj'), memberId: state.member.id, name: `${space.name}方案`, spaceId, spaceName: space.name, widthMm: space.widthCm * 10, heightMm: space.heightCm * 10, createdAt: Date.now(), updatedAt: Date.now(), readOnly: Date.now() > state.access.expiresAt };
  state.projects.push(project); saveState();
  sessionStorage.setItem('scale-studio-active-template', JSON.stringify(project));
  location.href = `editor.html?project=${encodeURIComponent(project.id)}&template=${encodeURIComponent(spaceId)}`;
}

function openProject(projectId) {
  const project = state.projects.find(item => item.id === projectId && item.memberId === state.member.id);
  if (!project) { toast('无法访问这个项目。'); return; }
  sessionStorage.setItem('scale-studio-active-template', JSON.stringify(project));
  const readOnly = Date.now() > state.access.expiresAt ? '&readonly=1' : '';
  location.href = `editor.html?project=${encodeURIComponent(project.id)}&template=${encodeURIComponent(project.spaceId)}${readOnly}`;
}

function createShare(projectId) {
  const project = state.projects.find(item => item.id === projectId && item.memberId === state.member.id);
  if (!project) return;
  let share = state.shares.find(item => item.projectId === projectId && !item.revokedAt);
  if (!share) { share = { id: id('share'), projectId, token: id('s'), createdAt: Date.now(), revokedAt: null }; state.shares.push(share); saveState(); }
  const space = spaces.find(item => item.id === project.spaceId);
  const latestState = loadState();
  const latestProject = latestState.projects.find(item => item.id === projectId) || project;
  const snapshot = encodeSnapshot({ version: 1, share, project: latestProject, space });
  const link = `${location.origin}${location.pathname}#/share/${snapshot}`;
  if (link.length > 120000) { toast('当前项目图片较大，测试版分享链接超出安全长度；请先导出 PNG。'); return; }
  navigator.clipboard.writeText(link).then(() => toast('只读分享链接已复制。'));
}

function renderShare(token) {
  const externalSnapshot = decodeSnapshot(token);
  const share = externalSnapshot?.share || state.shares.find(item => item.token === token && !item.revokedAt);
  const project = externalSnapshot?.project || (share && state.projects.find(item => item.id === share.projectId));
  if (!share || !project) {
    app.innerHTML = `<section class="view"><div class="empty-state"><h2>分享链接不可用</h2><p>链接可能已被撤销，或这个浏览器没有测试项目数据。</p><a class="button ghost" href="#/">返回首页</a></div></section>`; return;
  }
  const space = externalSnapshot?.space || spaces.find(item => item.id === project.spaceId);
  const payload = project.editorPayload;
  const logos = Array.isArray(payload?.logos) ? payload.logos : [];
  const background = space.image ? `<img src="${space.image}" alt="${space.name}实拍预览">` : '<div class="space-preview outline" style="height:100%"></div>';
  const overlays = logos.map(item => {
    const left = Math.max(0, Math.min(100, (item.x / project.widthMm) * 100));
    const top = Math.max(0, Math.min(100, (item.y / project.heightMm) * 100));
    const width = Math.max(1, Math.min(100, (item.width / project.widthMm) * 100));
    return `<img src="${item.src}" alt="${escapeHtml(item.name)}" style="position:absolute;left:${left}%;top:${top}%;width:${width}%;height:auto;transform:rotate(${item.rotation || 0}deg);transform-origin:center;object-fit:contain">`;
  }).join('');
  app.innerHTML = `<section class="view"><div class="section-head"><div><p class="eyebrow">只读预览</p><h1>${escapeHtml(project.name)}</h1></div><p>此页面不能修改项目，也不会暴露其他成员或空白模板数据。</p></div><article class="panel"><div class="hero-visual" style="border-radius:0;min-height:min(66vh,720px)">${background}${overlays}<div class="measurement-card"><strong>${space.store} · ${space.name}</strong><div class="measurement-list"><span>${project.widthMm} × ${project.heightMm} mm</span><span>${logos.length} 个物料</span><span>发布于 ${formatDate(share.createdAt)}</span></div></div></div></article></section>`;
}

function renderAdmin() {
  if (!state.adminUnlocked) {
    app.innerHTML = `<section class="view"><div class="access-layout"><section class="panel"><div class="panel-body"><p class="eyebrow">管理员测试入口</p><h1 style="max-width:12ch;font-size:clamp(42px,6vw,76px)">查看授权、成员和项目内容。</h1><form class="form-stack" id="adminForm" style="margin-top:30px"><label class="field"><span>测试管理口令</span><input id="adminCode" type="password" placeholder="输入 ADMIN-DEMO"></label><button class="button secondary" type="submit">进入管理测试</button></form></div></section><aside class="demo-access"><h2>测试说明</h2><code>ADMIN-DEMO</code><p>正式版将改用强认证，并在服务端执行全部权限检查。</p></aside></div></section>`;
    document.getElementById('adminForm').onsubmit = event => { event.preventDefault(); if (document.getElementById('adminCode').value === 'ADMIN-DEMO') { state.adminUnlocked = true; saveState(); renderAdmin(); } else toast('管理测试口令错误。'); };
    return;
  }
  app.innerHTML = `<section class="view"><div class="section-head"><div><p class="eyebrow">管理测试</p><h1>上海店授权与项目</h1></div><p>当前数据保存在这个浏览器，用于验证后台信息结构。</p></div><div class="admin-layout"><section class="panel"><div class="panel-body"><h2 class="panel-title">成员与项目</h2><div style="overflow:auto"><table class="admin-table"><thead><tr><th>成员</th><th>内部 ID</th><th>最近活跃</th><th>项目</th></tr></thead><tbody>${state.access.members.map(member => `<tr><td>${escapeHtml(member.nickname)}</td><td>${member.id}</td><td>${formatDate(member.lastActiveAt)}</td><td>${state.projects.filter(p => p.memberId === member.id).map(p => `${escapeHtml(p.name)} <button class="text-button" type="button" data-admin-project="${p.id}">查看</button>`).join('<br>') || '—'}</td></tr>`).join('') || '<tr><td colspan="4">暂无成员</td></tr>'}</tbody></table></div></div></section><aside class="side-stack"><div class="info-card"><h3>共享授权</h3><p>测试码 ${DEMO_CODE}<br>${state.access.members.length} / ${state.access.maxMembers} 人<br>超过后直接禁止加入</p></div><div class="info-card"><h3>空间数据</h3><p>${spaces.length} 个空间，其中 ${spaces.filter(s => s.store.includes('Mock')).length} 个明确标记为 Mock。</p></div></aside></div></section>`;
  app.querySelectorAll('[data-admin-project]').forEach(button => button.onclick = () => {
    const project = state.projects.find(item => item.id === button.dataset.adminProject);
    const space = project && spaces.find(item => item.id === project.spaceId);
    if (!project || !space) return;
    const share = { projectId: project.id, createdAt: Date.now(), token: 'admin-preview' };
    navigate(`/share/${encodeSnapshot({ version: 1, share, project, space })}`);
  });
}

document.getElementById('adminEntry').onclick = () => navigate('/admin');
window.addEventListener('hashchange', render);
render();
