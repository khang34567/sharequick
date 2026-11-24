// Initialize Lucide Icons
if (window.lucide) lucide.createIcons();

const isAndroidApp = typeof window.AndroidBridge !== 'undefined';

// --- Toast Helper ---
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function formatVND(num) {
  return Math.round(num).toLocaleString('vi-VN') + ' đ';
}

// --- Receive Android Share Intent ---
window.onAndroidSharedText = function(text) {
  switchTab('share');
  const box = document.getElementById('shareTextInput');
  if (box) {
    box.value = text;
    showToast('Đã nhận link chia sẻ! Bấm "Gửi ngay" để đẩy sang PC.');
  }
};

// --- Theme Toggle ---
const savedTheme = localStorage.getItem('qh_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('qh_theme', next);
  showToast(next === 'dark' ? 'Đã bật chế độ Tối 🌙' : 'Đã bật chế độ Sáng ☀️');
}

document.getElementById('themeToggleDesktop').addEventListener('click', toggleTheme);
document.getElementById('themeToggleMobile').addEventListener('click', toggleTheme);

// --- Tab Navigation ---
function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');

  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
}

document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ==========================================
// 1. QUICK SHARE P2P (APP <-> WEB)
// ==========================================
let peer = null;
let activeConn = null;
let currentPeerId = null;

// Show Vercel URL input if running inside Android APK (file://)
if (isAndroidApp || window.location.protocol === 'file:') {
  document.getElementById('vercelConfigBox').classList.remove('hidden');
  const savedUrl = localStorage.getItem('qh_vercel_url') || '';
  document.getElementById('vercelUrlInput').value = savedUrl;

  document.getElementById('saveVercelUrlBtn').addEventListener('click', () => {
    const val = document.getElementById('vercelUrlInput').value.trim().replace(/\/+$/, '');
    localStorage.setItem('qh_vercel_url', val);
    if (currentPeerId) renderPeerQr(currentPeerId);
    showToast('Đã lưu link Vercel & cập nhật mã QR!');
  });
}

function renderPeerQr(id) {
  const qrContainer = document.getElementById('myPeerQr');
  qrContainer.innerHTML = '';
  let baseUrl = '';
  if (isAndroidApp || window.location.protocol === 'file:') {
    baseUrl = localStorage.getItem('qh_vercel_url') || '';
  } else {
    baseUrl = `${window.location.origin}${window.location.pathname}`;
  }
  const qrText = baseUrl ? `${baseUrl}?connect=${id}` : id;
  if (window.QRCode) {
    new QRCode(qrContainer, {
      text: qrText,
      width: 140,
      height: 140,
      colorDark: '#0f172a',
      colorLight: '#ffffff'
    });
  }
}

function generateShortId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return 'QH' + num;
}

function initPeer() {
  if (typeof Peer === 'undefined') {
    document.getElementById('peerStatusText').textContent = 'Cần mạng để nối P2P';
    return;
  }
  const myId = generateShortId();
  peer = new Peer(myId);

  peer.on('open', (id) => {
    currentPeerId = id;
    document.getElementById('myPeerId').textContent = id;
    document.getElementById('peerStatusBadge').classList.add('online');
    document.getElementById('peerStatusText').textContent = isAndroidApp ? 'App sẵn sàng' : 'Web sẵn sàng';

    renderPeerQr(id);

    const urlParams = new URLSearchParams(window.location.search);
    const autoTarget = urlParams.get('connect');
    if (autoTarget && autoTarget !== id) {
      document.getElementById('targetPeerInput').value = autoTarget;
      connectToPeer(autoTarget);
    }
  });

  peer.on('connection', (conn) => {
    setupConnection(conn);
    showToast('Thiết bị ' + conn.peer + ' đã kết nối!');
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      initPeer();
    } else {
      showToast('Lỗi kết nối: ' + err.type);
    }
  });
}

function connectToPeer(targetId) {
  if (!targetId) return showToast('Vui lòng nhập mã thiết bị!');
  const cleanId = targetId.trim().toUpperCase();
  const conn = peer.connect(cleanId);
  setupConnection(conn);
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function setupConnection(conn) {
  if (activeConn && activeConn.open) activeConn.close();
  activeConn = conn;

  conn.on('open', () => {
    document.getElementById('connectedBanner').classList.remove('hidden');
    document.getElementById('connectedPeerName').textContent = conn.peer;
    showToast('Đã kết nối P2P với ' + conn.peer);
  });

  conn.on('data', (data) => {
    if (data.type === 'text') {
      addFeedItem('Nhận từ ' + conn.peer, data.content, false);
      showToast('Bạn nhận được tin nhắn mới!');
    } else if (data.type === 'file') {
      const blob = new Blob([data.file], { type: data.mime });
      const url = URL.createObjectURL(blob);
      addFileFeedItem('File từ ' + conn.peer, data.name, url, data.file, data.mime);
      showToast('Đã nhận file: ' + data.name);
    }
  });

  conn.on('close', () => {
    document.getElementById('connectedBanner').classList.add('hidden');
    showToast('Đã ngắt kết nối P2P');
  });
}

function addFeedItem(label, text, isSelf) {
  const feed = document.getElementById('transferFeed');
  if (feed.querySelector('.empty-state')) feed.innerHTML = '';

  const el = document.createElement('div');
  el.className = 'feed-item';
  el.innerHTML = `
    <div>
      <div class="meta">${label} • ${new Date().toLocaleTimeString('vi-VN')}</div>
      <div class="body"></div>
    </div>
    <button class="btn-secondary" title="Sao chép">Copy</button>
  `;
  el.querySelector('.body').textContent = text;
  el.querySelector('button').addEventListener('click', () => {
    navigator.clipboard.writeText(text);
    showToast('Đã sao chép nội dung!');
  });
  feed.prepend(el);
}

function addFileFeedItem(label, fileName, url, rawBuffer, mime) {
  const feed = document.getElementById('transferFeed');
  if (feed.querySelector('.empty-state')) feed.innerHTML = '';

  const el = document.createElement('div');
  el.className = 'feed-item';

  if (isAndroidApp && rawBuffer) {
    el.innerHTML = `
      <div>
        <div class="meta">${label} • ${new Date().toLocaleTimeString('vi-VN')}</div>
        <div class="body">📎 ${fileName}</div>
      </div>
      <button class="btn-primary" style="padding:8px 12px;font-size:0.82rem;">Lưu về máy</button>
    `;
    el.querySelector('button').addEventListener('click', () => {
      const b64 = arrayBufferToBase64(rawBuffer);
      window.AndroidBridge.saveBase64File(b64, fileName, mime || 'application/octet-stream');
    });
  } else {
    el.innerHTML = `
      <div>
        <div class="meta">${label} • ${new Date().toLocaleTimeString('vi-VN')}</div>
        <div class="body">📎 ${fileName}</div>
      </div>
      <a class="btn-primary" href="${url}" download="${fileName}" style="text-decoration:none;padding:8px 12px;font-size:0.82rem;">Tải về</a>
    `;
  }
  feed.prepend(el);
}

document.getElementById('copyPeerIdBtn').addEventListener('click', () => {
  const id = document.getElementById('myPeerId').textContent;
  navigator.clipboard.writeText(id);
  showToast('Đã sao chép mã: ' + id);
});

document.getElementById('connectPeerBtn').addEventListener('click', () => {
  connectToPeer(document.getElementById('targetPeerInput').value);
});

document.getElementById('disconnectPeerBtn').addEventListener('click', () => {
  if (activeConn) activeConn.close();
});

document.getElementById('sendTextBtn').addEventListener('click', () => {
  const input = document.getElementById('shareTextInput');
  const text = input.value.trim();
  if (!text) return;
  if (!activeConn || !activeConn.open) {
    return showToast('Hãy kết nối với thiết bị khác trước!');
  }
  activeConn.send({ type: 'text', content: text });
  addFeedItem('Bạn đã gửi', text, true);
  input.value = '';
});

document.getElementById('shareFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!activeConn || !activeConn.open) {
    e.target.value = '';
    return showToast('Hãy kết nối với thiết bị khác trước!');
  }
  const reader = new FileReader();
  reader.onload = () => {
    activeConn.send({
      type: 'file',
      name: file.name,
      mime: file.type,
      file: reader.result
    });
    const url = URL.createObjectURL(file);
    addFileFeedItem('Bạn đã đẩy file', file.name, url, null, file.type);
    showToast('Đã đẩy file: ' + file.name);
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
});

document.getElementById('clearTransferBtn').addEventListener('click', () => {
  document.getElementById('transferFeed').innerHTML = '<div class="empty-state">Đã xóa lịch sử phiên.</div>';
});

initPeer();

// ==========================================
// 2. BILL SPLITTER + VIETQR
// ==========================================
let members = [];

['bankId', 'bankAccount', 'bankOwner'].forEach(id => {
  const el = document.getElementById(id);
  if (localStorage.getItem('qh_' + id)) el.value = localStorage.getItem('qh_' + id);
  el.addEventListener('input', () => localStorage.setItem('qh_' + id, el.value));
});

function renderMembers() {
  const list = document.getElementById('memberList');
  if (members.length === 0) {
    list.innerHTML = '<div class="empty-state">Chưa có ai trong danh sách.</div>';
    document.getElementById('billTotalDisplay').textContent = '0 đ';
    return;
  }
  list.innerHTML = '';
  let subTotal = 0;
  members.forEach((m, idx) => {
    subTotal += m.amount;
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span><strong>${m.name}</strong></span>
      <div class="flex-center gap-8">
        <span>${formatVND(m.amount)}</span>
        <button class="btn-danger-sm" onclick="removeMember(${idx})">Xóa</button>
      </div>
    `;
    list.appendChild(row);
  });
  const extra = Number(document.getElementById('extraFee').value) || 0;
  const discount = Number(document.getElementById('discountFee').value) || 0;
  const finalTotal = Math.max(0, subTotal + extra - discount);
  document.getElementById('billTotalDisplay').textContent = formatVND(finalTotal);
}

window.removeMember = function(idx) {
  members.splice(idx, 1);
  renderMembers();
};

document.getElementById('addMemberBtn').addEventListener('click', () => {
  const nameEl = document.getElementById('memberName');
  const amtEl = document.getElementById('memberAmount');
  const name = nameEl.value.trim();
  const amount = Number(amtEl.value);
  if (!name || amount <= 0) return showToast('Nhập tên và số tiền hợp lệ!');
  members.push({ name, amount });
  nameEl.value = '';
  amtEl.value = '';
  renderMembers();
});

['extraFee', 'discountFee'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderMembers);
});

document.getElementById('generateQrBtn').addEventListener('click', () => {
  if (members.length === 0) return showToast('Hãy thêm ít nhất 1 thành viên!');
  const bankId = document.getElementById('bankId').value;
  const acc = document.getElementById('bankAccount').value.trim();
  const owner = document.getElementById('bankOwner').value.trim();
  const title = document.getElementById('billTitle').value.trim() || 'Chia tien';

  if (!acc) return showToast('Hãy nhập số tài khoản nhận tiền!');

  const extra = Number(document.getElementById('extraFee').value) || 0;
  const discount = Number(document.getElementById('discountFee').value) || 0;
  const netDeltaPerPerson = (extra - discount) / members.length;

  const container = document.getElementById('qrResults');
  container.innerHTML = '';

  members.forEach(m => {
    const finalAmt = Math.max(0, Math.round(m.amount + netDeltaPerPerson));
    const addInfo = encodeURIComponent(`${title} - ${m.name}`);
    const accName = encodeURIComponent(owner);
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${acc}-compact2.png?amount=${finalAmt}&addInfo=${addInfo}&accountName=${accName}`;

    const card = document.createElement('div');
    card.className = 'qr-card';
    card.innerHTML = `
      <h4>${m.name}</h4>
      <div class="amount">${formatVND(finalAmt)}</div>
      <img src="${qrUrl}" alt="VietQR ${m.name}" loading="lazy" />
    `;
    container.appendChild(card);
  });
  showToast('Đã tạo mã VietQR cho ' + members.length + ' người!');
});

// ==========================================
// 3. QUICK NOTES & EXPENSE
// ==========================================
const noteArea = document.getElementById('quickNoteArea');
noteArea.value = localStorage.getItem('qh_quick_note') || '';

noteArea.addEventListener('input', () => {
  localStorage.setItem('qh_quick_note', noteArea.value);
  document.getElementById('noteSavedStatus').textContent = 'Đã lưu lúc ' + new Date().toLocaleTimeString('vi-VN');
});

document.getElementById('copyNoteBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(noteArea.value);
  showToast('Đã sao chép toàn bộ ghi chú!');
});

document.getElementById('clearNoteBtn').addEventListener('click', () => {
  noteArea.value = '';
  localStorage.removeItem('qh_quick_note');
  showToast('Đã xóa ghi chú!');
});

let expenses = JSON.parse(localStorage.getItem('qh_expenses') || '[]');

function renderExpenses() {
  const list = document.getElementById('expenseList');
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById('expenseTotal').textContent = formatVND(total);

  if (expenses.length === 0) {
    list.innerHTML = '<div class="empty-state">Chưa ghi nhận khoản chi nào.</div>';
    return;
  }
  list.innerHTML = '';
  expenses.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div>
        <strong>${item.desc}</strong>
        <div class="hint" style="font-size:0.74rem;">${item.time}</div>
      </div>
      <div class="flex-center gap-8">
        <span>${formatVND(item.amount)}</span>
        <button class="btn-danger-sm" onclick="removeExpense(${idx})">Xóa</button>
      </div>
    `;
    list.appendChild(row);
  });
}

window.removeExpense = function(idx) {
  expenses.splice(idx, 1);
  localStorage.setItem('qh_expenses', JSON.stringify(expenses));
  renderExpenses();
};

document.getElementById('addExpenseBtn').addEventListener('click', () => {
  const descEl = document.getElementById('expDesc');
  const amtEl = document.getElementById('expAmount');
  const desc = descEl.value.trim();
  const amount = Number(amtEl.value);
  if (!desc || amount <= 0) return showToast('Nhập nội dung và số tiền chi!');
  expenses.unshift({ desc, amount, time: new Date().toLocaleTimeString('vi-VN') });
  localStorage.setItem('qh_expenses', JSON.stringify(expenses));
  descEl.value = '';
  amtEl.value = '';
  renderExpenses();
});

document.getElementById('clearExpensesBtn').addEventListener('click', () => {
  expenses = [];
  localStorage.removeItem('qh_expenses');
  renderExpenses();
  showToast('Đã xóa lịch sử chi tiêu!');
});

renderExpenses();

// ==========================================
// 4. POMODORO & WIFI QR
// ==========================================
let pomoSeconds = 25 * 60;
let pomoInterval = null;
let pomoRunning = false;

function updatePomoDisplay() {
  const m = String(Math.floor(pomoSeconds / 60)).padStart(2, '0');
  const s = String(pomoSeconds % 60).padStart(2, '0');
  document.getElementById('pomoDisplay').textContent = `${m}:${s}`;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

document.querySelectorAll('.pomo-modes .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    clearInterval(pomoInterval);
    pomoRunning = false;
    document.getElementById('pomoStartBtn').innerHTML = '<i data-lucide="play"></i><span>Bắt đầu</span>';
    if (window.lucide) lucide.createIcons();
    document.querySelectorAll('.pomo-modes .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    pomoSeconds = Number(chip.dataset.mins) * 60;
    updatePomoDisplay();
  });
});

document.getElementById('pomoStartBtn').addEventListener('click', () => {
  const btn = document.getElementById('pomoStartBtn');
  if (pomoRunning) {
    clearInterval(pomoInterval);
    pomoRunning = false;
    btn.innerHTML = '<i data-lucide="play"></i><span>Tiếp tục</span>';
  } else {
    pomoRunning = true;
    btn.innerHTML = '<i data-lucide="pause"></i><span>Tạm dừng</span>';
    pomoInterval = setInterval(() => {
      if (pomoSeconds > 0) {
        pomoSeconds--;
        updatePomoDisplay();
      } else {
        clearInterval(pomoInterval);
        pomoRunning = false;
        playBeep();
        showToast('Hết giờ rồi! Nghỉ ngơi một chút nhé 🎉');
        btn.innerHTML = '<i data-lucide="play"></i><span>Bắt đầu</span>';
        if (window.lucide) lucide.createIcons();
      }
    }, 1000);
  }
  if (window.lucide) lucide.createIcons();
});

document.getElementById('pomoResetBtn').addEventListener('click', () => {
  clearInterval(pomoInterval);
  pomoRunning = false;
  const activeChip = document.querySelector('.pomo-modes .chip.active');
  pomoSeconds = Number(activeChip.dataset.mins) * 60;
  updatePomoDisplay();
  document.getElementById('pomoStartBtn').innerHTML = '<i data-lucide="play"></i><span>Bắt đầu</span>';
  if (window.lucide) lucide.createIcons();
});

document.getElementById('genWifiQrBtn').addEventListener('click', () => {
  const ssid = document.getElementById('wifiSsid').value.trim();
  const pass = document.getElementById('wifiPass').value;
  if (!ssid) return showToast('Vui lòng nhập tên mạng Wi-Fi!');
  const wifiString = `WIFI:T:WPA;S:${ssid};P:${pass};;`;
  const out = document.getElementById('wifiQrOutput');
  out.innerHTML = '';
  if (window.QRCode) {
    new QRCode(out, {
      text: wifiString,
      width: 170,
      height: 170,
      colorDark: '#0f172a',
      colorLight: '#ffffff'
    });
  }
  showToast('Đã tạo mã QR Wi-Fi! Quét là vào mạng ngay.');
});
