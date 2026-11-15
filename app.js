import { DECKS } from './data.js';

const TOTAL_TIMER_SECONDS = 180;

const state = {
  deckIndex: 0,
  currentIndex: 0,
  // status per item: 'pending' | 'correct' | 'wrong' | 'skipped' | 'revealed'
  statuses: [],
  translationOpen: false,
  answerOpen: false,
  feedback: null, // { type: 'correct' | 'wrong', text: string } | null
  soundEnabled: true,
  timerEnabled: false,
  secondsLeft: TOTAL_TIMER_SECONDS,
  timerId: null,
  summaryDismissed: false,
};

const el = {
  deckTabs: Array.from(document.querySelectorAll('.deck-tab')),
  deckTitle: document.getElementById('deck-title'),
  deckMeta: document.getElementById('deck-meta'),
  roscoStage: document.getElementById('rosco-stage'),
  roscoRing: document.getElementById('rosco-ring'),
  roscoActiveLetter: document.getElementById('rosco-active-letter'),
  roscoCenterSub: document.getElementById('rosco-center-sub'),
  counterTimer: document.getElementById('counter-timer'),
  counterCorrect: document.getElementById('counter-correct'),
  statCorrect: document.getElementById('stat-correct'),
  statWrong: document.getElementById('stat-wrong'),
  statSkipped: document.getElementById('stat-skipped'),
  qLetterMark: document.getElementById('q-letter-mark'),
  qTopic: document.getElementById('q-topic'),
  qStatusText: document.getElementById('q-status-text'),
  btnSpanishQuestion: document.getElementById('btn-spanish-question'),
  translateCue: document.getElementById('translate-cue'),
  qSpanish: document.getElementById('q-spanish'),
  armenianBox: document.getElementById('armenian-translation-box'),
  qArmenian: document.getElementById('q-armenian'),
  answerForm: document.getElementById('answer-form'),
  answerInput: document.getElementById('answer-input'),
  feedbackBanner: document.getElementById('feedback-banner'),
  btnPasapalabra: document.getElementById('btn-pasapalabra'),
  btnRevealAnswer: document.getElementById('btn-reveal-answer'),
  answerRevealBox: document.getElementById('answer-reveal-box'),
  revealEs: document.getElementById('reveal-es'),
  revealAm: document.getElementById('reveal-am'),
  btnMarkCorrect: document.getElementById('btn-mark-correct'),
  btnMarkWrong: document.getElementById('btn-mark-wrong'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnReset: document.getElementById('btn-reset'),
  btnTimerToggle: document.getElementById('btn-timer-toggle'),
  btnSoundToggle: document.getElementById('btn-sound-toggle'),
  quickStrip: document.getElementById('quick-strip'),
  stripProgress: document.getElementById('strip-progress'),
  summaryModal: document.getElementById('summary-modal'),
  summarySubtitle: document.getElementById('summary-subtitle'),
  sumCorrect: document.getElementById('sum-correct'),
  sumWrong: document.getElementById('sum-wrong'),
  sumRevealed: document.getElementById('sum-revealed'),
  summaryList: document.getElementById('summary-list'),
  btnCloseSummary: document.getElementById('btn-close-summary'),
  btnSummaryReview: document.getElementById('btn-summary-review'),
  btnPlayAgain: document.getElementById('btn-play-again'),
};

let audioCtx = null;

function playTone(type) {
  if (!state.soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
    } else if (type === 'skip') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  } catch {
    // Audio playback ignored if blocked by browser policy
  }
}

function normalizeSpanish(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeKeepEnye(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/ñ/g, '__ENYE__')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/__ENYE__/g, 'ñ')
    .replace(/[^a-z0-9ñ]/g, '');
}

function getCurrentDeck() {
  return DECKS[state.deckIndex];
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTimer() {
  stopTimer();
  if (!state.timerEnabled) return;
  state.timerId = setInterval(() => {
    if (state.secondsLeft <= 0) {
      stopTimer();
      openSummaryModal('Se acabó el tiempo · Ժամանակը սպառվեց');
      return;
    }
    state.secondsLeft -= 1;
    renderCounters();
  }, 1000);
}

function initDeck(deckIndex) {
  state.deckIndex = deckIndex;
  const deck = getCurrentDeck();
  state.currentIndex = 0;
  state.statuses = deck.items.map(() => 'pending');
  state.translationOpen = false;
  state.answerOpen = false;
  state.feedback = null;
  state.secondsLeft = TOTAL_TIMER_SECONDS;
  state.summaryDismissed = false;
  el.summaryModal.hidden = true;

  if (state.timerEnabled) {
    startTimer();
  } else {
    stopTimer();
  }

  buildRoscoTiles();
  buildQuickStrip();
  renderAll();
}

function buildRoscoTiles() {
  const deck = getCurrentDeck();
  el.roscoRing.innerHTML = '';

  deck.items.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rosco-tile';
    btn.textContent = item.badge;
    btn.dataset.index = String(index);
    btn.setAttribute('aria-label', `${item.topic}: ${item.badge}`);
    btn.addEventListener('click', () => selectQuestion(index));
    el.roscoRing.appendChild(btn);
  });

  positionRoscoTiles();
}

function positionRoscoTiles() {
  const tiles = el.roscoRing.querySelectorAll('.rosco-tile');
  const count = tiles.length;
  if (!count) return;

  const rect = el.roscoStage.getBoundingClientRect();
  const stageSize = Math.min(rect.width || 440, rect.height || 440);
  const tileSize = window.innerWidth <= 720 ? 34 : 44;
  const radius = Math.max(120, stageSize / 2 - tileSize / 2 - 4);

  tiles.forEach((tile, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const isActive = index === state.currentIndex;
    const scale = isActive ? 1.18 : 1;
    tile.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(${scale})`;
  });
}

function buildQuickStrip() {
  const deck = getCurrentDeck();
  el.quickStrip.innerHTML = '';

  deck.items.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'strip-btn';
    btn.textContent = item.badge;
    btn.dataset.index = String(index);
    btn.addEventListener('click', () => selectQuestion(index));
    el.quickStrip.appendChild(btn);
  });
}

function selectQuestion(index) {
  const deck = getCurrentDeck();
  if (index < 0 || index >= deck.items.length) return;
  state.currentIndex = index;
  state.translationOpen = false;
  state.answerOpen = false;
  state.feedback = null;
  el.answerInput.value = '';
  renderAll();
}

function findNextUnresolvedIndex(fromIndex) {
  const total = state.statuses.length;
  for (let offset = 1; offset <= total; offset++) {
    const idx = (fromIndex + offset) % total;
    if (state.statuses[idx] === 'pending' || state.statuses[idx] === 'skipped') {
      return idx;
    }
  }
  return -1;
}

function getStatusLabel(status) {
  switch (status) {
    case 'correct':
      return 'Correcto · Ճիշտ է';
    case 'wrong':
      return 'Incorrecto · Սխալ է';
    case 'skipped':
      return 'Pasapalabra · Բաց թողնված';
    case 'revealed':
      return 'Respuesta vista · Պատասխանը բացված է';
    default:
      return 'Pendiente · Սպասում է';
  }
}

function renderCounters() {
  const correct = state.statuses.filter((s) => s === 'correct').length;
  const wrong = state.statuses.filter((s) => s === 'wrong').length;
  const skipped = state.statuses.filter((s) => s === 'skipped').length;
  const resolved = state.statuses.filter((s) => s === 'correct' || s === 'wrong' || s === 'revealed').length;
  const total = state.statuses.length;

  el.counterCorrect.textContent = String(correct);
  el.statCorrect.textContent = String(correct);
  el.statWrong.textContent = String(wrong);
  el.statSkipped.textContent = String(skipped);
  el.stripProgress.textContent = `${resolved} / ${total} resueltas`;

  if (state.timerEnabled) {
    const mins = Math.floor(state.secondsLeft / 60);
    const secs = String(state.secondsLeft % 60).padStart(2, '0');
    el.counterTimer.textContent = `${mins}:${secs}`;
  } else {
    el.counterTimer.textContent = `${resolved}/${total}`;
  }
}

function renderAll() {
  const deck = getCurrentDeck();
  const item = deck.items[state.currentIndex];
  const currentStatus = state.statuses[state.currentIndex];

  // Top tabs
  el.deckTabs.forEach((tab, idx) => {
    tab.classList.toggle('is-active', idx === state.deckIndex);
  });

  // Intro
  el.deckTitle.textContent = deck.title;
  el.deckMeta.textContent = deck.subtitle;

  // Center Rosco
  el.roscoActiveLetter.textContent = item.badge;
  el.roscoCenterSub.textContent = `${state.currentIndex + 1} / ${deck.items.length}`;

  // Rosco Tiles & Quick Strip
  const roscoTiles = el.roscoRing.querySelectorAll('.rosco-tile');
  const stripBtns = el.quickStrip.querySelectorAll('.strip-btn');

  deck.items.forEach((_, idx) => {
    const status = state.statuses[idx];
    const isActive = idx === state.currentIndex;

    const rTile = roscoTiles[idx];
    if (rTile) {
      rTile.className = `rosco-tile status-${status}${isActive ? ' is-active' : ''}`;
    }

    const sBtn = stripBtns[idx];
    if (sBtn) {
      sBtn.className = `strip-btn status-${status}${isActive ? ' is-active' : ''}`;
    }
  });

  positionRoscoTiles();
  renderCounters();

  // Question Card
  el.qLetterMark.textContent = item.badge;
  el.qTopic.textContent = item.topic;
  el.qStatusText.textContent = getStatusLabel(currentStatus);
  el.qStatusText.className = `question-status-text status-${currentStatus}`;

  el.qSpanish.textContent = item.esQuestion;
  el.btnSpanishQuestion.setAttribute('aria-expanded', String(state.translationOpen));
  el.translateCue.textContent = state.translationOpen
    ? 'Թաքցնել թարգմանությունը · Ocultar traducción'
    : 'Սեղմիր հայերեն թարգմանության համար · Clic para traducir';

  el.armenianBox.hidden = !state.translationOpen;
  el.qArmenian.textContent = item.amQuestion;

  // Feedback
  if (state.feedback) {
    el.feedbackBanner.hidden = false;
    el.feedbackBanner.className = `feedback-banner is-${state.feedback.type}`;
    el.feedbackBanner.textContent = state.feedback.text;
  } else {
    el.feedbackBanner.hidden = true;
    el.feedbackBanner.textContent = '';
  }

  // Separate Answer Reveal
  el.answerRevealBox.hidden = !state.answerOpen;
  el.revealEs.textContent = item.esAnswer;
  el.revealAm.textContent = item.amAnswer;
  el.btnRevealAnswer.classList.toggle('is-open', state.answerOpen);
  el.btnRevealAnswer.textContent = state.answerOpen
    ? 'Ocultar respuesta · Թաքցնել պատասխանը'
    : 'Ver respuesta · Տեսնել պատասխանը';

  // Utility toggle labels
  el.btnTimerToggle.setAttribute('aria-pressed', String(state.timerEnabled));
  el.btnTimerToggle.textContent = state.timerEnabled ? 'Cronómetro: 180s' : 'Cronómetro: Libre';
  el.btnSoundToggle.setAttribute('aria-pressed', String(state.soundEnabled));
  el.btnSoundToggle.textContent = state.soundEnabled ? 'Sonido: Sí' : 'Sonido: No';

  checkIfAllResolved();
}

function checkIfAllResolved() {
  if (state.summaryDismissed) return;
  const unresolved = state.statuses.some((s) => s === 'pending' || s === 'skipped');
  if (!unresolved) {
    stopTimer();
    openSummaryModal('Has completado las 27 preguntas · Բոլոր 27 հարցերն ավարտված են');
  }
}

function openSummaryModal(subtitle) {
  const deck = getCurrentDeck();
  const correct = state.statuses.filter((s) => s === 'correct').length;
  const wrong = state.statuses.filter((s) => s === 'wrong').length;
  const revealed = state.statuses.filter((s) => s === 'revealed').length;

  el.summarySubtitle.textContent = subtitle;
  el.sumCorrect.textContent = String(correct);
  el.sumWrong.textContent = String(wrong);
  el.sumRevealed.textContent = String(revealed);

  el.summaryList.innerHTML = '';
  deck.items.forEach((item, idx) => {
    const status = state.statuses[idx];
    const row = document.createElement('div');
    row.className = 'summary-row';

    const left = document.createElement('div');
    left.className = 'summary-row-left';

    const badge = document.createElement('span');
    badge.className = `summary-badge status-${status}`;
    badge.textContent = item.badge;

    const words = document.createElement('span');
    words.className = 'summary-words';
    words.textContent = `${item.esAnswer} — ${item.amAnswer}`;

    left.append(badge, words);

    const statusSpan = document.createElement('span');
    statusSpan.className = 'summary-status-label';
    statusSpan.textContent = getStatusLabel(status).split(' · ')[0];

    row.append(left, statusSpan);
    el.summaryList.appendChild(row);
  });

  el.summaryModal.hidden = false;
}

function advanceAfterAction() {
  const nextIdx = findNextUnresolvedIndex(state.currentIndex);
  if (nextIdx !== -1) {
    selectQuestion(nextIdx);
  } else {
    renderAll();
  }
}

// Event Listeners
el.deckTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const idx = Number(tab.dataset.deck);
    initDeck(idx);
  });
});

// Click on Spanish question -> open/toggle Armenian translation
el.btnSpanishQuestion.addEventListener('click', () => {
  state.translationOpen = !state.translationOpen;
  playTone('reveal');
  renderAll();
});

// Separate "Ver respuesta" button -> toggles answer reveal box
el.btnRevealAnswer.addEventListener('click', () => {
  state.answerOpen = !state.answerOpen;
  if (state.answerOpen && state.statuses[state.currentIndex] === 'pending') {
    state.statuses[state.currentIndex] = 'revealed';
  }
  playTone('reveal');
  renderAll();
});

// Submit typed Spanish answer
el.answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const raw = el.answerInput.value;
  if (!raw.trim()) {
    el.answerInput.focus();
    return;
  }

  const deck = getCurrentDeck();
  const item = deck.items[state.currentIndex];
  const userNorm = normalizeKeepEnye(raw);
  const expectedNorm = normalizeKeepEnye(item.esAnswer);
  const userLoose = normalizeSpanish(raw);
  const expectedLoose = normalizeSpanish(item.esAnswer);

  if (userNorm === expectedNorm || userLoose === expectedLoose) {
    state.statuses[state.currentIndex] = 'correct';
    state.answerOpen = true;
    state.feedback = {
      type: 'correct',
      text: `¡Correcto! ${item.esAnswer} — ${item.amAnswer}`,
    };
    playTone('correct');
    renderAll();
    setTimeout(() => {
      if (state.statuses[state.currentIndex] === 'correct') {
        advanceAfterAction();
      }
    }, 950);
  } else {
    state.statuses[state.currentIndex] = 'wrong';
    state.answerOpen = true;
    state.feedback = {
      type: 'wrong',
      text: `Incorrecto. La respuesta correcta es: ${item.esAnswer} — ${item.amAnswer}`,
    };
    playTone('wrong');
    renderAll();
  }
});

// Pasapalabra (skip)
el.btnPasapalabra.addEventListener('click', () => {
  const currStatus = state.statuses[state.currentIndex];
  if (currStatus === 'pending' || currStatus === 'revealed') {
    state.statuses[state.currentIndex] = 'skipped';
  }
  playTone('skip');
  const nextIdx = findNextUnresolvedIndex(state.currentIndex);
  if (nextIdx !== -1 && nextIdx !== state.currentIndex) {
    selectQuestion(nextIdx);
  } else {
    // Move one step forward even if only current remains
    const total = getCurrentDeck().items.length;
    selectQuestion((state.currentIndex + 1) % total);
  }
});

// Self-grading buttons inside Answer Reveal
el.btnMarkCorrect.addEventListener('click', () => {
  state.statuses[state.currentIndex] = 'correct';
  playTone('correct');
  advanceAfterAction();
});

el.btnMarkWrong.addEventListener('click', () => {
  state.statuses[state.currentIndex] = 'wrong';
  playTone('wrong');
  advanceAfterAction();
});

// Prev / Next arrows
el.btnPrev.addEventListener('click', () => {
  const total = getCurrentDeck().items.length;
  selectQuestion((state.currentIndex - 1 + total) % total);
});

el.btnNext.addEventListener('click', () => {
  const total = getCurrentDeck().items.length;
  selectQuestion((state.currentIndex + 1) % total);
});

// Reset
el.btnReset.addEventListener('click', () => {
  initDeck(state.deckIndex);
});

// Timer & Sound toggles
el.btnTimerToggle.addEventListener('click', () => {
  state.timerEnabled = !state.timerEnabled;
  state.secondsLeft = TOTAL_TIMER_SECONDS;
  if (state.timerEnabled) {
    startTimer();
  } else {
    stopTimer();
  }
  renderAll();
});

el.btnSoundToggle.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled) playTone('reveal');
  renderAll();
});

// Summary Modal controls
el.btnCloseSummary.addEventListener('click', () => {
  state.summaryDismissed = true;
  el.summaryModal.hidden = true;
});

el.btnSummaryReview.addEventListener('click', () => {
  state.summaryDismissed = true;
  el.summaryModal.hidden = true;
});

el.btnPlayAgain.addEventListener('click', () => {
  initDeck(state.deckIndex);
});

// Keyboard shortcuts when not focused on text input
document.addEventListener('keydown', (e) => {
  if (document.activeElement === el.answerInput) return;
  if (!el.summaryModal.hidden && e.key === 'Escape') {
    state.summaryDismissed = true;
    el.summaryModal.hidden = true;
    return;
  }
  if (e.key === 'ArrowRight') {
    const total = getCurrentDeck().items.length;
    selectQuestion((state.currentIndex + 1) % total);
  } else if (e.key === 'ArrowLeft') {
    const total = getCurrentDeck().items.length;
    selectQuestion((state.currentIndex - 1 + total) % total);
  }
});

window.addEventListener('resize', positionRoscoTiles);

// Boot
initDeck(0);
