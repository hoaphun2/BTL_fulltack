/* ============================================================
   PROJECT HUB – MAIN APPLICATION SCRIPT
   API Base: http://localhost:5212
   ============================================================ */

const API = 'http://103.178.235.78:5001/api';
let currentUserId = localStorage.getItem('userId') || 'user-001';
let currentUserName = localStorage.getItem('userName') || 'Demo User';
let allProjects = [];
let currentProject = null;
let currentTab = 'members';

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  updateUserDisplay();
  loadProjects();
});

/* ============================================================
   USER MANAGEMENT
   ============================================================ */
function updateUserDisplay() {
  document.getElementById('username-display').textContent = currentUserName;
  document.getElementById('userid-small').textContent = currentUserId;
  document.getElementById('avatar-display').textContent = currentUserName.charAt(0).toUpperCase();
}

function showUserModal() {
  openModal('Cài đặt người dùng', `
    <div class="form-group">
      <label class="form-label">Tên hiển thị <span class="req">*</span></label>
      <input id="f-username" class="form-input" value="${currentUserName}" placeholder="Nhập tên của bạn" />
    </div>
    <div class="form-group">
      <label class="form-label">User ID <span class="req">*</span></label>
      <input id="f-userid" class="form-input" value="${currentUserId}" placeholder="user-001" />
      <p style="font-size:.75rem;color:var(--text-muted);margin-top:6px;">
        ID này được gửi kèm theo mọi request để xác định người dùng (header X-User-Id).
      </p>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveUser()">Lưu</button>
    </div>
  `);
}

function saveUser() {
  const name = document.getElementById('f-username').value.trim();
  const id   = document.getElementById('f-userid').value.trim();
  if (!name || !id) { showToast('Vui lòng điền đầy đủ thông tin', 'error'); return; }
  currentUserName = name;
  currentUserId   = id;
  localStorage.setItem('userName', name);
  localStorage.setItem('userId', id);
  updateUserDisplay();
  closeModal();
  showToast('Đã cập nhật thông tin người dùng', 'success');
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`page-${page}`).classList.add('active');
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  const topBtn = document.getElementById('topbar-action-btn');
  const breadcrumb = document.getElementById('breadcrumb');

  if (page === 'projects') {
    breadcrumb.textContent = 'Tất cả dự án';
    topBtn.textContent = '＋ Tạo dự án';
    topBtn.onclick = showCreateProjectModal;
    loadProjects();
  } else if (page === 'myprojects') {
    breadcrumb.textContent = 'Dự án của tôi';
    topBtn.textContent = '＋ Tạo dự án';
    topBtn.onclick = showCreateProjectModal;
    loadMyProjects();
  } else if (page === 'detail') {
    topBtn.style.display = 'none';
  }

  if (page !== 'detail') {
    topBtn.style.display = '';
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ============================================================
   API HELPERS
   ============================================================ */
async function apiFetch(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': currentUserId
    }
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(API + endpoint, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    showToast('Không thể kết nối đến API server', 'error');
    return { ok: false, data: { message: e.message } };
  }
}

/* ============================================================
   PROJECTS – LIST
   ============================================================ */
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Đang tải dự án...</p></div>`;
  const { ok, data } = await apiFetch('/projects');
  if (ok && data.success) {
    allProjects = data.data || [];
    renderProjectsGrid('projects-grid', allProjects);
  } else {
    grid.innerHTML = renderEmpty('Không thể tải danh sách dự án');
  }
}

async function loadMyProjects() {
  const grid = document.getElementById('myprojects-grid');
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Đang tải...</p></div>`;
  const { ok, data } = await apiFetch('/projects?myProjects=true');
  if (ok && data.success) {
    renderProjectsGrid('myprojects-grid', data.data || []);
  } else {
    grid.innerHTML = renderEmpty('Không tìm thấy dự án nào');
  }
}

function filterProjects() {
  const q = document.getElementById('search-projects').value.toLowerCase();
  const filtered = allProjects.filter(p =>
    p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
  );
  renderProjectsGrid('projects-grid', filtered);
}

function renderProjectsGrid(gridId, projects) {
  const grid = document.getElementById(gridId);
  if (!projects.length) {
    grid.innerHTML = renderEmpty('Chưa có dự án nào. Hãy tạo dự án đầu tiên!');
    return;
  }
  grid.innerHTML = projects.map(p => renderProjectCard(p)).join('');
}

function renderProjectCard(p) {
  const color = p.color || '#6c63ff';
  const startD = formatDate(p.startDate);
  const endD = p.endDate ? formatDate(p.endDate) : '—';
  return `
    <div class="project-card" style="--project-color:${color}" onclick="openProjectDetail('${p.id}')">
      <div class="card-top">
        <div class="card-title">${escHtml(p.name)}</div>
        <span class="card-status status-${p.status}">${p.status}</span>
      </div>
      <div class="card-desc">${escHtml(p.description || 'Không có mô tả')}</div>
      <div class="card-meta">
        <div class="meta-item">👥 <b>${p.memberCount}</b> thành viên</div>
        <div class="meta-item">🔄 <b>${p.sprintCount}</b> sprint</div>
        <div class="meta-item">📅 ${startD}</div>
        <div class="meta-item">🏁 ${endD}</div>
      </div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-sm" onclick="showEditProjectModal('${p.id}')">✎ Sửa</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteProject('${p.id}', '${escHtml(p.name)}')">🗑 Xóa</button>
      </div>
    </div>
  `;
}

/* ============================================================
   PROJECTS – CREATE / EDIT
   ============================================================ */
function showCreateProjectModal() {
  openModal('Tạo dự án mới', buildProjectForm());
}

async function showEditProjectModal(id) {
  const { ok, data } = await apiFetch(`/projects/${id}`);
  if (!ok || !data.success) { showToast('Không tải được dự án', 'error'); return; }
  const p = data.data;
  openModal('Chỉnh sửa dự án', buildProjectForm(p));
}

function buildProjectForm(p = null) {
  const isEdit = !!p;
  const val = (f, def = '') => p ? (p[f] ?? def) : def;
  const toDateInput = d => d ? d.split('T')[0] : '';

  const statusOptions = ['Active','Completed','Archived'].map(s =>
    `<option value="${s}" ${val('status') === s ? 'selected':''}>${s}</option>`
  ).join('');

  return `
    <div class="form-group">
      <label class="form-label">Tên dự án <span class="req">*</span></label>
      <input id="f-name" class="form-input" placeholder="VD: Hệ thống quản lý nhân sự" value="${escHtml(val('name'))}" maxlength="200" />
    </div>
    <div class="form-group">
      <label class="form-label">Mô tả</label>
      <textarea id="f-desc" class="form-textarea" placeholder="Mô tả ngắn về dự án...">${escHtml(val('description'))}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ngày bắt đầu <span class="req">*</span></label>
        <input id="f-start" type="date" class="form-input" value="${toDateInput(val('startDate'))}" />
      </div>
      <div class="form-group">
        <label class="form-label">Ngày kết thúc</label>
        <input id="f-end" type="date" class="form-input" value="${toDateInput(val('endDate'))}" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Màu dự án</label>
        <div class="color-preview">
          <input id="f-color" type="color" style="width:44px;height:36px;border:none;background:none;cursor:pointer;padding:0;" value="${val('color','#6c63ff')}" />
          <input id="f-color-hex" class="form-input" style="flex:1" placeholder="#6c63ff" value="${val('color','#6c63ff')}" oninput="syncColorHex()" maxlength="7" />
        </div>
      </div>
      ${isEdit ? `
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="f-status" class="form-select">${statusOptions}</select>
      </div>` : '<div></div>'}
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="${isEdit ? `submitEditProject('${p.id}')` : 'submitCreateProject()'}">
        ${isEdit ? '💾 Lưu thay đổi' : '✚ Tạo dự án'}
      </button>
    </div>
  `;
}

function syncColorHex() {
  const hex = document.getElementById('f-color-hex').value;
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    document.getElementById('f-color').value = hex;
  }
}

function collectProjectForm(isEdit = false) {
  const name    = document.getElementById('f-name').value.trim();
  const desc    = document.getElementById('f-desc').value.trim();
  const start   = document.getElementById('f-start').value;
  const end     = document.getElementById('f-end').value;
  const colorHex = document.getElementById('f-color-hex').value.trim();
  const color   = /^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : null;

  if (!name) { showToast('Tên dự án là bắt buộc', 'error'); return null; }
  if (!start) { showToast('Ngày bắt đầu là bắt buộc', 'error'); return null; }

  const dto = { name, description: desc || null, startDate: start, endDate: end || null, color };
  if (isEdit) {
    dto.status = document.getElementById('f-status').value;
  }
  return dto;
}

async function submitCreateProject() {
  const dto = collectProjectForm(false);
  if (!dto) return;
  const { ok, data } = await apiFetch('/projects', 'POST', dto);
  if (ok && data.success) {
    closeModal();
    showToast('✅ Tạo dự án thành công!', 'success');
    loadProjects();
  } else {
    showToast(data.message || 'Tạo thất bại', 'error');
  }
}

async function submitEditProject(id) {
  const dto = collectProjectForm(true);
  if (!dto) return;
  const { ok, data } = await apiFetch(`/projects/${id}`, 'PUT', dto);
  if (ok && data.success) {
    closeModal();
    showToast('✅ Cập nhật thành công!', 'success');
    if (currentProject?.id === id) openProjectDetail(id);
    else loadProjects();
  } else {
    showToast(data.message || 'Cập nhật thất bại', 'error');
  }
}

function confirmDeleteProject(id, name) {
  openModal('Xác nhận xóa', `
    <p style="color:var(--text-secondary);margin-bottom:20px;">
      Bạn có chắc muốn xóa dự án <strong style="color:var(--danger)">"${escHtml(name)}"</strong>?
      Hành động này không thể hoàn tác.
    </p>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-danger" onclick="deleteProject('${id}')">🗑 Xóa dự án</button>
    </div>
  `);
}

async function deleteProject(id) {
  const { ok, data } = await apiFetch(`/projects/${id}`, 'DELETE');
  if (ok && data.success) {
    closeModal();
    showToast('🗑 Đã xóa dự án', 'info');
    if (document.getElementById('page-detail').classList.contains('active')) {
      showPage('projects');
    } else {
      loadProjects();
    }
  } else {
    showToast(data.message || 'Xóa thất bại', 'error');
  }
}

/* ============================================================
   PROJECT DETAIL
   ============================================================ */
async function openProjectDetail(id) {
  showPage('detail');
  const content = document.getElementById('project-detail-content');
  content.innerHTML = `<div class="loading-state" style="height:300px"><div class="spinner"></div><p>Đang tải chi tiết...</p></div>`;

  const { ok, data } = await apiFetch(`/projects/${id}`);
  if (!ok || !data.success) {
    content.innerHTML = renderEmpty('Không thể tải chi tiết dự án');
    return;
  }
  currentProject = data.data;
  renderProjectDetail(currentProject);
}

function renderProjectDetail(p) {
  const content = document.getElementById('project-detail-content');
  const color = p.color || '#6c63ff';
  const endD = p.endDate ? formatDate(p.endDate) : 'Chưa xác định';
  const members = p.members || [];
  const sprints = p.sprints || [];
  const milestones = p.milestones || [];

  const activeSprints   = sprints.filter(s => s.status === 'Active').length;
  const doneMilestones  = milestones.filter(m => m.isCompleted).length;

  // breadcrumb
  document.getElementById('breadcrumb').innerHTML =
    `<a href="#" onclick="showPage('projects')">Dự án</a> <span>/</span> ${escHtml(p.name)}`;
  document.getElementById('topbar-action-btn').style.display = 'none';

  content.innerHTML = `
    <!-- HEADER -->
    <div class="detail-header">
      <div>
        <div class="detail-title-row">
          <div class="detail-color-dot" style="background:${color}"></div>
          <h1 class="detail-title">${escHtml(p.name)}</h1>
          <span class="card-status status-${p.status}">${p.status}</span>
        </div>
        <p style="color:var(--text-secondary);margin-top:8px;font-size:.88rem;max-width:600px">
          ${escHtml(p.description || 'Không có mô tả')}
        </p>
      </div>
      <div class="detail-actions">
        <button class="btn btn-secondary" onclick="showEditProjectModal('${p.id}')">✎ Chỉnh sửa</button>
        <button class="btn btn-danger" onclick="confirmDeleteProject('${p.id}','${escHtml(p.name)}')">🗑 Xóa</button>
      </div>
    </div>

    <div class="detail-meta-row">
      <div class="detail-meta-item">📅 Bắt đầu: <b>${formatDate(p.startDate)}</b></div>
      <div class="detail-meta-item">🏁 Kết thúc: <b>${endD}</b></div>
      <div class="detail-meta-item">👤 Tạo bởi: <b>${escHtml(p.createdBy)}</b></div>
      <div class="detail-meta-item">🕒 Cập nhật: <b>${formatDateTime(p.updatedAt)}</b></div>
    </div>

    <!-- STATS -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Thành viên</div>
        <div class="stat-value accent">${members.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tổng Sprint</div>
        <div class="stat-value">${sprints.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sprint đang chạy</div>
        <div class="stat-value warning">${activeSprints}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Milestone hoàn thành</div>
        <div class="stat-value success">${doneMilestones}/${milestones.length}</div>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs">
      <button class="tab-btn active" id="tab-members" onclick="switchTab('members')">👥 Thành viên (${members.length})</button>
      <button class="tab-btn" id="tab-sprints"  onclick="switchTab('sprints')">🔄 Sprint (${sprints.length})</button>
      <button class="tab-btn" id="tab-milestones" onclick="switchTab('milestones')">🎯 Milestone (${milestones.length})</button>
    </div>

    <!-- TAB: MEMBERS -->
    <div id="tabpanel-members" class="tab-panel active">
      ${renderMembersPanel(members, p.id)}
    </div>

    <!-- TAB: SPRINTS -->
    <div id="tabpanel-sprints" class="tab-panel">
      ${renderSprintsPanel(sprints, p.id)}
    </div>

    <!-- TAB: MILESTONES -->
    <div id="tabpanel-milestones" class="tab-panel">
      ${renderMilestonesPanel(milestones, p.id)}
    </div>
  `;
  currentTab = 'members';
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`tabpanel-${tab}`).classList.add('active');
}

/* ============================================================
   MEMBERS PANEL
   ============================================================ */
function renderMembersPanel(members, projectId) {
  const rows = members.length ? members.map(m => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#9b8cff);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0">
            ${m.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600;color:var(--text-primary)">${escHtml(m.displayName)}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${escHtml(m.email || m.userId)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-role-${m.role}">${m.role}</span></td>
      <td>${formatDate(m.joinedAt)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="showEditMemberModal('${projectId}','${m.id}','${m.role}','${escHtml(m.displayName)}')">✎ Đổi vai trò</button>
          <button class="btn btn-danger btn-sm" onclick="confirmRemoveMember('${projectId}','${m.id}','${escHtml(m.displayName)}')">✕</button>
        </div>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Chưa có thành viên nào</div></div></td></tr>`;

  return `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title">Danh sách thành viên</div>
        <button class="btn btn-primary btn-sm" onclick="showAddMemberModal('${projectId}')">＋ Thêm thành viên</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Thành viên</th><th>Vai trò</th><th>Tham gia</th><th>Thao tác</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function showAddMemberModal(projectId) {
  openModal('Thêm thành viên', `
    <div class="form-group">
      <label class="form-label">User ID <span class="req">*</span></label>
      <input id="f-m-userid" class="form-input" placeholder="VD: user-002" />
    </div>
    <div class="form-group">
      <label class="form-label">Tên hiển thị <span class="req">*</span></label>
      <input id="f-m-name" class="form-input" placeholder="VD: Nguyễn Văn A" />
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input id="f-m-email" type="email" class="form-input" placeholder="email@example.com" />
    </div>
    <div class="form-group">
      <label class="form-label">Vai trò</label>
      <select id="f-m-role" class="form-select">
        <option value="Member">Member</option>
        <option value="Manager">Manager</option>
        <option value="Owner">Owner</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitAddMember('${projectId}')">＋ Thêm</button>
    </div>
  `);
}

async function submitAddMember(projectId) {
  const userId = document.getElementById('f-m-userid').value.trim();
  const displayName = document.getElementById('f-m-name').value.trim();
  const email = document.getElementById('f-m-email').value.trim();
  const role = document.getElementById('f-m-role').value;
  if (!userId || !displayName) { showToast('User ID và Tên là bắt buộc', 'error'); return; }
  const dto = { userId, displayName, email: email || null, role };
  const { ok, data } = await apiFetch(`/projects/${projectId}/members`, 'POST', dto);
  if (ok && data.success) {
    closeModal();
    showToast('✅ Đã thêm thành viên!', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Thêm thất bại', 'error');
  }
}

function showEditMemberModal(projectId, memberId, currentRole, name) {
  openModal(`Đổi vai trò – ${name}`, `
    <div class="form-group">
      <label class="form-label">Vai trò mới</label>
      <select id="f-m-newrole" class="form-select">
        <option value="Member" ${currentRole==='Member'?'selected':''}>Member</option>
        <option value="Manager" ${currentRole==='Manager'?'selected':''}>Manager</option>
        <option value="Owner" ${currentRole==='Owner'?'selected':''}>Owner</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitUpdateRole('${projectId}','${memberId}')">💾 Lưu</button>
    </div>
  `);
}

async function submitUpdateRole(projectId, memberId) {
  const role = document.getElementById('f-m-newrole').value;
  const { ok, data } = await apiFetch(`/projects/${projectId}/members/${memberId}`, 'PUT', { role });
  if (ok && data.success) {
    closeModal();
    showToast('✅ Đã cập nhật vai trò!', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Thất bại', 'error');
  }
}

function confirmRemoveMember(projectId, memberId, name) {
  openModal('Xóa thành viên', `
    <p style="color:var(--text-secondary);margin-bottom:20px;">
      Bạn có muốn xóa thành viên <strong style="color:var(--danger)">"${name}"</strong> khỏi dự án?
    </p>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-danger" onclick="removeMember('${projectId}','${memberId}')">✕ Xóa</button>
    </div>
  `);
}

async function removeMember(projectId, memberId) {
  const { ok, data } = await apiFetch(`/projects/${projectId}/members/${memberId}`, 'DELETE');
  if (ok && data.success) {
    closeModal();
    showToast('🗑 Đã xóa thành viên', 'info');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Xóa thất bại', 'error');
  }
}

/* ============================================================
   SPRINTS PANEL
   ============================================================ */
function renderSprintsPanel(sprints, projectId) {
  const rows = sprints.length ? sprints.map(s => {
    const actions = buildSprintActions(s, projectId);
    return `
      <tr>
        <td>${escHtml(s.name)}</td>
        <td style="color:var(--text-secondary);font-size:.82rem;max-width:200px">${escHtml(s.goal || '—')}</td>
        <td>${formatDate(s.startDate)} → ${formatDate(s.endDate)}</td>
        <td><span class="badge badge-${s.status}">${s.status}</span></td>
        <td><div class="sprint-actions">${actions}</div></td>
      </tr>`;
  }).join('') : `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🔄</div><div class="empty-text">Chưa có sprint nào</div></div></td></tr>`;

  return `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title">Danh sách Sprint</div>
        <button class="btn btn-primary btn-sm" onclick="showCreateSprintModal('${projectId}')">＋ Tạo Sprint</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Tên Sprint</th><th>Mục tiêu</th><th>Thời gian</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildSprintActions(s, projectId) {
  let html = `<button class="btn btn-secondary btn-sm" onclick="showEditSprintModal('${projectId}','${s.id}')">✎</button>`;
  if (s.status === 'Planning') {
    html += `<button class="btn btn-success btn-sm" onclick="startSprint('${projectId}','${s.id}')">▶ Bắt đầu</button>`;
  } else if (s.status === 'Active') {
    html += `<button class="btn btn-warning btn-sm" onclick="completeSprint('${projectId}','${s.id}')">✔ Hoàn thành</button>`;
  }
  return html;
}

function showCreateSprintModal(projectId) {
  const today = new Date().toISOString().split('T')[0];
  openModal('Tạo Sprint mới', `
    <div class="form-group">
      <label class="form-label">Tên Sprint <span class="req">*</span></label>
      <input id="f-sp-name" class="form-input" placeholder="VD: Sprint 1" />
    </div>
    <div class="form-group">
      <label class="form-label">Mục tiêu Sprint</label>
      <textarea id="f-sp-goal" class="form-textarea" placeholder="Mô tả mục tiêu của sprint này..."></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ngày bắt đầu</label>
        <input id="f-sp-start" type="date" class="form-input" value="${today}" />
      </div>
      <div class="form-group">
        <label class="form-label">Ngày kết thúc <small style="color:var(--text-muted)">(mặc định +14 ngày)</small></label>
        <input id="f-sp-end" type="date" class="form-input" />
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitCreateSprint('${projectId}')">✚ Tạo Sprint</button>
    </div>
  `);
}

async function submitCreateSprint(projectId) {
  const name  = document.getElementById('f-sp-name').value.trim();
  const goal  = document.getElementById('f-sp-goal').value.trim();
  const start = document.getElementById('f-sp-start').value;
  const end   = document.getElementById('f-sp-end').value;
  if (!name) { showToast('Tên sprint là bắt buộc', 'error'); return; }
  const dto = { name, goal: goal || null, startDate: start || null, endDate: end || null };
  const { ok, data } = await apiFetch(`/projects/${projectId}/sprints`, 'POST', dto);
  if (ok && data.success) {
    closeModal();
    showToast('✅ Đã tạo Sprint!', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Tạo thất bại', 'error');
  }
}

function showEditSprintModal(projectId, sprintId) {
  // Get sprint from current project cache
  const s = (currentProject?.sprints || []).find(x => x.id === sprintId);
  if (!s) { showToast('Không tìm thấy sprint', 'error'); return; }
  const toD = d => d ? d.split('T')[0] : '';
  openModal('Chỉnh sửa Sprint', `
    <div class="form-group">
      <label class="form-label">Tên Sprint <span class="req">*</span></label>
      <input id="f-sp-name" class="form-input" value="${escHtml(s.name)}" />
    </div>
    <div class="form-group">
      <label class="form-label">Mục tiêu Sprint</label>
      <textarea id="f-sp-goal" class="form-textarea">${escHtml(s.goal || '')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ngày bắt đầu</label>
        <input id="f-sp-start" type="date" class="form-input" value="${toD(s.startDate)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Ngày kết thúc</label>
        <input id="f-sp-end" type="date" class="form-input" value="${toD(s.endDate)}" />
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitEditSprint('${projectId}','${sprintId}')">💾 Lưu</button>
    </div>
  `);
}

async function submitEditSprint(projectId, sprintId) {
  const name  = document.getElementById('f-sp-name').value.trim();
  const goal  = document.getElementById('f-sp-goal').value.trim();
  const start = document.getElementById('f-sp-start').value;
  const end   = document.getElementById('f-sp-end').value;
  if (!name) { showToast('Tên sprint là bắt buộc', 'error'); return; }
  const dto = { name, goal: goal || null, startDate: start || null, endDate: end || null };
  const { ok, data } = await apiFetch(`/projects/${projectId}/sprints/${sprintId}`, 'PUT', dto);
  if (ok && data.success) {
    closeModal();
    showToast('✅ Đã cập nhật Sprint!', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Thất bại', 'error');
  }
}

async function startSprint(projectId, sprintId) {
  const { ok, data } = await apiFetch(`/projects/${projectId}/sprints/${sprintId}/start`, 'PUT');
  if (ok && data.success) {
    showToast('▶ Sprint đã bắt đầu!', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Thất bại', 'error');
  }
}

async function completeSprint(projectId, sprintId) {
  const { ok, data } = await apiFetch(`/projects/${projectId}/sprints/${sprintId}/complete`, 'PUT');
  if (ok && data.success) {
    showToast('✔ Sprint đã hoàn thành!', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Thất bại', 'error');
  }
}

/* ============================================================
   MILESTONES PANEL
   ============================================================ */
function renderMilestonesPanel(milestones, projectId) {
  const now = new Date();
  const items = milestones.length ? milestones.map(m => {
    const due = new Date(m.dueDate);
    const overdue = !m.isCompleted && due < now;
    return `
      <div class="milestone-item">
        <div class="milestone-check ${m.isCompleted ? 'done' : ''}"
             onclick="toggleMilestone('${projectId}','${m.id}',${m.isCompleted},'${escHtml(m.title)}','${m.dueDate.split('T')[0]}','${escHtml(m.description||'')}')">
          ${m.isCompleted ? '✓' : ''}
        </div>
        <div class="milestone-info">
          <div class="milestone-title ${m.isCompleted ? 'done' : ''}">${escHtml(m.title)}</div>
          <div class="milestone-due ${overdue ? 'milestone-overdue' : ''}">
            ${overdue ? '⚠ Quá hạn: ' : '📅 Hạn: '}${formatDate(m.dueDate)}
            ${m.description ? ` • ${escHtml(m.description)}` : ''}
          </div>
        </div>
        <div class="milestone-actions">
          <button class="btn btn-secondary btn-sm" onclick="showEditMilestoneModal('${projectId}','${m.id}')">✎</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMilestone('${projectId}','${m.id}')">🗑</button>
        </div>
      </div>`;
  }).join('') : `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-text">Chưa có milestone nào</div></div>`;

  return `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title">Danh sách Milestone</div>
        <button class="btn btn-primary btn-sm" onclick="showCreateMilestoneModal('${projectId}')">＋ Tạo Milestone</button>
      </div>
      ${items}
    </div>
  `;
}

function showCreateMilestoneModal(projectId) {
  openModal('Tạo Milestone mới', `
    <div class="form-group">
      <label class="form-label">Tiêu đề <span class="req">*</span></label>
      <input id="f-ml-title" class="form-input" placeholder="VD: Hoàn thành thiết kế UI" />
    </div>
    <div class="form-group">
      <label class="form-label">Mô tả</label>
      <textarea id="f-ml-desc" class="form-textarea" placeholder="Mô tả chi tiết milestone..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Ngày đến hạn <span class="req">*</span></label>
      <input id="f-ml-due" type="date" class="form-input" />
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitCreateMilestone('${projectId}')">✚ Tạo</button>
    </div>
  `);
}

async function submitCreateMilestone(projectId) {
  const title = document.getElementById('f-ml-title').value.trim();
  const desc  = document.getElementById('f-ml-desc').value.trim();
  const due   = document.getElementById('f-ml-due').value;
  if (!title) { showToast('Tiêu đề là bắt buộc', 'error'); return; }
  if (!due)   { showToast('Ngày đến hạn là bắt buộc', 'error'); return; }
  const dto = { title, description: desc || null, dueDate: due };
  const { ok, data } = await apiFetch(`/projects/${projectId}/milestones`, 'POST', dto);
  if (ok && data.success) {
    closeModal();
    showToast('✅ Đã tạo Milestone!', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Tạo thất bại', 'error');
  }
}

function showEditMilestoneModal(projectId, milestoneId) {
  const m = (currentProject?.milestones || []).find(x => x.id === milestoneId);
  if (!m) { showToast('Không tìm thấy milestone', 'error'); return; }
  openModal('Chỉnh sửa Milestone', `
    <div class="form-group">
      <label class="form-label">Tiêu đề <span class="req">*</span></label>
      <input id="f-ml-title" class="form-input" value="${escHtml(m.title)}" />
    </div>
    <div class="form-group">
      <label class="form-label">Mô tả</label>
      <textarea id="f-ml-desc" class="form-textarea">${escHtml(m.description || '')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ngày đến hạn <span class="req">*</span></label>
        <input id="f-ml-due" type="date" class="form-input" value="${m.dueDate.split('T')[0]}" />
      </div>
      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select id="f-ml-done" class="form-select">
          <option value="false" ${!m.isCompleted?'selected':''}>Đang thực hiện</option>
          <option value="true"  ${m.isCompleted?'selected':''}>Hoàn thành</option>
        </select>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitEditMilestone('${projectId}','${milestoneId}')">💾 Lưu</button>
    </div>
  `);
}

async function submitEditMilestone(projectId, milestoneId) {
  const title = document.getElementById('f-ml-title').value.trim();
  const desc  = document.getElementById('f-ml-desc').value.trim();
  const due   = document.getElementById('f-ml-due').value;
  const done  = document.getElementById('f-ml-done').value === 'true';
  if (!title) { showToast('Tiêu đề là bắt buộc', 'error'); return; }
  if (!due)   { showToast('Ngày đến hạn là bắt buộc', 'error'); return; }
  const dto = { title, description: desc || null, dueDate: due, isCompleted: done };
  const { ok, data } = await apiFetch(`/projects/${projectId}/milestones/${milestoneId}`, 'PUT', dto);
  if (ok && data.success) {
    closeModal();
    showToast('✅ Đã cập nhật Milestone!', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Thất bại', 'error');
  }
}

async function toggleMilestone(projectId, milestoneId, isCompleted, title, dueDate, description) {
  const dto = { title, description: description || null, dueDate, isCompleted: !isCompleted };
  const { ok, data } = await apiFetch(`/projects/${projectId}/milestones/${milestoneId}`, 'PUT', dto);
  if (ok && data.success) {
    showToast(!isCompleted ? '✔ Milestone hoàn thành!' : 'Đã đặt lại milestone', 'success');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Thất bại', 'error');
  }
}

async function deleteMilestone(projectId, milestoneId) {
  const { ok, data } = await apiFetch(`/projects/${projectId}/milestones/${milestoneId}`, 'DELETE');
  if (ok && data.success) {
    showToast('🗑 Đã xóa milestone', 'info');
    openProjectDetail(projectId);
  } else {
    showToast(data.message || 'Xóa thất bại', 'error');
  }
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

/* ============================================================
   TOAST HELPERS
   ============================================================ */
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ============================================================
   UTIL
   ============================================================ */
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function renderEmpty(text) {
  return `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📭</div><div class="empty-text">${text}</div></div>`;
}
