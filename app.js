/**
 * WebRTC P2P Voice, Screen, Text Chat, Network Stats & Custom Profile
 * Discord-like zero-server-cost ultra-low latency audio, screen sharing, text room,
 * with real-time latency (ping), bandwidth tracking, and full user profile customization.
 */

// Color Palette & Emoji Presets
const COLOR_PALETTE = [
  '#5865F2', // Discord Blurple
  '#23A55A', // Emerald Green
  '#F47B67', // Coral Pink
  '#DA373C', // Ruby Red
  '#F0B232', // Sunflower Amber
  '#00B0F4', // Cyan Sky
  '#9B59B6', // Amethyst Purple
  '#EB459E', // Fuchsia Pink
  '#E67E22', // Orange
  '#1ABC9C', // Turquoise Teal
  '#34495E'  // Midnight Slate
];

// Determine initial random avatar color if first visit
let initialColor = localStorage.getItem('vchat_color');
if (!initialColor) {
  initialColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  localStorage.setItem('vchat_color', initialColor);
}

// Application State
const state = {
  username: localStorage.getItem('vchat_username') || '',
  avatarColor: initialColor,
  avatarImage: localStorage.getItem('vchat_avatar_img') || '',
  userStatus: localStorage.getItem('vchat_status') || 'Çevrimiçi',
  roomName: '',
  hostPeerId: null,
  peer: null,
  myPeerId: null,
  isHost: false,
  localStream: null,
  isMuted: false,
  isDeafened: false,
  selectedMicId: '',
  bitrate: 128000, // 128 kbps Opus
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  // Screen Sharing
  screenStream: null,
  isSharingScreen: false,
  screenCalls: new Map(), // peerId => call
  activeScreenSharer: null,
  // Text Chat
  isChatOpen: true,
  unreadChatCount: 0,
  seenMsgIds: new Set(),
  // Network Stats & Data Usage
  statsTimer: null,
  pingTimer: null,
  lastStatsTimestamp: Date.now(),
  prevTotalBytesReceived: 0,
  prevTotalBytesSent: 0,
  totalBytesReceived: 0,
  totalBytesSent: 0,
  downSpeed: 0,
  upSpeed: 0,
  avgPing: null,
  // Map of connected peers: peerId => { name, color, icon, status, call, dataConn, gainNode, analyser, cardEl, audioEl, currentPing, bytesReceived, bytesSent, lastDataChannelRtt }
  peers: new Map(),
  audioCtx: null,
  localAnalyser: null,
  testAudioCtx: null,
  testAnalyser: null,
  testStream: null
};

// DOM Elements
const dom = {
  lobbyScreen: document.getElementById('lobbyScreen'),
  roomScreen: document.getElementById('roomScreen'),
  joinForm: document.getElementById('joinForm'),
  usernameInput: document.getElementById('usernameInput'),
  statusInput: document.getElementById('statusInput'),
  roomInput: document.getElementById('roomInput'),
  btnRandomRoom: document.getElementById('btnRandomRoom'),
  btnTestMic: document.getElementById('btnTestMic'),
  micTestStatus: document.getElementById('micTestStatus'),
  micMeterFill: document.getElementById('micMeterFill'),

  // Lobby Profile Customizer
  lobbyAvatarPreview: document.getElementById('lobbyAvatarPreview'),
  lobbyAvatarTrigger: document.getElementById('lobbyAvatarTrigger'),
  lobbyAvatarFile: document.getElementById('lobbyAvatarFile'),
  btnLobbyUploadImage: document.getElementById('btnLobbyUploadImage'),
  btnLobbyRemoveImage: document.getElementById('btnLobbyRemoveImage'),
  lobbyNamePreview: document.getElementById('lobbyNamePreview'),
  lobbyStatusPreview: document.getElementById('lobbyStatusPreview'),
  lobbyColorPalette: document.getElementById('lobbyColorPalette'),
  
  displayRoomName: document.getElementById('displayRoomName'),
  connectionStateText: document.getElementById('connectionStateText'),
  btnCopyInvite: document.getElementById('btnCopyInvite'),
  participantCount: document.getElementById('participantCount'),
  peersGrid: document.getElementById('peersGrid'),

  // Network Stats Elements
  btnOpenNetStats: document.getElementById('btnOpenNetStats'),
  btnToggleNetStats: document.getElementById('btnToggleNetStats'),
  btnCloseNetStats: document.getElementById('btnCloseNetStats'),
  netStatsModal: document.getElementById('netStatsModal'),
  headerPingVal: document.getElementById('headerPingVal'),
  headerDownVal: document.getElementById('headerDownVal'),
  headerUpVal: document.getElementById('headerUpVal'),
  localCardTraffic: document.getElementById('localCardTraffic'),
  modalStatPing: document.getElementById('modalStatPing'),
  modalStatSpeed: document.getElementById('modalStatSpeed'),
  modalStatDown: document.getElementById('modalStatDown'),
  modalStatUp: document.getElementById('modalStatUp'),
  peerStatsList: document.getElementById('peerStatsList'),

  // Profile Modal Elements
  btnOpenProfile: document.getElementById('btnOpenProfile'),
  profileModal: document.getElementById('profileModal'),
  btnCloseProfile: document.getElementById('btnCloseProfile'),
  btnSaveProfile: document.getElementById('btnSaveProfile'),
  modalAvatarPreview: document.getElementById('modalAvatarPreview'),
  modalAvatarTrigger: document.getElementById('modalAvatarTrigger'),
  modalAvatarFile: document.getElementById('modalAvatarFile'),
  btnModalUploadImage: document.getElementById('btnModalUploadImage'),
  btnModalRemoveImage: document.getElementById('btnModalRemoveImage'),
  modalNamePreview: document.getElementById('modalNamePreview'),
  modalStatusPreview: document.getElementById('modalStatusPreview'),
  modalUsernameInput: document.getElementById('modalUsernameInput'),
  modalStatusInput: document.getElementById('modalStatusInput'),
  modalColorPalette: document.getElementById('modalColorPalette'),

  // Screen Share Elements
  screenShareStage: document.getElementById('screenShareStage'),
  screenSharerName: document.getElementById('screenSharerName'),
  sharedScreenVideo: document.getElementById('sharedScreenVideo'),
  btnFullscreenScreen: document.getElementById('btnFullscreenScreen'),
  btnCloseScreenView: document.getElementById('btnCloseScreenView'),
  btnToggleScreen: document.getElementById('btnToggleScreen'),
  iconScreenOn: document.getElementById('iconScreenOn'),
  iconScreenOff: document.getElementById('iconScreenOff'),

  // Text Chat Elements
  btnToggleChat: document.getElementById('btnToggleChat'),
  btnCloseChat: document.getElementById('btnCloseChat'),
  chatSidebar: document.getElementById('chatSidebar'),
  chatBadge: document.getElementById('chatBadge'),
  chatMessages: document.getElementById('chatMessages'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  
  localUserCard: document.getElementById('localUserCard'),
  localAvatar: document.getElementById('localAvatar'),
  localUserName: document.getElementById('localUserName'),
  localUserStatus: document.getElementById('localUserStatus'),
  localMuteBadge: document.getElementById('localMuteBadge'),
  
  barAvatar: document.getElementById('barAvatar'),
  barUsername: document.getElementById('barUsername'),
  barStatusText: document.getElementById('barStatusText'),
  btnToggleMic: document.getElementById('btnToggleMic'),
  btnToggleDeafen: document.getElementById('btnToggleDeafen'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnLeaveRoom: document.getElementById('btnLeaveRoom'),
  
  iconMicOn: document.getElementById('iconMicOn'),
  iconMicOff: document.getElementById('iconMicOff'),
  iconAudioOn: document.getElementById('iconAudioOn'),
  iconAudioOff: document.getElementById('iconAudioOff'),
  
  settingsModal: document.getElementById('settingsModal'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  selectMic: document.getElementById('selectMic'),
  selectBitrate: document.getElementById('selectBitrate'),
  chkEcho: document.getElementById('chkEcho'),
  chkNoise: document.getElementById('chkNoise'),
  chkGain: document.getElementById('chkGain'),
  
  toast: document.getElementById('toastNotification')
};

// ==========================================
// Initialization & URL Params
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  if (state.username) {
    dom.usernameInput.value = state.username;
  } else {
    dom.usernameInput.value = 'Kullanıcı_' + Math.floor(1000 + Math.random() * 9000);
    state.username = dom.usernameInput.value;
  }

  if (state.userStatus && dom.statusInput) {
    dom.statusInput.value = state.userStatus;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const paramRoom = urlParams.get('room');
  const paramHost = urlParams.get('host');
  const paramName = urlParams.get('name');

  if (paramRoom) {
    dom.roomInput.value = paramRoom;
  } else {
    dom.roomInput.value = 'sohbet-' + Math.floor(100 + Math.random() * 900);
  }

  if (paramHost) {
    state.hostPeerId = paramHost;
  }

  if (paramName) {
    dom.usernameInput.value = paramName;
    state.username = paramName;
  }

  // Setup Profile Pickers & Previews
  renderProfileControls();
  updateProfilePreviews();

  setupEventListeners();
  loadAudioDevices();
});

// ==========================================
// Profile Customizer (Colors & Image Upload)
// ==========================================
function renderProfileControls() {
  // Render Lobby Palette
  renderPaletteInto(dom.lobbyColorPalette, (color) => {
    state.avatarColor = color;
    localStorage.setItem('vchat_color', color);
    updateProfilePreviews();
    broadcastProfileUpdate();
  });

  // Render Modal Palette
  renderPaletteInto(dom.modalColorPalette, (color) => {
    state.avatarColor = color;
    localStorage.setItem('vchat_color', color);
    updateProfilePreviews();
  });

  // Lobby Image Upload Events
  if (dom.lobbyAvatarTrigger) {
    dom.lobbyAvatarTrigger.addEventListener('click', () => dom.lobbyAvatarFile && dom.lobbyAvatarFile.click());
  }
  if (dom.btnLobbyUploadImage) {
    dom.btnLobbyUploadImage.addEventListener('click', () => dom.lobbyAvatarFile && dom.lobbyAvatarFile.click());
  }
  if (dom.lobbyAvatarFile) {
    dom.lobbyAvatarFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleAvatarFileUpload(e.target.files[0]);
        dom.lobbyAvatarFile.value = '';
      }
    });
  }
  if (dom.btnLobbyRemoveImage) {
    dom.btnLobbyRemoveImage.addEventListener('click', removeAvatarImage);
  }

  // Modal Image Upload Events
  if (dom.modalAvatarTrigger) {
    dom.modalAvatarTrigger.addEventListener('click', () => dom.modalAvatarFile && dom.modalAvatarFile.click());
  }
  if (dom.btnModalUploadImage) {
    dom.btnModalUploadImage.addEventListener('click', () => dom.modalAvatarFile && dom.modalAvatarFile.click());
  }
  if (dom.modalAvatarFile) {
    dom.modalAvatarFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleAvatarFileUpload(e.target.files[0]);
        dom.modalAvatarFile.value = '';
      }
    });
  }
  if (dom.btnModalRemoveImage) {
    dom.btnModalRemoveImage.addEventListener('click', removeAvatarImage);
  }
}

function renderPaletteInto(container, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  COLOR_PALETTE.forEach((col) => {
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (state.avatarColor === col ? ' selected' : '');
    dot.style.backgroundColor = col;
    dot.title = col;
    dot.addEventListener('click', () => {
      container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      onSelect(col);
    });
    container.appendChild(dot);
  });
}

function applyAvatarToElement(el, image, color, text) {
  if (!el) return;
  if (image) {
    el.style.backgroundImage = `url("${image}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundColor = color || 'transparent';
    el.textContent = '';
  } else {
    el.style.backgroundImage = 'none';
    el.style.backgroundColor = color || '#5865F2';
    el.textContent = text || 'A';
  }
}

function handleAvatarFileUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WebP).');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    showToast('⚠️ Resim boyutu 15MB\'dan küçük olmalıdır.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Create offscreen canvas for square cropping and optimized compression
      const canvas = document.createElement('canvas');
      const size = 160; // 160x160 px is optimal for P2P speed and crisp rendering
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      state.avatarImage = dataUrl;
      try {
        localStorage.setItem('vchat_avatar_img', dataUrl);
      } catch (err) {
        console.warn('LocalStorage quota limit:', err);
      }

      updateProfilePreviews();
      broadcastProfileUpdate();
      showToast('🖼️ Profil resminiz başarıyla yüklendi!');
    };
    img.onerror = () => {
      showToast('⚠️ Resim yüklenirken bir hata oluştu.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeAvatarImage() {
  state.avatarImage = '';
  localStorage.removeItem('vchat_avatar_img');
  updateProfilePreviews();
  broadcastProfileUpdate();
  showToast('🗑️ Profil resmi kaldırıldı.');
}

function broadcastProfileUpdate() {
  if (!state.myPeerId) return;
  broadcastMessage({
    type: 'profile-update',
    peerId: state.myPeerId,
    username: state.username,
    color: state.avatarColor,
    image: state.avatarImage,
    status: state.userStatus
  });
}

function updateProfilePreviews() {
  const initial = (state.username || 'A').charAt(0).toUpperCase();

  // Lobby Preview
  applyAvatarToElement(dom.lobbyAvatarPreview, state.avatarImage, state.avatarColor, initial);
  if (dom.lobbyNamePreview) {
    dom.lobbyNamePreview.textContent = state.username || 'Kullanıcı';
  }
  if (dom.lobbyStatusPreview) {
    dom.lobbyStatusPreview.textContent = state.userStatus || 'Çevrimiçi';
  }
  if (dom.btnLobbyRemoveImage) {
    dom.btnLobbyRemoveImage.classList.toggle('hidden', !state.avatarImage);
  }

  // Modal Preview
  applyAvatarToElement(dom.modalAvatarPreview, state.avatarImage, state.avatarColor, initial);
  if (dom.modalNamePreview) {
    dom.modalNamePreview.textContent = state.username || 'Kullanıcı';
  }
  if (dom.modalStatusPreview) {
    dom.modalStatusPreview.textContent = state.userStatus || 'Çevrimiçi';
  }
  if (dom.btnModalRemoveImage) {
    dom.btnModalRemoveImage.classList.toggle('hidden', !state.avatarImage);
  }

  // Local Card & Controls Bar (in-room)
  applyAvatarToElement(dom.localAvatar, state.avatarImage, state.avatarColor, initial);
  if (dom.localUserName) dom.localUserName.textContent = state.username;
  if (dom.localUserStatus) dom.localUserStatus.textContent = state.userStatus;

  applyAvatarToElement(dom.barAvatar, state.avatarImage, state.avatarColor, initial);
  if (dom.barUsername) dom.barUsername.textContent = state.username;
  if (dom.barStatusText) dom.barStatusText.textContent = state.userStatus;
}

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
  // Live input sync in lobby
  dom.usernameInput.addEventListener('input', () => {
    state.username = dom.usernameInput.value.trim() || 'Misafir';
    updateProfilePreviews();
  });

  dom.statusInput.addEventListener('input', () => {
    state.userStatus = dom.statusInput.value.trim() || 'Çevrimiçi';
    updateProfilePreviews();
  });

  dom.btnRandomRoom.addEventListener('click', () => {
    const adjectives = ['hizli', 'guclu', 'mavi', 'serin', 'parlak', 'atesli', 'sakin'];
    const nouns = ['aslan', 'kartal', 'sohbet', 'ekip', 'oda', 'kurt', 'tayfa'];
    const rndAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const rndNoun = nouns[Math.floor(Math.random() * nouns.length)];
    dom.roomInput.value = `${rndAdj}-${rndNoun}-${Math.floor(10 + Math.random() * 90)}`;
  });

  dom.btnTestMic.addEventListener('click', toggleMicTest);

  dom.joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    stopMicTest();
    const username = dom.usernameInput.value.trim() || 'Misafir';
    const status = dom.statusInput.value.trim() || 'Çevrimiçi';
    const room = dom.roomInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    if (!room) {
      showToast('Lütfen geçerli bir oda adı girin!');
      return;
    }

    state.username = username;
    state.userStatus = status;
    state.roomName = room;
    localStorage.setItem('vchat_username', username);
    localStorage.setItem('vchat_status', status);

    await joinVoiceRoom();
  });

  // Media controls
  dom.btnToggleMic.addEventListener('click', toggleMute);
  dom.btnToggleDeafen.addEventListener('click', toggleDeafen);
  dom.btnToggleScreen.addEventListener('click', toggleScreenShare);
  dom.btnLeaveRoom.addEventListener('click', leaveRoom);

  // Screen Stage actions
  dom.btnFullscreenScreen.addEventListener('click', toggleFullscreenScreen);
  dom.btnCloseScreenView.addEventListener('click', hideScreenStage);

  // Text Chat actions
  dom.btnToggleChat.addEventListener('click', toggleChat);
  dom.btnCloseChat.addEventListener('click', closeChat);
  dom.chatForm.addEventListener('submit', sendChatMessage);

  // Network Stats actions
  if (dom.btnOpenNetStats) dom.btnOpenNetStats.addEventListener('click', openNetStatsModal);
  if (dom.btnToggleNetStats) dom.btnToggleNetStats.addEventListener('click', openNetStatsModal);
  if (dom.btnCloseNetStats) dom.btnCloseNetStats.addEventListener('click', closeNetStatsModal);

  // Profile Modal actions
  if (dom.btnOpenProfile) dom.btnOpenProfile.addEventListener('click', openProfileModal);
  if (dom.btnCloseProfile) dom.btnCloseProfile.addEventListener('click', closeProfileModal);
  if (dom.btnSaveProfile) dom.btnSaveProfile.addEventListener('click', saveProfileModal);

  // Settings actions
  dom.btnOpenSettings.addEventListener('click', openSettings);
  dom.btnCloseSettings.addEventListener('click', closeSettings);
  dom.btnSaveSettings.addEventListener('click', saveSettings);

  // Copy invite link
  dom.btnCopyInvite.addEventListener('click', copyInviteLink);

  // Keyboard Shortcuts (M: Mute, D: Deafen, E: Screen, C: Chat)
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.key.toLowerCase() === 'm') {
      toggleMute();
    } else if (e.key.toLowerCase() === 'd') {
      toggleDeafen();
    } else if (e.key.toLowerCase() === 'e') {
      toggleScreenShare();
    } else if (e.key.toLowerCase() === 'c') {
      toggleChat();
    }
  });

  window.addEventListener('beforeunload', () => {
    cleanupCall();
  });
}

// ==========================================
// Toast Notification
// ==========================================
let toastTimer = null;
function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.classList.add('hidden');
  }, 3000);
}

// ==========================================
// Formatters
// ==========================================
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  const k = 1024;
  if (bytes < k) return bytes + ' B';
  if (bytes < k * k) return (bytes / k).toFixed(1) + ' KB';
  if (bytes < k * k * k) return (bytes / (k * k)).toFixed(2) + ' MB';
  return (bytes / (k * k * k)).toFixed(2) + ' GB';
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  const k = 1024;
  if (bytesPerSec < k) return Math.round(bytesPerSec) + ' B/s';
  if (bytesPerSec < k * k) return (bytesPerSec / k).toFixed(1) + ' KB/s';
  return (bytesPerSec / (k * k)).toFixed(2) + ' MB/s';
}

function getPingColorClass(ping) {
  if (ping === null || ping === undefined) return '';
  if (ping < 50) return 'ping-good';
  if (ping < 100) return 'ping-medium';
  return 'ping-poor';
}

// ==========================================
// Microphone Test (Lobby)
// ==========================================
let micTesting = false;
let micAnimId = null;

async function toggleMicTest() {
  if (micTesting) {
    stopMicTest();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: state.echoCancellation,
        noiseSuppression: state.noiseSuppression,
        autoGainControl: state.autoGainControl,
        deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined
      },
      video: false
    });

    state.testStream = stream;
    state.testAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = state.testAudioCtx.createMediaStreamSource(stream);
    state.testAnalyser = state.testAudioCtx.createAnalyser();
    state.testAnalyser.fftSize = 256;
    source.connect(state.testAnalyser);

    micTesting = true;
    dom.micTestStatus.textContent = 'Konuşun...';
    dom.micTestStatus.classList.add('active');
    dom.btnTestMic.textContent = 'Testi Durdur';

    const buffer = new Uint8Array(state.testAnalyser.frequencyBinCount);
    function updateMeter() {
      if (!micTesting) return;
      state.testAnalyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i];
      const avg = sum / buffer.length;
      const pct = Math.min(100, Math.round((avg / 128) * 100));
      dom.micMeterFill.style.width = `${pct}%`;
      micAnimId = requestAnimationFrame(updateMeter);
    }
    updateMeter();
  } catch (err) {
    console.error('Mikrofon erişim hatası:', err);
    showToast('Mikrofona erişilemedi: ' + err.message);
  }
}

function stopMicTest() {
  micTesting = false;
  if (micAnimId) cancelAnimationFrame(micAnimId);
  if (state.testStream) {
    state.testStream.getTracks().forEach(t => t.stop());
    state.testStream = null;
  }
  if (state.testAudioCtx) {
    state.testAudioCtx.close();
    state.testAudioCtx = null;
  }
  dom.micMeterFill.style.width = '0%';
  dom.micTestStatus.textContent = 'Bekleniyor...';
  dom.micTestStatus.classList.remove('active');
  dom.btnTestMic.textContent = 'Mikrofonu Test Et';
}

// ==========================================
// Device Enumeration
// ==========================================
async function loadAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    dom.selectMic.innerHTML = '';
    const audioInputs = devices.filter(d => d.kind === 'audioinput');

    audioInputs.forEach((dev, index) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Mikrofon ${index + 1}`;
      dom.selectMic.appendChild(opt);
    });

    if (audioInputs.length > 0 && !state.selectedMicId) {
      state.selectedMicId = audioInputs[0].deviceId;
    }
  } catch (err) {
    console.warn('Cihazlar listelenemedi:', err);
  }
}

// ==========================================
// Web Audio API & Audio Capture
// ==========================================
async function initLocalAudio() {
  const constraints = {
    audio: {
      deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined,
      echoCancellation: state.echoCancellation,
      noiseSuppression: state.noiseSuppression,
      autoGainControl: state.autoGainControl,
      sampleRate: 48000,
      channelCount: 2
    },
    video: false
  };

  state.localStream = await navigator.mediaDevices.getUserMedia(constraints);

  state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = state.audioCtx.createMediaStreamSource(state.localStream);
  state.localAnalyser = state.audioCtx.createAnalyser();
  state.localAnalyser.fftSize = 256;
  source.connect(state.localAnalyser);

  monitorSpeaking(state.localAnalyser, dom.localUserCard);
}

// Speaking Detection (VAD)
function monitorSpeaking(analyser, cardElement) {
  const data = new Uint8Array(analyser.frequencyBinCount);
  let isSpeaking = false;

  function checkVoice() {
    if (!cardElement || !document.body.contains(cardElement)) return;

    if (cardElement === dom.localUserCard && state.isMuted) {
      cardElement.classList.remove('speaking');
      requestAnimationFrame(checkVoice);
      return;
    }

    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = sum / data.length;

    if (avg > 14) {
      if (!isSpeaking) {
        isSpeaking = true;
        cardElement.classList.add('speaking');
      }
    } else {
      if (isSpeaking) {
        isSpeaking = false;
        cardElement.classList.remove('speaking');
      }
    }

    requestAnimationFrame(checkVoice);
  }

  requestAnimationFrame(checkVoice);
}

// ==========================================
// PeerJS P2P Room Connection
// ==========================================
async function joinVoiceRoom() {
  try {
    await initLocalAudio();

    dom.displayRoomName.textContent = `#${state.roomName}`;
    updateProfilePreviews();

    dom.lobbyScreen.classList.remove('active');
    dom.roomScreen.classList.add('active');

    // Open chat panel by default on entry
    openChat();

    // Start background network stats and ping loops
    startStatsMonitoring();

    const cleanRoom = state.roomName.replace(/[^a-z0-9_-]/g, '');
    const anchorId = `vchat-room-${cleanRoom}`;

    if (!state.hostPeerId) {
      initPeer(anchorId, true);
    } else {
      const myRandId = `vchat-peer-${cleanRoom}-${Math.random().toString(36).substring(2, 7)}`;
      initPeer(myRandId, false, state.hostPeerId);
    }
  } catch (err) {
    console.error('Odaya katılma hatası:', err);
    showToast('Hata: ' + err.message);
    leaveRoom();
  }
}

function initPeer(peerId, tryAsHost, directHostId = null) {
  dom.connectionStateText.textContent = 'Bağlanılıyor...';

  const peerConfig = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    },
    debug: 1
  };

  const peer = new Peer(peerId, peerConfig);
  state.peer = peer;

  peer.on('open', (id) => {
    state.myPeerId = id;
    state.isHost = tryAsHost;
    dom.connectionStateText.textContent = 'P2P Doğrudan Bağlı';
    showToast(tryAsHost ? 'Oda oluşturuldu (Oda Yöneticisisiniz)!' : 'Odaya bağlandınız!');
    updateParticipantCount();

    if (!tryAsHost && directHostId) {
      connectToHost(directHostId);
    }
  });

  peer.on('error', (err) => {
    console.log('PeerJS Bilgi:', err.type, err);

    if (err.type === 'unavailable-id' && tryAsHost) {
      console.log('Oda yöneticisi zaten var, katılımcı olarak bağlanılıyor...');
      peer.destroy();
      const cleanRoom = state.roomName.replace(/[^a-z0-9_-]/g, '');
      const myRandId = `vchat-peer-${cleanRoom}-${Math.random().toString(36).substring(2, 7)}`;
      initPeer(myRandId, false, peerId);
    } else {
      showToast('Bağlantı uyarısı: ' + (err.message || err.type));
    }
  });

  // Handle incoming calls (Audio stream or Screen share stream)
  peer.on('call', (call) => {
    if (call.metadata && call.metadata.type === 'screen-share') {
      handleIncomingScreenCall(call);
      return;
    }

    optimizeCallSdp(call);
    call.answer(state.localStream);

    call.on('stream', (remoteStream) => {
      handleRemoteStream(call.peer, remoteStream, call);
    });

    call.on('close', () => {
      removePeer(call.peer);
    });
  });

  // Handle incoming data connections (Signaling & metadata & Chat & Ping)
  peer.on('connection', (conn) => {
    setupDataConnection(conn);
  });
}

function connectToHost(hostId) {
  const conn = state.peer.connect(hostId, {
    metadata: {
      username: state.username,
      color: state.avatarColor,
      image: state.avatarImage,
      status: state.userStatus
    }
  });
  setupDataConnection(conn);
}

function setupDataConnection(conn) {
  conn.on('open', () => {
    // Send full profile identity
    conn.send({
      type: 'identity',
      username: state.username,
      color: state.avatarColor,
      image: state.avatarImage,
      status: state.userStatus,
      peerId: state.myPeerId,
      isMuted: state.isMuted
    });

    if (state.isSharingScreen && state.screenStream) {
      callPeerWithScreen(conn.peer, state.screenStream);
    }

    if (state.isHost) {
      const peerList = [];
      state.peers.forEach((p, pId) => {
        peerList.push({
          peerId: pId,
          username: p.name,
          color: p.color,
          image: p.image || '',
          status: p.status
        });
      });

      conn.send({
        type: 'peer-list',
        peers: peerList
      });

      state.peers.forEach((p) => {
        if (p.dataConn && p.dataConn.open) {
          p.dataConn.send({
            type: 'peer-joined',
            peerId: conn.peer,
            username: conn.metadata?.username || 'Arkadaş',
            color: conn.metadata?.color || '#5865F2',
            image: conn.metadata?.image || '',
            status: conn.metadata?.status || 'Çevrimiçi'
          });
        }
      });
    }
  });

  conn.on('data', (data) => {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'identity': {
        const p = state.peers.get(conn.peer);
        if (p) {
          p.name = data.username || p.name;
          p.color = data.color || p.color;
          p.image = data.image !== undefined ? data.image : p.image;
          p.status = data.status || p.status;
          updatePeerCardProfile(conn.peer, p);
        }
        break;
      }

      case 'profile-update': {
        const p = state.peers.get(data.peerId);
        if (p) {
          p.name = data.username;
          p.color = data.color;
          p.image = data.image !== undefined ? data.image : '';
          p.status = data.status;
          updatePeerCardProfile(data.peerId, p);
          showToast(`${p.name} profilini güncelledi.`);
        }
        break;
      }

      case 'peer-list': {
        data.peers.forEach((remoteUser) => {
          if (remoteUser.peerId !== state.myPeerId && !state.peers.has(remoteUser.peerId)) {
            callPeer(remoteUser.peerId, remoteUser.username, remoteUser.color, remoteUser.image, remoteUser.status);
          }
        });
        callPeer(conn.peer, conn.metadata?.username || 'Oda Kurucusu', conn.metadata?.color, conn.metadata?.image, conn.metadata?.status);
        break;
      }

      case 'peer-joined': {
        if (data.peerId !== state.myPeerId && !state.peers.has(data.peerId)) {
          callPeer(data.peerId, data.username, data.color, data.image, data.status);
        }
        break;
      }

      case 'mute-status': {
        const p = state.peers.get(conn.peer);
        if (p && p.cardEl) {
          const badge = p.cardEl.querySelector('.mute-indicator');
          if (badge) {
            if (data.isMuted) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
          }
        }
        break;
      }

      case 'screen-share-stopped': {
        if (state.activeScreenSharer === data.peerId) {
          hideScreenStage();
          showToast('Ekran paylaşımı durduruldu.');
        }
        break;
      }

      case 'chat-message': {
        receiveChatMessage(data);
        break;
      }

      case 'ping': {
        if (conn && conn.open) {
          conn.send({ type: 'pong', t: data.t });
        }
        break;
      }

      case 'pong': {
        const rtt = Date.now() - data.t;
        const p = state.peers.get(conn.peer);
        if (p) {
          p.lastDataChannelRtt = rtt;
        }
        break;
      }
    }
  });

  conn.on('close', () => {
    removePeer(conn.peer);
  });
}

function callPeer(remotePeerId, remoteName = 'Arkadaş', color = '#5865F2', image = '', status = 'Çevrimiçi') {
  if (state.peers.has(remotePeerId)) return;

  const call = state.peer.call(remotePeerId, state.localStream);
  optimizeCallSdp(call);

  const dataConn = state.peer.connect(remotePeerId, {
    metadata: {
      username: state.username,
      color: state.avatarColor,
      image: state.avatarImage,
      status: state.userStatus
    }
  });
  setupDataConnection(dataConn);

  call.on('stream', (remoteStream) => {
    handleRemoteStream(remotePeerId, remoteStream, call, remoteName, color, image, status, dataConn);
  });

  call.on('close', () => {
    removePeer(remotePeerId);
  });

  if (state.isSharingScreen && state.screenStream) {
    callPeerWithScreen(remotePeerId, state.screenStream);
  }
}

function optimizeCallSdp(call) {
  if (!call || !call.peerConnection) return;
  
  call.peerConnection.addEventListener('negotiationneeded', async () => {
    try {
      const senders = call.peerConnection.getSenders();
      senders.forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          const params = sender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          params.encodings[0].maxBitrate = state.bitrate;
          sender.setParameters(params).catch(() => {});
        }
      });
    } catch (e) {
      console.warn('Sender parametre ayarlama:', e);
    }
  });
}

function handleRemoteStream(peerId, stream, call, peerName = 'Arkadaş', color = '#5865F2', image = '', status = 'Çevrimiçi', dataConn = null) {
  if (state.peers.has(peerId)) {
    return;
  }

  const source = state.audioCtx.createMediaStreamSource(stream);
  const gainNode = state.audioCtx.createGain();
  const analyser = state.audioCtx.createAnalyser();
  analyser.fftSize = 256;

  source.connect(gainNode);
  gainNode.connect(analyser);
  gainNode.connect(state.audioCtx.destination);

  const audioEl = document.createElement('audio');
  audioEl.srcObject = stream;
  audioEl.autoplay = true;
  audioEl.muted = true;
  document.body.appendChild(audioEl);

  const cardEl = createPeerCard(peerId, peerName, color, image, status, gainNode);
  dom.peersGrid.appendChild(cardEl);

  state.peers.set(peerId, {
    name: peerName,
    color: color,
    image: image,
    status: status,
    call,
    dataConn,
    gainNode,
    analyser,
    cardEl,
    audioEl,
    currentPing: null,
    bytesReceived: 0,
    bytesSent: 0,
    lastDataChannelRtt: null
  });

  monitorSpeaking(analyser, cardEl);

  updateParticipantCount();
  showToast(`${peerName} odaya katıldı!`);
}

function createPeerCard(peerId, name, color, image, status, gainNode) {
  const card = document.createElement('div');
  card.className = 'user-card';
  card.id = `card-${peerId}`;

  const initial = (name || 'A').charAt(0).toUpperCase();

  card.innerHTML = `
    <div class="avatar-wrapper">
      <div class="avatar" id="avatar-${peerId}"></div>
      <div class="speaking-ring"></div>
      <span class="mute-indicator hidden">🔇</span>
    </div>
    <div class="user-details">
      <span class="user-name" id="name-${peerId}">${name}</span>
    </div>
    <span class="card-status-text" id="status-${peerId}">${status || 'Çevrimiçi'}</span>
    <!-- Card Latency & Data Stats -->
    <div class="card-stats-row">
      <span class="card-stat-pill" id="ping-pill-${peerId}">⚡ -- ms</span>
      <span class="card-stat-pill" id="traffic-pill-${peerId}">⬇️ 0 KB</span>
    </div>
    <div class="voice-wave">
      <span></span><span></span><span></span><span></span><span></span>
    </div>
    <div class="peer-volume-control" title="Kullanıcı Sesi">
      <span>🔊</span>
      <input type="range" class="volume-slider" min="0" max="2" step="0.05" value="1">
      <span class="vol-label">100%</span>
    </div>
  `;

  const avatarEl = card.querySelector(`#avatar-${peerId}`);
  applyAvatarToElement(avatarEl, image, color, initial);

  const slider = card.querySelector('.volume-slider');
  const volLabel = card.querySelector('.vol-label');
  slider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    gainNode.gain.value = state.isDeafened ? 0 : val;
    volLabel.textContent = `${Math.round(val * 100)}%`;
  });

  return card;
}

function updatePeerCardProfile(peerId, p) {
  const avatarEl = document.getElementById(`avatar-${peerId}`);
  const nameEl = document.getElementById(`name-${peerId}`);
  const statusEl = document.getElementById(`status-${peerId}`);

  const initial = (p.name || 'A').charAt(0).toUpperCase();

  if (avatarEl) {
    applyAvatarToElement(avatarEl, p.image, p.color, initial);
  }
  if (nameEl) nameEl.textContent = p.name;
  if (statusEl) statusEl.textContent = p.status || 'Çevrimiçi';
}

function removePeer(peerId) {
  const p = state.peers.get(peerId);
  if (!p) return;

  if (p.cardEl && p.cardEl.parentNode) {
    p.cardEl.parentNode.removeChild(p.cardEl);
  }
  if (p.audioEl && p.audioEl.parentNode) {
    p.audioEl.parentNode.removeChild(p.audioEl);
  }

  if (state.activeScreenSharer === peerId) {
    hideScreenStage();
  }

  state.peers.delete(peerId);
  updateParticipantCount();
  showToast(`${p.name} odadan ayrıldı.`);
}

function updateParticipantCount() {
  const total = state.peers.size + 1;
  dom.participantCount.textContent = `${total} Kişi`;
}

// ==========================================
// Network Latency & Data Monitoring (WebRTC Stats)
// ==========================================
function startStatsMonitoring() {
  stopStatsMonitoring();

  state.pingTimer = setInterval(() => {
    const now = Date.now();
    state.peers.forEach((p) => {
      if (p.dataConn && p.dataConn.open) {
        try {
          p.dataConn.send({ type: 'ping', t: now });
        } catch (e) {}
      }
    });
  }, 2000);

  state.statsTimer = setInterval(() => {
    collectNetworkStats();
  }, 1000);
}

function stopStatsMonitoring() {
  if (state.statsTimer) {
    clearInterval(state.statsTimer);
    state.statsTimer = null;
  }
  if (state.pingTimer) {
    clearInterval(state.pingTimer);
    state.pingTimer = null;
  }
}

async function collectNetworkStats() {
  let totalDown = 0;
  let totalUp = 0;
  const pings = [];
  const peerStatsData = [];

  for (const [peerId, p] of state.peers.entries()) {
    let peerDown = 0;
    let peerUp = 0;
    let peerPing = null;

    if (p.call && p.call.peerConnection) {
      try {
        const stats = await p.call.peerConnection.getStats();
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.selected || report.nominated)) {
            if (report.currentRoundTripTime !== undefined) {
              peerPing = Math.round(report.currentRoundTripTime * 1000);
            }
            if (report.bytesReceived !== undefined) peerDown += report.bytesReceived;
            if (report.bytesSent !== undefined) peerUp += report.bytesSent;
          }
        });
      } catch (e) {}
    }

    const sc = state.screenCalls.get(peerId);
    if (sc && sc.peerConnection) {
      try {
        const sStats = await sc.peerConnection.getStats();
        sStats.forEach((report) => {
          if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.selected || report.nominated)) {
            if (report.bytesReceived !== undefined) peerDown += report.bytesReceived;
            if (report.bytesSent !== undefined) peerUp += report.bytesSent;
          }
        });
      } catch (e) {}
    }

    if (peerPing === null && p.lastDataChannelRtt !== null && p.lastDataChannelRtt !== undefined) {
      peerPing = p.lastDataChannelRtt;
    }

    p.currentPing = peerPing;
    p.bytesReceived = peerDown;
    p.bytesSent = peerUp;

    if (peerPing !== null) {
      pings.push(peerPing);
    }

    totalDown += peerDown;
    totalUp += peerUp;

    updatePeerCardStats(peerId, peerPing, peerDown);

    peerStatsData.push({
      peerId,
      name: p.name || 'Arkadaş',
      ping: peerPing,
      down: peerDown,
      up: peerUp
    });
  }

  state.totalBytesReceived = totalDown;
  state.totalBytesSent = totalUp;

  const now = Date.now();
  const dt = (now - state.lastStatsTimestamp) / 1000;
  state.lastStatsTimestamp = now;

  const deltaDown = Math.max(0, totalDown - state.prevTotalBytesReceived);
  const deltaUp = Math.max(0, totalUp - state.prevTotalBytesSent);
  state.prevTotalBytesReceived = totalDown;
  state.prevTotalBytesSent = totalUp;

  state.downSpeed = dt > 0 ? deltaDown / dt : 0;
  state.upSpeed = dt > 0 ? deltaUp / dt : 0;

  state.avgPing = pings.length > 0 ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : null;

  updateGlobalStatsUI(state.avgPing, totalDown, totalUp, state.downSpeed, state.upSpeed);

  if (dom.netStatsModal && !dom.netStatsModal.classList.contains('hidden')) {
    renderModalStats(state.avgPing, totalDown, totalUp, state.downSpeed, state.upSpeed, peerStatsData);
  }
}

function updatePeerCardStats(peerId, ping, bytesDown) {
  const pingEl = document.getElementById(`ping-pill-${peerId}`);
  const trafficEl = document.getElementById(`traffic-pill-${peerId}`);

  if (pingEl) {
    if (ping !== null && ping !== undefined) {
      pingEl.textContent = `⚡ ${ping} ms`;
      pingEl.className = `card-stat-pill ${getPingColorClass(ping)}`;
    } else {
      pingEl.textContent = '⚡ -- ms';
      pingEl.className = 'card-stat-pill';
    }
  }

  if (trafficEl) {
    trafficEl.textContent = `⬇️ ${formatBytes(bytesDown)}`;
  }
}

function updateGlobalStatsUI(avgPing, totalDown, totalUp, downSpeed, upSpeed) {
  if (dom.headerPingVal) {
    dom.headerPingVal.textContent = avgPing !== null ? avgPing : '--';
    const container = dom.headerPingVal.parentElement;
    if (container) {
      container.className = `header-ping-badge ${getPingColorClass(avgPing)}`;
    }
  }

  if (dom.headerDownVal) dom.headerDownVal.textContent = formatBytes(totalDown);
  if (dom.headerUpVal) dom.headerUpVal.textContent = formatBytes(totalUp);

  if (dom.localCardTraffic) {
    dom.localCardTraffic.textContent = `⬆️ ${formatBytes(totalUp)}`;
  }
}

function renderModalStats(avgPing, totalDown, totalUp, downSpeed, upSpeed, peerList) {
  if (dom.modalStatPing) {
    dom.modalStatPing.textContent = avgPing !== null ? `${avgPing} ms` : '-- ms';
    dom.modalStatPing.className = `stat-value ${getPingColorClass(avgPing)}`;
  }

  if (dom.modalStatSpeed) {
    dom.modalStatSpeed.textContent = `↓ ${formatSpeed(downSpeed)} • ↑ ${formatSpeed(upSpeed)}`;
  }

  if (dom.modalStatDown) dom.modalStatDown.textContent = formatBytes(totalDown);
  if (dom.modalStatUp) dom.modalStatUp.textContent = formatBytes(totalUp);

  if (dom.peerStatsList) {
    if (peerList.length === 0) {
      dom.peerStatsList.innerHTML = '<div class="empty-state-muted">Henüz başka bir kullanıcı bağlı değil.</div>';
    } else {
      dom.peerStatsList.innerHTML = peerList.map(p => `
        <div class="peer-stat-item">
          <div class="peer-stat-info">
            <span>👤 ${p.name}</span>
          </div>
          <div class="peer-stat-metrics">
            <span class="${getPingColorClass(p.ping)}">⚡ ${p.ping !== null ? p.ping + ' ms' : '-- ms'}</span>
            <span>⬇️ ${formatBytes(p.down)}</span>
            <span>⬆️ ${formatBytes(p.up)}</span>
          </div>
        </div>
      `).join('');
    }
  }
}

function openNetStatsModal() {
  if (dom.netStatsModal) {
    dom.netStatsModal.classList.remove('hidden');
    collectNetworkStats();
  }
}

function closeNetStatsModal() {
  if (dom.netStatsModal) {
    dom.netStatsModal.classList.add('hidden');
  }
}

// ==========================================
// Profile Modal (In-Room Editing)
// ==========================================
function openProfileModal() {
  if (!dom.profileModal) return;

  dom.modalUsernameInput.value = state.username;
  dom.modalStatusInput.value = state.userStatus;

  renderProfileControls();
  updateProfilePreviews();

  dom.profileModal.classList.remove('hidden');
}

function closeProfileModal() {
  if (dom.profileModal) {
    dom.profileModal.classList.add('hidden');
  }
}

function saveProfileModal() {
  const newName = dom.modalUsernameInput.value.trim();
  const newStatus = dom.modalStatusInput.value.trim() || 'Çevrimiçi';

  if (!newName) {
    showToast('Lütfen geçerli bir isim girin!');
    return;
  }

  state.username = newName;
  state.userStatus = newStatus;

  localStorage.setItem('vchat_username', state.username);
  localStorage.setItem('vchat_status', state.userStatus);
  localStorage.setItem('vchat_color', state.avatarColor);
  if (state.avatarImage) {
    try {
      localStorage.setItem('vchat_avatar_img', state.avatarImage);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  } else {
    localStorage.removeItem('vchat_avatar_img');
  }

  updateProfilePreviews();
  closeProfileModal();

  // Broadcast profile update to all peers in room
  broadcastProfileUpdate();

  showToast('Profiliniz güncellendi!');
}

// ==========================================
// Screen Sharing Logic (WebRTC P2P Video)
// ==========================================
async function toggleScreenShare() {
  if (state.isSharingScreen) {
    stopScreenShare();
  } else {
    await startScreenShare();
  }
}

async function startScreenShare() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        frameRate: { ideal: 30, max: 60 }
      },
      audio: true
    });

    state.screenStream = stream;
    state.isSharingScreen = true;

    dom.sharedScreenVideo.srcObject = stream;
    dom.sharedScreenVideo.muted = true;
    dom.screenSharerName.textContent = `${state.username} (Senin Ekranın)`;
    dom.screenShareStage.classList.remove('hidden');

    dom.iconScreenOff.classList.add('hidden');
    dom.iconScreenOn.classList.remove('hidden');
    dom.btnToggleScreen.classList.add('active-green');
    dom.btnToggleScreen.querySelector('span').textContent = 'Durdur';

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        stopScreenShare();
      };
    }

    state.peers.forEach((p, pId) => {
      callPeerWithScreen(pId, stream);
    });

    showToast('📺 Ekran paylaşımı başlatıldı!');
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      console.error('Ekran paylaşımı hatası:', err);
      showToast('Ekran paylaşılamadı: ' + err.message);
    }
  }
}

function stopScreenShare() {
  if (!state.isSharingScreen && !state.screenStream) return;

  if (state.screenStream) {
    state.screenStream.getTracks().forEach((track) => track.stop());
    state.screenStream = null;
  }

  state.isSharingScreen = false;

  state.screenCalls.forEach((call) => {
    try { call.close(); } catch (e) {}
  });
  state.screenCalls.clear();

  if (dom.screenSharerName.textContent.includes('(Senin Ekranın)')) {
    hideScreenStage();
  }

  dom.iconScreenOff.classList.remove('hidden');
  dom.iconScreenOn.classList.add('hidden');
  dom.btnToggleScreen.classList.remove('active-green');
  dom.btnToggleScreen.querySelector('span').textContent = 'Ekran Paylaş';

  broadcastMessage({
    type: 'screen-share-stopped',
    peerId: state.myPeerId
  });

  showToast('Ekran paylaşımı durduruldu.');
}

function callPeerWithScreen(remotePeerId, stream) {
  if (!state.peer) return;

  const call = state.peer.call(remotePeerId, stream, {
    metadata: {
      type: 'screen-share',
      username: state.username
    }
  });

  state.screenCalls.set(remotePeerId, call);

  call.on('close', () => {
    state.screenCalls.delete(remotePeerId);
  });
}

function handleIncomingScreenCall(call) {
  call.answer();

  call.on('stream', (remoteScreenStream) => {
    dom.sharedScreenVideo.srcObject = remoteScreenStream;
    dom.sharedScreenVideo.muted = false;
    const sharerName = call.metadata?.username || 'Arkadaşın';
    dom.screenSharerName.textContent = `${sharerName} ekranını paylaşıyor`;
    dom.screenShareStage.classList.remove('hidden');
    state.activeScreenSharer = call.peer;
    showToast(`📺 ${sharerName} ekran paylaşmaya başladı!`);
  });

  call.on('close', () => {
    if (state.activeScreenSharer === call.peer) {
      hideScreenStage();
      showToast('Ekran paylaşımı sona erdi.');
    }
  });
}

function hideScreenStage() {
  dom.screenShareStage.classList.add('hidden');
  dom.sharedScreenVideo.srcObject = null;
  state.activeScreenSharer = null;
}

function toggleFullscreenScreen() {
  if (!document.fullscreenElement) {
    if (dom.screenShareStage.requestFullscreen) {
      dom.screenShareStage.requestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// ==========================================
// Text Chat (WebRTC DataChannel P2P)
// ==========================================
function toggleChat() {
  if (state.isChatOpen) {
    closeChat();
  } else {
    openChat();
  }
}

function openChat() {
  state.isChatOpen = true;
  dom.chatSidebar.classList.remove('hidden');
  if (dom.btnToggleChat) dom.btnToggleChat.classList.add('active');
  resetUnreadBadge();
  dom.chatInput.focus();
  scrollChatToBottom();
}

function closeChat() {
  state.isChatOpen = false;
  dom.chatSidebar.classList.add('hidden');
  if (dom.btnToggleChat) dom.btnToggleChat.classList.remove('active');
}

function resetUnreadBadge() {
  state.unreadChatCount = 0;
  dom.chatBadge.classList.add('hidden');
  dom.chatBadge.textContent = '0';
}

function sendChatMessage(e) {
  e.preventDefault();
  const text = dom.chatInput.value.trim();
  if (!text) return;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msg = {
    type: 'chat-message',
    id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    sender: state.username,
    senderColor: state.avatarColor,
    senderAvatar: state.avatarImage,
    senderId: state.myPeerId,
    text: text,
    time: timeStr
  };

  state.seenMsgIds.add(msg.id);
  renderChatMessage(msg, true);
  dom.chatInput.value = '';

  broadcastMessage(msg);
}

function receiveChatMessage(msg) {
  if (!msg || !msg.id || state.seenMsgIds.has(msg.id)) return;
  state.seenMsgIds.add(msg.id);

  renderChatMessage(msg, false);

  if (!state.isChatOpen) {
    state.unreadChatCount++;
    dom.chatBadge.textContent = state.unreadChatCount.toString();
    dom.chatBadge.classList.remove('hidden');

    const preview = msg.text.length > 35 ? msg.text.substring(0, 35) + '...' : msg.text;
    showToast(`💬 ${msg.sender}: ${preview}`);
  }

  if (state.isHost) {
    state.peers.forEach((p, pId) => {
      if (pId !== msg.senderId && p.dataConn && p.dataConn.open) {
        p.dataConn.send(msg);
      }
    });
  }
}

function renderChatMessage(msg, isSelf) {
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg';

  const initial = (msg.sender || 'A').charAt(0).toUpperCase();

  const avatar = document.createElement('div');
  avatar.className = 'chat-msg-avatar';
  applyAvatarToElement(avatar, msg.senderAvatar, msg.senderColor, initial);

  const content = document.createElement('div');
  content.className = 'chat-msg-content';

  const header = document.createElement('div');
  header.className = 'chat-msg-header';

  const author = document.createElement('span');
  author.className = 'chat-msg-author' + (isSelf ? ' is-self' : '');
  author.textContent = isSelf ? `${msg.sender} (Sen)` : msg.sender;

  const time = document.createElement('span');
  time.className = 'chat-msg-time';
  time.textContent = msg.time || '';

  header.appendChild(author);
  header.appendChild(time);

  const body = document.createElement('div');
  body.className = 'chat-msg-body';
  body.textContent = msg.text;

  content.appendChild(header);
  content.appendChild(body);

  msgEl.appendChild(avatar);
  msgEl.appendChild(content);

  dom.chatMessages.appendChild(msgEl);
  scrollChatToBottom();
}

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  });
}

// ==========================================
// Media Controls (Mute / Deafen / Leave)
// ==========================================
function toggleMute() {
  if (!state.localStream) return;

  state.isMuted = !state.isMuted;

  state.localStream.getAudioTracks().forEach((track) => {
    track.enabled = !state.isMuted;
  });

  if (state.isMuted) {
    dom.iconMicOn.classList.add('hidden');
    dom.iconMicOff.classList.remove('hidden');
    dom.btnToggleMic.classList.add('active-red');
    dom.btnToggleMic.querySelector('span').textContent = 'Aç';
    dom.localMuteBadge.classList.remove('hidden');
    dom.localUserCard.classList.remove('speaking');
  } else {
    dom.iconMicOn.classList.remove('hidden');
    dom.iconMicOff.classList.add('hidden');
    dom.btnToggleMic.classList.remove('active-red');
    dom.btnToggleMic.querySelector('span').textContent = 'Sustur';
    dom.localMuteBadge.classList.add('hidden');
  }

  broadcastMessage({
    type: 'mute-status',
    isMuted: state.isMuted
  });
}

function toggleDeafen() {
  state.isDeafened = !state.isDeafened;

  state.peers.forEach((p) => {
    if (p.gainNode) {
      p.gainNode.gain.value = state.isDeafened ? 0 : 1;
    }
  });

  if (state.isDeafened && !state.isMuted) {
    toggleMute();
  }

  if (state.isDeafened) {
    dom.iconAudioOn.classList.add('hidden');
    dom.iconAudioOff.classList.remove('hidden');
    dom.btnToggleDeafen.classList.add('active-red');
    dom.btnToggleDeafen.querySelector('span').textContent = 'Aç';
  } else {
    dom.iconAudioOn.classList.remove('hidden');
    dom.iconAudioOff.classList.add('hidden');
    dom.btnToggleDeafen.classList.remove('active-red');
    dom.btnToggleDeafen.querySelector('span').textContent = 'Sağırlaştır';
  }
}

function broadcastMessage(msg) {
  state.peers.forEach((p) => {
    if (p.dataConn && p.dataConn.open) {
      p.dataConn.send(msg);
    }
  });
}

function leaveRoom() {
  cleanupCall();
  dom.roomScreen.classList.remove('active');
  dom.lobbyScreen.classList.add('active');
  showToast('Görüşmeden ayrıldınız.');
}

function cleanupCall() {
  stopStatsMonitoring();

  if (state.isSharingScreen) {
    stopScreenShare();
  }
  hideScreenStage();
  closeChat();
  resetUnreadBadge();
  closeNetStatsModal();
  closeProfileModal();

  if (state.localStream) {
    state.localStream.getTracks().forEach((t) => t.stop());
    state.localStream = null;
  }

  if (state.audioCtx) {
    state.audioCtx.close();
    state.audioCtx = null;
  }

  if (state.peer) {
    state.peer.destroy();
    state.peer = null;
  }

  state.peers.forEach((p) => {
    if (p.cardEl && p.cardEl.parentNode) p.cardEl.parentNode.removeChild(p.cardEl);
    if (p.audioEl && p.audioEl.parentNode) p.audioEl.parentNode.removeChild(p.audioEl);
  });
  state.peers.clear();

  state.isMuted = false;
  state.isDeafened = false;
  dom.btnToggleMic.classList.remove('active-red');
  dom.btnToggleDeafen.classList.remove('active-red');
  dom.iconMicOn.classList.remove('hidden');
  dom.iconMicOff.classList.add('hidden');
  dom.iconAudioOn.classList.remove('hidden');
  dom.iconAudioOff.classList.add('hidden');
}

// ==========================================
// Invite Link
// ==========================================
function copyInviteLink() {
  const url = new URL(window.location.href);
  url.searchParams.set('room', state.roomName);
  if (state.myPeerId) {
    url.searchParams.set('host', state.myPeerId);
  }

  navigator.clipboard.writeText(url.toString()).then(() => {
    showToast('📋 Davet bağlantısı kopyalandı! Arkadaşınıza gönderin.');
  }).catch(() => {
    prompt('Davet Bağlantısı:', url.toString());
  });
}

// ==========================================
// Settings Modal
// ==========================================
function openSettings() {
  loadAudioDevices();
  dom.selectBitrate.value = state.bitrate.toString();
  dom.chkEcho.checked = state.echoCancellation;
  dom.chkNoise.checked = state.noiseSuppression;
  dom.chkGain.checked = state.autoGainControl;
  dom.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  dom.settingsModal.classList.add('hidden');
}

async function saveSettings() {
  state.selectedMicId = dom.selectMic.value;
  state.bitrate = parseInt(dom.selectBitrate.value, 10);
  state.echoCancellation = dom.chkEcho.checked;
  state.noiseSuppression = dom.chkNoise.checked;
  state.autoGainControl = dom.chkGain.checked;

  closeSettings();
  showToast('Ayarlar kaydedildi.');

  if (state.localStream) {
    try {
      state.localStream.getTracks().forEach((t) => t.stop());
      await initLocalAudio();

      const newTrack = state.localStream.getAudioTracks()[0];
      state.peers.forEach((p) => {
        if (p.call && p.call.peerConnection) {
          const senders = p.call.peerConnection.getSenders();
          const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(newTrack);
          }
        }
      });
      showToast('Mikrofon akışı güncellendi!');
    } catch (err) {
      console.error('Mikrofon güncellenemedi:', err);
    }
  }
}
