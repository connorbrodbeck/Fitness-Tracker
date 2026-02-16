// Admin Dashboard Logic

let allUsers = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  if (!api.isLoggedIn()) {
    window.location.href = '/';
    return;
  }

  try {
    await loadAdminData();
  } catch (err) {
    if (err.message === 'Unauthorized' || err.message === 'Admin access required') {
      alert('You do not have admin access.');
      window.location.href = '/';
    } else {
      console.error('Failed to load admin data:', err);
    }
  }
});

// Load all admin data
async function loadAdminData() {
  const [users, activity] = await Promise.all([
    api.get('/admin/users'),
    api.get('/admin/activity')
  ]);

  allUsers = users;
  updateStats();
  renderUsers();
  renderActivity(activity);
}

// Update quick stats
function updateStats() {
  document.getElementById('total-users').textContent = allUsers.length;

  const today = new Date().toISOString().split('T')[0];
  const activeToday = allUsers.filter(u => {
    if (!u.lastActive) return false;
    return new Date(u.lastActive).toISOString().split('T')[0] === today;
  }).length;
  document.getElementById('active-today').textContent = activeToday;

  // Active this week (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const activeWeek = allUsers.filter(u => {
    if (!u.lastActive) return false;
    return new Date(u.lastActive) >= weekAgo;
  }).length;
  document.getElementById('active-week').textContent = activeWeek;

  // Average goal weight
  if (allUsers.length > 0) {
    const avgGoal = allUsers.reduce((sum, u) => sum + u.goalWeight, 0) / allUsers.length;
    document.getElementById('avg-goal').textContent = avgGoal.toFixed(0) + ' lbs';
  } else {
    document.getElementById('avg-goal').textContent = '-';
  }
}

// Render user cards
function renderUsers() {
  const grid = document.getElementById('users-grid');
  grid.innerHTML = '';

  if (allUsers.length === 0) {
    grid.innerHTML = '<div class="empty-state">No users found</div>';
    return;
  }

  allUsers.forEach(user => {
    const card = document.createElement('div');
    card.className = 'user-card' + (user.isAdmin ? ' is-admin' : '');
    card.onclick = () => viewUserDetail(user.id);

    const lastActiveStr = user.lastActive
      ? new Date(user.lastActive).toLocaleDateString()
      : 'Never';

    const signupStr = new Date(user.signupDate).toLocaleDateString();

    // Determine activity badge
    let activityBadge = '';
    if (user.lastActive) {
      const daysSinceActive = Math.floor((Date.now() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24));
      if (daysSinceActive <= 1) {
        activityBadge = '<span class="badge badge-active">Active</span>';
      } else if (daysSinceActive > 3) {
        activityBadge = '<span class="badge badge-inactive">Inactive</span>';
      }
    }

    card.innerHTML = `
      <div class="user-card-header">
        <h3>${escapeHtml(user.username)}</h3>
        <div>
          ${user.isAdmin ? '<span class="badge badge-admin">Admin</span>' : ''}
          ${activityBadge}
        </div>
      </div>
      <div class="user-card-stats">
        <div><strong>Current:</strong> ${user.currentWeight} lbs</div>
        <div><strong>Goal:</strong> ${user.goalWeight} lbs</div>
        <div><strong>Best Streak:</strong> ${user.bestStreak} days</div>
        <div><strong>Calories:</strong> ${user.calorieGoal}/day</div>
        <div><strong>Joined:</strong> ${signupStr}</div>
        <div><strong>Last Active:</strong> ${lastActiveStr}</div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Render activity feed
function renderActivity(activities) {
  const feed = document.getElementById('activity-feed');
  feed.innerHTML = '';

  if (!activities || activities.length === 0) {
    feed.innerHTML = '<div class="empty-state">No recent activity</div>';
    return;
  }

  activities.forEach(act => {
    const item = document.createElement('div');
    item.className = 'feed-item type-' + act.type;

    const date = new Date(act.date).toLocaleDateString();
    const time = act.timestamp || '';

    let content = '';
    if (act.type === 'meal') {
      content = `<span class="feed-user">${escapeHtml(act.username)}</span> logged meal: ${escapeHtml(act.description)} (${act.calories} cal)`;
    } else if (act.type === 'gym') {
      content = `<span class="feed-user">${escapeHtml(act.username)}</span> completed gym session`;
      if (act.prs) content += ` &mdash; PR: ${escapeHtml(act.prs)}`;
    } else if (act.type === 'run') {
      content = `<span class="feed-user">${escapeHtml(act.username)}</span> ran ${escapeHtml(act.description)}`;
      if (act.pace) content += ` at ${escapeHtml(act.pace)}`;
    }

    item.innerHTML = `
      <div>${content}</div>
      <div class="feed-time">${date} ${escapeHtml(time)}</div>
    `;

    feed.appendChild(item);
  });
}

// View full user detail
async function viewUserDetail(userId) {
  try {
    const data = await api.get('/admin/users/' + userId);
    showUserDetailModal(data);
  } catch (err) {
    alert('Failed to load user details: ' + err.message);
  }
}

// Render user detail modal
function showUserDetailModal(data) {
  const content = document.getElementById('user-detail-content');
  const p = data.profile;

  // Build weight mini chart
  let weightChartHTML = '<div class="empty-state">No weight history</div>';
  if (data.weightHistory.length > 0) {
    const weights = data.weightHistory.slice(0, 12).reverse();
    const maxW = Math.max(...weights.map(w => parseFloat(w.weight)));
    const minW = Math.min(...weights.map(w => parseFloat(w.weight)));
    const range = maxW - minW || 1;

    weightChartHTML = '<div class="weight-chart-mini">';
    weights.forEach(w => {
      const pct = ((parseFloat(w.weight) - minW) / range) * 80 + 20; // min 20% height
      const dateStr = new Date(w.weigh_date).toLocaleDateString();
      weightChartHTML += `<div class="weight-bar-mini" style="height: ${pct}%;" data-label="${w.weight} lbs — ${dateStr}"></div>`;
    });
    weightChartHTML += '</div>';
  }

  // Build meals list
  let mealsHTML = '<div class="empty-state">No meals logged</div>';
  if (data.recentMeals.length > 0) {
    mealsHTML = data.recentMeals.slice(0, 15).map(m => `
      <div class="detail-item">
        <strong>${escapeHtml(m.name)}</strong> &mdash; ${m.calories} cal
        <span style="color: #999; font-size: 0.85em; margin-left: 10px;">${new Date(m.log_date).toLocaleDateString()}</span>
      </div>
    `).join('');
  }

  // Build gym sessions list
  let gymHTML = '<div class="empty-state">No gym sessions logged</div>';
  if (data.recentGymSessions.length > 0) {
    gymHTML = data.recentGymSessions.slice(0, 10).map(g => `
      <div class="detail-item">
        <strong>${new Date(g.log_date).toLocaleDateString()}</strong>
        <pre>${escapeHtml(g.exercises)}</pre>
        ${g.prs ? `<div style="color: #f5576c; font-weight: 600;">PR: ${escapeHtml(g.prs)}</div>` : ''}
      </div>
    `).join('');
  }

  // Build runs list
  let runsHTML = '<div class="empty-state">No runs logged</div>';
  if (data.recentRuns.length > 0) {
    runsHTML = data.recentRuns.slice(0, 10).map(r => `
      <div class="detail-item">
        <strong>${new Date(r.log_date).toLocaleDateString()}</strong> &mdash;
        ${r.distance} miles
        ${r.pace ? ' @ ' + escapeHtml(r.pace) : ''}
        ${r.duration ? ' (' + r.duration + ' min)' : ''}
      </div>
    `).join('');
  }

  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 5px;">
      <h2 style="margin: 0;">${escapeHtml(p.username)}</h2>
      ${p.isAdmin ? '<span class="badge badge-admin">Admin</span>' : ''}
    </div>

    <div class="detail-section">
      <h3>Profile</h3>
      <p><strong>User ID:</strong> ${p.id}</p>
      <p><strong>Signed Up:</strong> ${new Date(p.signupDate).toLocaleDateString()}</p>
      <p><strong>Start Weight:</strong> ${p.startWeight} lbs</p>
      <p><strong>Current Weight:</strong> ${p.currentWeight} lbs</p>
      <p><strong>Goal Weight:</strong> ${p.goalWeight} lbs</p>
      <p><strong>Calorie Goal:</strong> ${p.calorieGoal} cal/day</p>
      <p><strong>Best Streak:</strong> ${p.bestStreak} days</p>
    </div>

    <div class="detail-section">
      <h3>Weight History</h3>
      ${weightChartHTML}
    </div>

    <div class="detail-section">
      <h3>Recent Meals</h3>
      ${mealsHTML}
    </div>

    <div class="detail-section">
      <h3>Gym Sessions</h3>
      ${gymHTML}
    </div>

    <div class="detail-section">
      <h3>Runs</h3>
      ${runsHTML}
    </div>

    <div class="action-buttons">
      <button onclick="openEditUserModal(${p.id})">Edit User</button>
      <button class="btn-secondary" onclick="closeModal('user-detail-modal')">Close</button>
    </div>
  `;

  document.getElementById('user-detail-modal').style.display = 'block';
}

// Open edit user modal
function openEditUserModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('edit-user-id').value = userId;
  document.getElementById('edit-password').value = '';
  document.getElementById('edit-calorie-goal').value = user.calorieGoal || '';
  document.getElementById('edit-goal-weight').value = user.goalWeight || '';
  document.getElementById('edit-is-admin').checked = user.isAdmin;

  closeModal('user-detail-modal');
  document.getElementById('edit-user-modal').style.display = 'block';
}

// Save user edits
async function saveUserEdits(e) {
  e.preventDefault();

  const userId = document.getElementById('edit-user-id').value;
  const password = document.getElementById('edit-password').value;
  const calorieGoal = document.getElementById('edit-calorie-goal').value;
  const goalWeight = document.getElementById('edit-goal-weight').value;
  const isAdmin = document.getElementById('edit-is-admin').checked;

  const updates = { isAdmin };
  if (password) updates.password = password;
  if (calorieGoal) updates.calorieGoal = parseInt(calorieGoal);
  if (goalWeight) updates.goalWeight = parseFloat(goalWeight);

  try {
    await api.put('/admin/users/' + userId, updates);
    alert('User updated successfully.');
    closeModal('edit-user-modal');
    await loadAdminData();
  } catch (err) {
    alert('Failed to update user: ' + err.message);
  }
}

// Delete user
async function deleteUser() {
  const userId = document.getElementById('edit-user-id').value;
  const user = allUsers.find(u => u.id === parseInt(userId));

  if (!user) return;

  if (!confirm('Are you sure you want to delete "' + user.username + '"? This will permanently remove all their data.')) {
    return;
  }

  try {
    await api.delete('/admin/users/' + userId);
    alert('User deleted successfully.');
    closeModal('edit-user-modal');
    await loadAdminData();
  } catch (err) {
    alert('Failed to delete user: ' + err.message);
  }
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function (event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
};

// Logout
function handleLogout() {
  api.clearToken();
  window.location.href = '/';
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
