(function () {
  var NX = 50, NY = 25, CELL = 16;
  var STEP_MS_START = 140;
  var STEP_MS_MIN = 60;
  var SPEED_SCORE_STEP = 10;
  var SPEED_MAX_SCORE = 100;
  var currentStepMs = STEP_MS_START;
  var MIN_STEPS_BEFORE_UTURN = 2;
  var BOMB_MOVES_INTERVAL = 200;
  var BOMB_SAFE_AHEAD = 20;
  var startX = Math.floor(NX / 2), startY = Math.floor(NY / 2);
  var x = startX, y = startY, moves = 0, score = 0;
  var dir = null;
  var stepsSinceTurn = 0;
  var running = false;
  var gameOver = false;
  var tickTimer = null;
  var heartMap = new Map();
  var bombMap = new Map();
  var body = [];
  var bodyEls = [];
  var audioCtx = null;

  var drafting = document.querySelector('.drafting');
  var stageEl = document.querySelector('.stage');
  var board = document.getElementById('board');
  var square = document.getElementById('square');
  var scoreBadge = document.getElementById('scoreBadge');
  var readyEl = document.getElementById('readyEl');
  var gameOverEl = document.getElementById('gameOver');
  var goScore = document.getElementById('goScore');
  var replayBtn = document.getElementById('replayBtn');

  var CELL_MAX = 16, CELL_MIN = 6;
  var currentCell = CELL_MAX;

  function fitBoard() {
    var boardWrapChrome = 10;
    var available = stageEl.clientWidth - boardWrapChrome;
    var cell = Math.floor(available / NX);
    cell = Math.max(CELL_MIN, Math.min(CELL_MAX, cell));
    currentCell = cell;
    drafting.style.setProperty('--cell', cell + 'px');
  }

  function render() {
    square.style.setProperty('--x', x);
    square.style.setProperty('--y', y);
    scoreBadge.textContent = String(score).padStart(3, '0');
    renderBody();
  }

  function renderBody() {
    while (bodyEls.length < body.length) {
      var seg = document.createElement('div');
      seg.className = 'segment';
      board.appendChild(seg);
      bodyEls.push(seg);
    }
    while (bodyEls.length > body.length) {
      bodyEls.pop().remove();
    }
    for (var i = 0; i < body.length; i++) {
      bodyEls[i].style.setProperty('--x', body[i].x);
      bodyEls[i].style.setProperty('--y', body[i].y);
    }
  }

  function beep() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
  }

  function explode() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      var dur = 0.35;
      var bufferSize = Math.floor(audioCtx.sampleRate * dur);
      var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
      }
      var noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      var filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + dur);
      var gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
      noise.stop(audioCtx.currentTime + dur);

      var osc = audioCtx.createOscillator();
      var oscGain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + dur);
      oscGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }

  function shatterSquare() {
    square.style.visibility = 'hidden';
    var fragCount = 12;
    for (var i = 0; i < fragCount; i++) {
      var frag = document.createElement('div');
      frag.className = 'frag';
      frag.style.setProperty('--x', x);
      frag.style.setProperty('--y', y);
      var distScale = currentCell / CELL_MAX;
      var angle = Math.random() * Math.PI * 2;
      var dist = (18 + Math.random() * 46) * distScale;
      frag.style.setProperty('--tx', (Math.cos(angle) * dist) + 'px');
      frag.style.setProperty('--ty', (Math.sin(angle) * dist) + 'px');
      frag.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      board.appendChild(frag);
      (function (f) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { f.classList.add('go'); });
        });
        setTimeout(function () { f.remove(); }, 650);
      })(frag);
    }
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    running = false;
    dir = null;
    clearInterval(tickTimer);
    explode();
    shatterSquare();
    goScore.textContent = String(score).padStart(3, '0');
    gameOverEl.hidden = false;
    requestAnimationFrame(function () { gameOverEl.classList.add('show'); });
  }

  function collectHeart() {
    var key = x + ',' + y;
    var heart = heartMap.get(key);
    if (!heart) return false;
    heart.remove();
    heartMap.delete(key);
    score += 1;
    beep();
    applySpeed();
    placeHearts(1);
    return true;
  }

  function poof() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      var dur = 0.3;
      var bufferSize = Math.floor(audioCtx.sampleRate * dur);
      var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      var noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      var filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(140, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + dur * 0.35);
      filter.Q.value = 0.9;
      var noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + dur * 0.15);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start();
      noise.stop(audioCtx.currentTime + dur);

      var osc = audioCtx.createOscillator();
      var oscGain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + dur * 0.3);
      osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + dur);
      oscGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + dur * 0.15);
      oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }

  function occupiedCells() {
    var used = new Set(heartMap.keys());
    bombMap.forEach(function (_, key) { used.add(key); });
    used.add(x + ',' + y);
    for (var i = 0; i < body.length; i++) used.add(body[i].x + ',' + body[i].y);
    return used;
  }

  function spawnBomb() {
    var used = occupiedCells();
    if (dir) {
      for (var k = 1; k <= BOMB_SAFE_AHEAD; k++) {
        used.add((x + dir[0] * k) + ',' + (y + dir[1] * k));
      }
    }
    var bx, by, key, attempts = 0;
    do {
      bx = Math.floor(Math.random() * NX);
      by = Math.floor(Math.random() * NY);
      key = bx + ',' + by;
      attempts++;
    } while (used.has(key) && attempts < 2000);
    if (used.has(key)) return;
    var bomb = document.createElement('div');
    bomb.className = 'bomb';
    bomb.textContent = '💣';
    bomb.style.setProperty('--x', bx);
    bomb.style.setProperty('--y', by);
    board.appendChild(bomb);
    bombMap.set(key, bomb);
    poof();
  }

  function step() {
    if (gameOver || !dir) return;
    var nx = x + dir[0];
    var ny = y + dir[1];
    if (nx < 0 || nx >= NX || ny < 0 || ny >= NY) {
      endGame();
      return;
    }
    for (var i = 0; i < body.length; i++) {
      if (body[i].x === nx && body[i].y === ny) {
        endGame();
        return;
      }
    }
    if (bombMap.has(nx + ',' + ny)) {
      endGame();
      return;
    }
    var prevHead = { x: x, y: y };
    x = nx; y = ny; moves += 1;
    stepsSinceTurn += 1;
    var grew = collectHeart();
    if (body.length > 0 || grew) {
      body.unshift(prevHead);
      if (!grew) body.pop();
    }
    if (moves % BOMB_MOVES_INTERVAL === 0) {
      spawnBomb();
    }
    render();
  }

  function computeStepMs(currentScore) {
    var maxLevel = SPEED_MAX_SCORE / SPEED_SCORE_STEP;
    var level = Math.min(Math.floor(currentScore / SPEED_SCORE_STEP), maxLevel);
    return STEP_MS_START - (level / maxLevel) * (STEP_MS_START - STEP_MS_MIN);
  }

  function applySpeed() {
    currentStepMs = computeStepMs(score);
    if (running) {
      clearInterval(tickTimer);
      tickTimer = setInterval(step, currentStepMs);
    }
  }

  function startRunning() {
    if (running) return;
    running = true;
    board.classList.add('started');
    readyEl.hidden = true;
    step();
    tickTimer = setInterval(step, currentStepMs);
  }

  var KEY_MAP = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0]
  };

  function handleDirectionInput(delta) {
    if (gameOver) return;
    if (dir && delta[0] === dir[0] && delta[1] === dir[1]) {
      startRunning();
      return;
    }
    var isReverse = dir && delta[0] === -dir[0] && delta[1] === -dir[1];
    if (isReverse && stepsSinceTurn < MIN_STEPS_BEFORE_UTURN) {
      return;
    }
    dir = delta;
    stepsSinceTurn = 0;
    startRunning();
  }

  window.addEventListener('keydown', function (e) {
    var delta = KEY_MAP[e.key];
    if (!delta) return;
    e.preventDefault();
    handleDirectionInput(delta);
  });

  document.querySelectorAll('.dpad-btn').forEach(function (btn) {
    var delta = [Number(btn.dataset.dx), Number(btn.dataset.dy)];
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      handleDirectionInput(delta);
    });
  });

  function resetGame() {
    clearInterval(tickTimer);
    running = false;
    gameOver = false;
    dir = null;
    stepsSinceTurn = 0;
    x = startX; y = startY; moves = 0; score = 0;
    currentStepMs = STEP_MS_START;
    square.style.visibility = '';
    board.classList.remove('started');
    readyEl.hidden = false;
    gameOverEl.classList.remove('show');
    gameOverEl.hidden = true;
    board.querySelectorAll('.frag').forEach(function (f) { f.remove(); });
    heartMap.forEach(function (h) { h.remove(); });
    heartMap.clear();
    bombMap.forEach(function (b) { b.remove(); });
    bombMap.clear();
    body = [];
    placeHearts(3);
    render();
  }

  replayBtn.addEventListener('click', resetGame);

  function placeHearts(count) {
    var used = occupiedCells();
    var placed = 0;
    while (placed < count) {
      var hx = Math.floor(Math.random() * NX);
      var hy = Math.floor(Math.random() * NY);
      var key = hx + ',' + hy;
      if (used.has(key)) continue;
      used.add(key);
      var heart = document.createElement('div');
      heart.className = 'heart';
      heart.textContent = '❤️';
      heart.style.setProperty('--x', hx);
      heart.style.setProperty('--y', hy);
      board.appendChild(heart);
      heartMap.set(key, heart);
      placed++;
    }
  }

  fitBoard();
  window.addEventListener('resize', fitBoard);
  placeHearts(3);
  render();
})();
