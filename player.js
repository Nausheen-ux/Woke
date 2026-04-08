/* ==============================
   SISTER — player.js
   Audio player + disco ball control
============================== */

(function () {
  const audio       = document.getElementById('audio');
  const playBtn     = document.getElementById('playBtn');
  const playIcon    = document.getElementById('playIcon');
  const prevBtn     = document.getElementById('prevBtn');
  const nextBtn     = document.getElementById('nextBtn');
  const progressBar = document.getElementById('progressBar');
  const volBar      = document.getElementById('volBar');
  const currentTime = document.getElementById('currentTime');
  const durationEl  = document.getElementById('duration');
  const trackName   = document.getElementById('trackName');
  const audioUpload = document.getElementById('audioUpload');
  const discoBall   = document.getElementById('discoBall');
  const sunbeams    = document.getElementById('sunbeams');

  let isPlaying = false;

  // ── Helpers ──────────────────────────────────
  function fmt(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }

  function setPlaying(state) {
    isPlaying = state;
    playIcon.textContent = state ? '⏸' : '▶';

    if (state) {
      discoBall.classList.add('spinning');
      sunbeams.style.animation = 'sunSpin 4s linear infinite';
    } else {
      discoBall.classList.remove('spinning');
      sunbeams.style.animation = '';
    }
  }

  // ── Play / Pause ─────────────────────────────
  playBtn.addEventListener('click', () => {
    if (!audio.src) {
      // Bounce the upload button to hint the user
      const uBtn = document.querySelector('.upload-btn');
      uBtn.style.animation = 'none';
      uBtn.style.outline = '2px solid #F4A225';
      setTimeout(() => { uBtn.style.outline = ''; }, 800);
      return;
    }
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  });

  audio.addEventListener('play',  () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => setPlaying(false));

  // ── Rewind / Forward ────────────────────────
  prevBtn.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  });
  nextBtn.addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
  });

  // ── Progress bar ────────────────────────────
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.value = pct;
    currentTime.textContent = fmt(audio.currentTime);

    // Dynamic fill colour
    progressBar.style.background =
      `linear-gradient(to right, #F4A225 ${pct}%, rgba(245,230,200,0.2) ${pct}%)`;
  });

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = fmt(audio.duration);
  });

  progressBar.addEventListener('input', () => {
    if (!audio.duration) return;
    audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

  // ── Volume ──────────────────────────────────
  volBar.addEventListener('input', () => {
    audio.volume = volBar.value / 100;
    volBar.style.background =
      `linear-gradient(to right, #5BB8A8 ${volBar.value}%, rgba(245,230,200,0.2) ${volBar.value}%)`;
  });
  // Set initial fill
  volBar.style.background =
    `linear-gradient(to right, #5BB8A8 80%, rgba(245,230,200,0.2) 80%)`;
  audio.volume = 0.8;

  // ── File upload ─────────────────────────────
  audioUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.load();

    // Show track name (strip extension)
    const name = file.name.replace(/\.[^/.]+$/, '');
    trackName.textContent = name;
    trackName.title = name;

    // Auto-play
    audio.play().catch(() => {});
  });

  // ── Click ball to toggle play ────────────────
  discoBall.addEventListener('click', () => {
    playBtn.click();
  });

  // ── Sunbeam spin keyframe (added dynamically) ─
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes sunSpin {
      from { transform: translate(-50%, -42%) rotate(0deg); }
      to   { transform: translate(-50%, -42%) rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);

})();