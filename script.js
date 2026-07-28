// script.js - Colour Match game (tweaked colour generation)
(() => {
  // DOM
  const gridEl = document.getElementById('grid');
  const startBtn = document.getElementById('startBtn');
  const nextBtn = document.getElementById('nextBtn');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const timeEl = document.getElementById('time');
  const highEl = document.getElementById('highscore');
  const targetSwatch = document.getElementById('targetSwatch');
  const targetHex = document.getElementById('targetHex');
  const patternToggle = document.getElementById('patternMode');
  const soundToggle = document.getElementById('soundToggle');
  const resetHigh = document.getElementById('resetHigh');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMessage = document.getElementById('overlayMessage');
  const overlayRestart = document.getElementById('overlayRestart');
  const overlayClose = document.getElementById('overlayClose');

  // State
  let score = 0;
  let level = 1;
  let tilesCount = 4; // starting tiles
  let timeLeft = 30;
  let timerId = null;
  let targetColor = '';
  let tiles = [];
  let patternMode = false;
  let highScore = parseInt(localStorage.getItem('colour-match-high') || '0', 10);
  highEl.textContent = highScore;

  // Sound (simple beep using WebAudio)
  const audioCtx = window.AudioContext ? new AudioContext() : null;
  function beep(freq = 440, duration = 0.06, vol = 0.15){
    if(!audioCtx || !soundToggle.checked) return;
    try{
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + duration);
    }catch(e){/* ignore */}
  }

  // Utilities
  function rand(min=0,max=255){ return Math.floor(Math.random()*(max-min+1))+min }
  function rgbToHex(r,g,b){ return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('') }
  function randomBaseColor(){ return {r:rand(0,255), g:rand(0,255), b:rand(0,255)} }

  // Create a color similar to `col` but with controlled variance.
  // Larger `variance` => more different color. We clamp channels to [0,255].
  function similarColor(col, variance=18){
    return {
      r: Math.max(0, Math.min(255, col.r + Math.floor((Math.random()-0.5)*2*variance))),
      g: Math.max(0, Math.min(255, col.g + Math.floor((Math.random()-0.5)*2*variance))),
      b: Math.max(0, Math.min(255, col.b + Math.floor((Math.random()-0.5)*2*variance)))
    }
  }

  function setHUD(){
    scoreEl.textContent = score;
    levelEl.textContent = level;
    timeEl.textContent = Math.max(0, Math.ceil(timeLeft));
    highEl.textContent = highScore;
  }

  function clearGrid(){ gridEl.innerHTML = ''; tiles = [] }

  // Generate tiles such that most distractors are clearly different (less similar)
  // but a couple of "hard" distractors remain close to the target to keep the challenge.
  function createTiles(count){
    clearGrid();
    // set grid columns based on count
    const cols = Math.ceil(Math.sqrt(count));
    gridEl.style.gridTemplateColumns = `repeat(${cols}, auto)`;

    const base = randomBaseColor();
    // pick one index as correct
    const correctIndex = Math.floor(Math.random()*count);
    targetColor = rgbToHex(base.r, base.g, base.b);

    // Decide which indices will be "hard" (close) distractors.
    const hardIndices = new Set();
    if(count > 4){
      // up to two close distractors (but never the correct index)
      const hardCount = Math.min(2, Math.max(1, Math.floor(count / 8)) );
      while(hardIndices.size < hardCount){
        const idx = Math.floor(Math.random()*count);
        if(idx !== correctIndex) hardIndices.add(idx);
      }
    }

    for(let i=0;i<count;i++){
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.setAttribute('role','gridcell');
      tile.setAttribute('tabindex', i===0 ? '0' : '-1');
      tile.dataset.index = i;
      tile.dataset.correct = (i===correctIndex) ? '1' : '0';

      let colObj;
      if(i===correctIndex){
        colObj = base;
      } else if(hardIndices.has(i)){
        // Hard distractors: small variance -> close to the target, keep the challenge
        const varLow = Math.max(8, 8 - Math.floor(level/6));
        const varHigh = Math.max(14, 18 - Math.floor(level/5));
        const variance = rand(varLow, varHigh);
        colObj = similarColor(base, variance);
      } else {
        // Other distractors: make them noticeably different so overall colours are less similar
        // Increase difference as level grows to keep game engaging without being indistinguishable
        const minVar = Math.min(40, 30 + Math.floor(level * 2));
        const maxVar = Math.min(110, 60 + Math.floor(level * 4));
        const variance = rand(minVar, maxVar);
        colObj = similarColor(base, variance);
      }

      const hex = rgbToHex(colObj.r, colObj.g, colObj.b);
      tile.style.backgroundColor = hex;

      // Add pattern overlay if patternMode and not exact match
      if(patternMode){
        const pat = document.createElement('span');
        pat.className = 'pattern-overlay';
        pat.classList.add(`pattern-${(i%3)+1}`);
        pat.style.position='absolute'; pat.style.inset=0; pat.style.borderRadius='8px';
        tile.style.position='relative';
        tile.appendChild(pat);
      }

      tile.addEventListener('click', onTileClick);
      tile.addEventListener('keydown', onTileKeyDown);
      gridEl.appendChild(tile);
      tiles.push(tile);
    }

    // show target swatch as the actual correct colour
    targetSwatch.style.backgroundColor = targetColor;
    targetHex.textContent = targetColor.toUpperCase();
    targetSwatch.className = 'swatch';
    setHUD();
  }

  function onTileClick(e){
    const btn = e.currentTarget;
    const isCorrect = btn.dataset.correct === '1';
    handleSelection(isCorrect, btn);
  }

  function onTileKeyDown(e){
    const idx = Number(e.currentTarget.dataset.index);
    const cols = Math.ceil(Math.sqrt(tiles.length));
    let nextIdx = null;
    if(e.key === 'ArrowRight') nextIdx = (idx + 1) % tiles.length;
    if(e.key === 'ArrowLeft') nextIdx = (idx - 1 + tiles.length) % tiles.length;
    if(e.key === 'ArrowDown') nextIdx = (idx + cols) % tiles.length;
    if(e.key === 'ArrowUp') nextIdx = (idx - cols + tiles.length) % tiles.length;
    if(nextIdx !== null){
      e.preventDefault();
      focusTile(nextIdx);
    }
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      const isCorrect = e.currentTarget.dataset.correct === '1';
      handleSelection(isCorrect, e.currentTarget);
    }
  }

  function focusTile(i){
    tiles.forEach((t,idx)=> t.setAttribute('tabindex', idx===i ? '0' : '-1'));
    tiles[i].focus();
  }

  function handleSelection(isCorrect, btn){
    if(isCorrect){
      // reward
      score += 10 * level;
      beep(800,0.05,0.08);
      level += 1;
      // increase tile count progressively
      tilesCount = Math.min(36, tilesCount + Math.floor(level/1.5));
      // add a little time bonus
      timeLeft += Math.max(2, 4 - Math.floor(level/5));
      setHUD();
      // immediate next level generation
      createTiles(tilesCount);
    } else {
      // penalty
      beep(220,0.08,0.08);
      timeLeft -= 5;
      score = Math.max(0, score - 5);
      setHUD();
      // flash the wrong tile
      btn.style.transform = 'scale(0.98)';
      btn.style.opacity = '0.9';
      setTimeout(()=>{ btn.style.transform=''; btn.style.opacity=''; },220);
    }
    // update high score
    if(score > highScore){ highScore = score; localStorage.setItem('colour-match-high', String(highScore)); highEl.textContent = highScore }
  }

  function startTimer(){
    stopTimer();
    timerId = setInterval(()=>{
      timeLeft -= 0.25;
      if(timeLeft <= 0){ timeLeft = 0; stopTimer(); gameOver(); }
      setHUD();
    }, 250);
  }
  function stopTimer(){ if(timerId){ clearInterval(timerId); timerId = null } }

  function startGame(){
    score = 0; level = 1; tilesCount = 4; timeLeft = 30; patternMode = patternToggle.checked;
    setHUD();
    createTiles(tilesCount);
    startTimer();
    startBtn.disabled = true;
    nextBtn.disabled = false;
  }

  function nextLevel(){
    level += 1; tilesCount = Math.min(36, tilesCount + 2); timeLeft += 6; createTiles(tilesCount); setHUD();
  }

  function gameOver(){
    stopTimer();
    overlayTitle.textContent = 'Game Over';
    overlayMessage.textContent = `You reached level ${level} with a score of ${score}.`;
    overlay.classList.remove('hidden');
    overlayRestart.focus();
    startBtn.disabled = false;
    nextBtn.disabled = true;
  }

  function resetHighScore(){ localStorage.removeItem('colour-match-high'); highScore = 0; highEl.textContent = highScore }

  // Event bindings
  startBtn.addEventListener('click', ()=>{ // resume audio context on user gesture
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    startGame();
  });
  nextBtn.addEventListener('click', ()=> nextLevel());
  patternToggle.addEventListener('change', ()=>{ patternMode = patternToggle.checked; createTiles(tilesCount) });
  resetHigh.addEventListener('click', ()=>{ resetHighScore(); beep(400,0.05,0.08); });
  overlayRestart.addEventListener('click', ()=>{ overlay.classList.add('hidden'); startGame(); });
  overlayClose.addEventListener('click', ()=>{ overlay.classList.add('hidden'); });

  // Global keyboard shortcuts
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape'){ overlay.classList.add('hidden'); }
  });

  // Initialize a simple start screen (show sample tiles)
  createTiles(4);
  setHUD();
})();
