/* ==============================
   SISTER — tiles.js
   Generates the disco ball grid
============================== */

(function () {
  const COLORS = [
    '#F06C9B', // pink
    '#F4A225', // orange
    '#5BB8A8', // teal
    '#F5E6C8', // cream
    '#FFFFFF', // white
    '#E84E7A', // deep pink
    '#F7C257', // light orange
    '#3D9E8C', // deep teal
  ];

  const ball     = document.querySelector('.ball-inner');
  const ballEl   = document.getElementById('discoBall');
  const ballSize = ballEl.offsetWidth || 360;

  // Calculate rows & cols based on ball size
  const COLS = Math.round(ballSize / 22);
  const ROWS = Math.round(ballSize / 22);

  ball.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  ball.style.gridTemplateRows    = `repeat(${ROWS}, 1fr)`;

  const total = ROWS * COLS;

  for (let i = 0; i < total; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile';

    // Pick a semi-random color with some bias toward white/cream in center
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const dRow = Math.abs(row - ROWS / 2) / (ROWS / 2);
    const dCol = Math.abs(col - COLS / 2) / (COLS / 2);
    const distFromCenter = Math.sqrt(dRow * dRow + dCol * dCol);

    // Center tiles brighter / more white
    let colorIndex;
    if (distFromCenter < 0.3 && Math.random() > 0.4) {
      colorIndex = Math.random() > 0.5 ? 4 : 2; // white or teal
    } else {
      colorIndex = Math.floor(Math.random() * COLORS.length);
    }

    tile.style.backgroundColor = COLORS[colorIndex];

    // Subtle brightness variation
    const brightness = 0.75 + Math.random() * 0.55;
    tile.style.filter = `brightness(${brightness})`;

    // Individual flash timing for spinning effect
    tile.style.setProperty('--flash-dur',   `${0.6 + Math.random() * 1.4}s`);
    tile.style.setProperty('--flash-delay', `${(Math.random() * 1.2).toFixed(2)}s`);

    ball.appendChild(tile);
  }
})();