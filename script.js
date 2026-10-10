/**
 * OmniCalc Pro - Advanced Logic, Scientific Math Parser & Rich Interactions
 */

(() => {
  'use strict';

  // --- State Variables ---
  let expression = '';       // Formula string shown in upper display
  let currentInput = '0';     // Current number/token being entered
  let resultCalculated = false;
  let angleMode = 'DEG';     // 'DEG' or 'RAD'
  let memoryValue = 0;       // Stored memory value
  let soundEnabled = true;   // Audio feedback toggle
  let history = [];          // List of past calculations

  // --- Audio Synthesizer (Web Audio API) ---
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
  }

  function playSound(type = 'click') {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'equals') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(680, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'clear') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {
      // Audio autoplay or browser context restriction gracefully ignored
    }
  }

  // --- DOM Elements ---
  const expressionDisplay = document.getElementById('expressionDisplay');
  const resultDisplay = document.getElementById('resultDisplay');
  const angleBadge = document.getElementById('angleBadge');
  const angleToggleBtn = document.getElementById('angleToggleBtn');
  const memoryBadge = document.getElementById('memoryBadge');
  const modeToggle = document.getElementById('modeToggle');
  const calcWrapper = document.querySelector('.calculator-wrapper');
  const soundToggle = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const historyToggle = document.getElementById('historyToggle');
  const historyDrawer = document.getElementById('historyDrawer');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyList = document.getElementById('historyList');
  const copyBtn = document.getElementById('copyBtn');
  const toastNotification = document.getElementById('toastNotification');
  const themePickerBtn = document.getElementById('themePickerBtn');
  const themeMenu = document.getElementById('themeMenu');

  // --- Display Refresh Functions ---
  function updateDisplay() {
    expressionDisplay.textContent = expression;
    resultDisplay.textContent = currentInput || '0';

    // Auto adjust font size if text gets too long
    const len = (currentInput || '').length;
    if (len > 14) {
      resultDisplay.style.fontSize = '1.6rem';
    } else if (len > 10) {
      resultDisplay.style.fontSize = '2.1rem';
    } else {
      resultDisplay.style.fontSize = '';
    }
  }

  function showToast(msg) {
    if (!toastNotification) return;
    toastNotification.textContent = msg;
    toastNotification.classList.add('show');
    setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 2200);
  }

  // --- Mathematical Helpers ---
  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // Prevent overflow
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  function cleanNumber(num) {
    if (isNaN(num)) return 'Error';
    if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
    // Fix floating point quirks like 0.1 + 0.2 = 0.30000000000000004
    const rounded = Number(Math.round(num + 'e+12') + 'e-12');
    return rounded.toString();
  }

  // --- Safe Mathematical Parser ---
  function evaluateMath(rawExp) {
    let sanitized = rawExp
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/mod/g, '%');

    // Convert angle helper for trig
    const toRad = angleMode === 'DEG' ? (val) => (val * Math.PI) / 180 : (val) => val;
    const fromRad = angleMode === 'DEG' ? (val) => (val * 180) / Math.PI : (val) => val;

    // Create safe calculation context
    const scope = {
      sin: (x) => Math.sin(toRad(x)),
      cos: (x) => Math.cos(toRad(x)),
      tan: (x) => {
        const rad = toRad(x);
        if (Math.abs(Math.cos(rad)) < 1e-15) return NaN;
        return Math.tan(rad);
      },
      asin: (x) => fromRad(Math.asin(x)),
      acos: (x) => fromRad(Math.acos(x)),
      atan: (x) => fromRad(Math.atan(x)),
      ln: (x) => Math.log(x),
      log: (x) => Math.log10(x),
      sqrt: (x) => Math.sqrt(x),
      cbrt: (x) => Math.cbrt(x),
      sq: (x) => Math.pow(x, 2),
      cube: (x) => Math.pow(x, 3),
      fact: (x) => factorial(x),
      abs: (x) => Math.abs(x),
      reciprocal: (x) => 1 / x,
      pi: Math.PI,
      e: Math.E,
      pow: (x, y) => Math.pow(x, y),
    };

    // Replace power operator x ^ y with Math.pow
    sanitized = sanitized.replace(/(\d+(\.\d+)?|\bpi\b|\be\b)\s*\^\s*(\d+(\.\d+)?|\bpi\b|\be\b)/g, 'pow($1, $3)');

    // Only allow valid safe mathematical characters
    if (/[^0-9a-zA-Z_+\-*/().,%^ ]/.test(sanitized)) {
      throw new Error('Invalid input');
    }

    // Function constructor execution inside safe scope
    const keys = Object.keys(scope);
    const vals = Object.values(scope);
    const func = new Function(...keys, `return (${sanitized});`);
    const evalRes = func(...vals);
    return cleanNumber(evalRes);
  }

  // --- Input Handlers ---
  function handleNumber(numStr) {
    playSound('click');
    if (resultCalculated) {
      currentInput = numStr;
      expression = '';
      resultCalculated = false;
    } else {
      if (currentInput === '0' && numStr !== '.') {
        currentInput = numStr;
      } else {
        currentInput += numStr;
      }
    }
    updateDisplay();
  }

  function handleDot() {
    playSound('click');
    if (resultCalculated) {
      currentInput = '0.';
      expression = '';
      resultCalculated = false;
      updateDisplay();
      return;
    }
    if (!currentInput.includes('.')) {
      currentInput += '.';
      updateDisplay();
    }
  }

  function handleOperator(op) {
    playSound('click');
    if (resultCalculated) {
      expression = currentInput + ' ' + op + ' ';
      currentInput = '0';
      resultCalculated = false;
    } else {
      if (currentInput !== '' && currentInput !== '0') {
        expression += (expression ? '' : '') + currentInput + ' ' + op + ' ';
        currentInput = '0';
      } else if (expression !== '') {
        // Replace last operator if already present
        expression = expression.trim().replace(/[+\-×÷%^]$/, op) + ' ';
      }
    }
    updateDisplay();
  }

  function handleEquals() {
    if (expression === '' && !resultCalculated) {
      playSound('click');
      return;
    }

    try {
      const fullExpression = expression + (currentInput !== '0' ? currentInput : '');
      const evaluated = evaluateMath(fullExpression);

      if (evaluated === 'Error' || isNaN(Number(evaluated)) && evaluated !== 'Infinity' && evaluated !== '-Infinity') {
        playSound('error');
        currentInput = 'Error';
      } else {
        playSound('equals');
        // Add to history
        addHistory(fullExpression, evaluated);
        currentInput = evaluated;
        expression = '';
        resultCalculated = true;
      }
    } catch {
      playSound('error');
      currentInput = 'Error';
    }
    updateDisplay();
  }

  function handleClear() {
    playSound('clear');
    expression = '';
    currentInput = '0';
    resultCalculated = false;
    updateDisplay();
  }

  function handleBackspace() {
    playSound('click');
    if (resultCalculated) {
      handleClear();
      return;
    }
    if (currentInput.length > 1) {
      currentInput = currentInput.slice(0, -1);
    } else {
      currentInput = '0';
    }
    updateDisplay();
  }

  function handleNegate() {
    playSound('click');
    if (currentInput === '0' || currentInput === 'Error') return;
    if (currentInput.startsWith('-')) {
      currentInput = currentInput.slice(1);
    } else {
      currentInput = '-' + currentInput;
    }
    updateDisplay();
  }

  function handlePercent() {
    playSound('click');
    const val = parseFloat(currentInput);
    if (!isNaN(val)) {
      currentInput = cleanNumber(val / 100);
      updateDisplay();
    }
  }

  function handleScientificFunction(funcName) {
    playSound('click');
    const val = parseFloat(currentInput);

    if (funcName === 'sqrt') {
      if (val < 0) {
        playSound('error');
        currentInput = 'Error';
      } else {
        currentInput = cleanNumber(Math.sqrt(val));
      }
    } else if (funcName === 'cbrt') {
      currentInput = cleanNumber(Math.cbrt(val));
    } else if (funcName === 'sq') {
      currentInput = cleanNumber(Math.pow(val, 2));
    } else if (funcName === 'cube') {
      currentInput = cleanNumber(Math.pow(val, 3));
    } else if (funcName === 'reciprocal') {
      if (val === 0) {
        playSound('error');
        currentInput = 'Cannot divide by 0';
      } else {
        currentInput = cleanNumber(1 / val);
      }
    } else if (funcName === 'fact') {
      if (val < 0 || !Number.isInteger(val)) {
        playSound('error');
        currentInput = 'Error';
      } else {
        currentInput = cleanNumber(factorial(val));
      }
    } else if (funcName === 'abs') {
      currentInput = cleanNumber(Math.abs(val));
    } else if (funcName === 'ln') {
      if (val <= 0) {
        playSound('error');
        currentInput = 'Error';
      } else {
        currentInput = cleanNumber(Math.log(val));
      }
    } else if (funcName === 'log') {
      if (val <= 0) {
        playSound('error');
        currentInput = 'Error';
      } else {
        currentInput = cleanNumber(Math.log10(val));
      }
    } else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].includes(funcName)) {
      try {
        const toRad = angleMode === 'DEG' ? (v) => (v * Math.PI) / 180 : (v) => v;
        const fromRad = angleMode === 'DEG' ? (v) => (v * 180) / Math.PI : (v) => v;

        if (funcName === 'sin') currentInput = cleanNumber(Math.sin(toRad(val)));
        if (funcName === 'cos') currentInput = cleanNumber(Math.cos(toRad(val)));
        if (funcName === 'tan') {
          const rad = toRad(val);
          if (Math.abs(Math.cos(rad)) < 1e-15) currentInput = 'Error';
          else currentInput = cleanNumber(Math.tan(rad));
        }
        if (funcName === 'asin') {
          if (val < -1 || val > 1) currentInput = 'Error';
          else currentInput = cleanNumber(fromRad(Math.asin(val)));
        }
        if (funcName === 'acos') {
          if (val < -1 || val > 1) currentInput = 'Error';
          else currentInput = cleanNumber(fromRad(Math.acos(val)));
        }
        if (funcName === 'atan') currentInput = cleanNumber(fromRad(Math.atan(val)));
      } catch {
        currentInput = 'Error';
      }
    }
    resultCalculated = true;
    updateDisplay();
  }

  function handleConstant(c) {
    playSound('click');
    if (c === 'π') {
      currentInput = cleanNumber(Math.PI);
    } else if (c === 'e') {
      currentInput = cleanNumber(Math.E);
    }
    resultCalculated = false;
    updateDisplay();
  }

  function handleParenthesis(p) {
    playSound('click');
    if (currentInput !== '0' && !resultCalculated) {
      expression += currentInput + p;
      currentInput = '0';
    } else {
      expression += p;
    }
    updateDisplay();
  }

  // --- Memory Operations ---
  function handleMemory(action) {
    playSound('click');
    const val = parseFloat(currentInput) || 0;

    switch (action) {
      case 'MC':
        memoryValue = 0;
        showToast('Memory Cleared');
        break;
      case 'MR':
        currentInput = cleanNumber(memoryValue);
        resultCalculated = false;
        showToast(`Memory Recalled: ${memoryValue}`);
        break;
      case 'M+':
        memoryValue += val;
        showToast(`Added to Memory (+${val})`);
        break;
      case 'M-':
        memoryValue -= val;
        showToast(`Subtracted from Memory (-${val})`);
        break;
      case 'MS':
        memoryValue = val;
        showToast(`Stored in Memory: ${memoryValue}`);
        break;
    }

    if (memoryBadge) {
      memoryBadge.style.display = memoryValue !== 0 ? 'inline-block' : 'none';
    }
    updateDisplay();
  }

  // --- Angle Mode Toggle (DEG / RAD) ---
  function toggleAngleMode() {
    playSound('click');
    angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
    if (angleBadge) angleBadge.textContent = angleMode;
    if (angleToggleBtn) angleToggleBtn.textContent = angleMode;
    showToast(`Angle Mode: ${angleMode}`);
  }

  // --- Calculation History Management ---
  function loadHistory() {
    try {
      const stored = localStorage.getItem('omniCalcHistory');
      if (stored) {
        history = JSON.parse(stored);
        renderHistory();
      }
    } catch {
      history = [];
    }
  }

  function addHistory(exp, res) {
    const item = { exp, res, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    history.unshift(item);
    if (history.length > 30) history.pop();
    try {
      localStorage.setItem('omniCalcHistory', JSON.stringify(history));
    } catch {
      // Storage error ignored
    }
    renderHistory();
  }

  function renderHistory() {
    if (!historyList) return;
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <span class="empty-icon">📭</span>
          <p>No calculations yet.</p>
          <small>Do some math, and your calculations will show up here!</small>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.map((item, idx) => `
      <div class="history-item" data-idx="${idx}" title="Click to reuse this calculation">
        <div class="history-item-exp">${item.exp} =</div>
        <div class="history-item-res">${item.res}</div>
      </div>
    `).join('');

    // Attach click listeners to reload item
    historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = el.getAttribute('data-idx');
        const selected = history[idx];
        if (selected) {
          playSound('click');
          currentInput = selected.res;
          expression = '';
          resultCalculated = true;
          updateDisplay();
          historyDrawer.classList.remove('open');
          showToast('Loaded calculation into display');
        }
      });
    });
  }

  function clearHistory() {
    playSound('clear');
    history = [];
    try {
      localStorage.removeItem('omniCalcHistory');
    } catch {}
    renderHistory();
    showToast('History Cleared');
  }

  // --- Clipboard Copy ---
  async function copyCurrentResult() {
    playSound('click');
    const textToCopy = currentInput;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(`Copied "${textToCopy}" to clipboard! ✨`);
    } catch {
      showToast('Could not copy to clipboard.');
    }
  }

  // --- Theme Controller ---
  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('omniCalcTheme', theme);
    } catch {}

    // Update active class in menu
    document.querySelectorAll('.theme-opt').forEach(opt => {
      if (opt.getAttribute('data-set-theme') === theme) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }

  function initTheme() {
    try {
      const savedTheme = localStorage.getItem('omniCalcTheme') || 'aurora';
      setTheme(savedTheme);
    } catch {
      setTheme('aurora');
    }
  }

  // --- Event Listeners Initialization ---
  function initListeners() {
    // Keypad Click Delegation
    const keypad = document.getElementById('keypad');
    if (keypad) {
      keypad.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        // Visual press bounce
        target.classList.add('pressed-active');
        setTimeout(() => target.classList.remove('pressed-active'), 120);

        const num = target.getAttribute('data-num');
        const action = target.getAttribute('data-action');
        const val = target.getAttribute('data-val');

        if (num !== null) {
          handleNumber(num);
        } else if (action === 'dot') {
          handleDot();
        } else if (action === 'op') {
          handleOperator(val);
        } else if (action === 'equals') {
          handleEquals();
        } else if (action === 'clear') {
          handleClear();
        } else if (action === 'backspace') {
          handleBackspace();
        } else if (action === 'negate') {
          handleNegate();
        } else if (action === 'percent') {
          handlePercent();
        } else if (action === 'func') {
          handleScientificFunction(val);
        } else if (action === 'const') {
          handleConstant(val);
        } else if (action === 'paren') {
          handleParenthesis(val);
        } else if (action === 'toggleAngle') {
          toggleAngleMode();
        }
      });
    }

    // Memory Buttons
    document.querySelectorAll('.mem-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memType = btn.getAttribute('data-mem');
        handleMemory(memType);
      });
    });

    // Angle Badge Click
    if (angleBadge) {
      angleBadge.addEventListener('click', toggleAngleMode);
      angleBadge.style.cursor = 'pointer';
    }

    // Mode Toggle (Standard vs Scientific)
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        playSound('click');
        const isSci = calcWrapper.classList.toggle('mode-scientific');
        modeToggle.classList.toggle('active-sci', isSci);
        showToast(isSci ? 'Scientific Mode Activated 🔬' : 'Standard Mode Activated 📱');
      });
    }

    // Sound Toggle
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        if (soundEnabled) playSound('click');
        showToast(soundEnabled ? 'Sound Effects Enabled 🔊' : 'Muted 🔇');
      });
    }

    // History Toggle & Drawer
    if (historyToggle && historyDrawer) {
      historyToggle.addEventListener('click', () => {
        playSound('click');
        historyDrawer.classList.toggle('open');
      });
    }

    if (closeHistoryBtn && historyDrawer) {
      closeHistoryBtn.addEventListener('click', () => {
        playSound('click');
        historyDrawer.classList.remove('open');
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', clearHistory);
    }

    // Copy Button
    if (copyBtn) {
      copyBtn.addEventListener('click', copyCurrentResult);
    }

    // Theme Picker Dropdown
    if (themePickerBtn && themeMenu) {
      themePickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('click');
        themeMenu.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!themeMenu.contains(e.target) && e.target !== themePickerBtn) {
          themeMenu.classList.remove('show');
        }
      });

      themeMenu.querySelectorAll('.theme-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          playSound('click');
          const themeName = opt.getAttribute('data-set-theme');
          setTheme(themeName);
          themeMenu.classList.remove('show');
          showToast(`Theme: ${opt.innerText.trim()}`);
        });
      });
    }

    // Physical Keyboard Support
    window.addEventListener('keydown', (e) => {
      // Prevent browser default on certain keys like / or ' or backspace in certain browsers
      if (['/', '*', '-', '+', 'Enter', '=', 'Backspace', 'Escape'].includes(e.key)) {
        // e.preventDefault();
      }

      // Highlight corresponding visual button if found
      let matchingBtn = null;

      if (e.key >= '0' && e.key <= '9') {
        matchingBtn = document.querySelector(`.btn-num[data-num="${e.key}"]`);
        handleNumber(e.key);
      } else if (e.key === '.') {
        matchingBtn = document.querySelector(`.btn[data-action="dot"]`);
        handleDot();
      } else if (e.key === '+') {
        matchingBtn = document.querySelector(`.btn-operator[data-val="+"]`);
        handleOperator('+');
      } else if (e.key === '-') {
        matchingBtn = document.querySelector(`.btn-operator[data-val="−"]`);
        handleOperator('−');
      } else if (e.key === '*') {
        matchingBtn = document.querySelector(`.btn-operator[data-val="×"]`);
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        matchingBtn = document.querySelector(`.btn-operator[data-val="÷"]`);
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        matchingBtn = document.querySelector(`.btn-equals`);
        handleEquals();
      } else if (e.key === 'Backspace') {
        matchingBtn = document.querySelector(`.btn[data-action="backspace"]`);
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        matchingBtn = document.querySelector(`.btn-clear`);
        handleClear();
      } else if (e.key === '%') {
        matchingBtn = document.querySelector(`.btn[data-action="percent"]`);
        handlePercent();
      } else if (e.key === '(' || e.key === ')') {
        matchingBtn = document.querySelector(`.btn[data-action="paren"][data-val="${e.key}"]`);
        handleParenthesis(e.key);
      } else if (e.key === '^') {
        matchingBtn = document.querySelector(`.btn[data-action="op"][data-val="^"]`);
        handleOperator('^');
      }

      if (matchingBtn) {
        matchingBtn.classList.add('pressed-active');
        setTimeout(() => matchingBtn.classList.remove('pressed-active'), 120);
      }
    });
  }

  // --- Initial Setup on Page Load ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadHistory();
    initListeners();
    updateDisplay();
  });
})();
