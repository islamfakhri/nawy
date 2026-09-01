(() => {
  "use strict";

  const STORAGE_KEY = "nawy_tasks_v5";
  const LEGACY_KEYS = ["nawy_tasks_v4", "nawy_tasks_v3"];

  const $ = (id) => document.getElementById(id);
  const taskInput = $("taskInput");
  const submitBtn = $("submitBtn");
  const composer = $("composer");
  const tasksContainer = $("tasksContainer");
  const progressFill = $("progressFill");
  const progressText = $("progressText");
  const currentDate = $("currentDate");
  const installOverlay = $("installOverlay");
  const installBtn = $("installBtn");
  const installClose = $("installClose");
  const installGuide = $("installGuide");
  const guideClose = $("guideClose");

  let tasks = loadTasks();
  let deferredInstallPrompt = null;
  let audioContext = null;

  currentDate.textContent = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long", day: "numeric", month: "long"
  }).format(new Date());

  function loadTasks() {
    const keys = [STORAGE_KEY, ...LEGACY_KEYS];
    for (const key of keys) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(value)) return value.map(normalizeTask).filter(Boolean);
      } catch (_) {}
    }
    return [];
  }

  function normalizeTask(t) {
    if (!t || typeof t !== "object" || typeof t.text !== "string") return null;
    return {
      id: String(t.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      text: t.text.trim().slice(0, 500),
      completed: Boolean(t.completed),
      starred: Boolean(t.starred),
      createdAt: t.createdAt || new Date().toISOString()
    };
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (_) {}
    render();
  }

  function addTask(text) {
    const clean = text.trim();
    if (!clean) return;
    tasks.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: clean.slice(0, 500),
      completed: false,
      starred: false,
      createdAt: new Date().toISOString()
    });
    playAddSound();
    save();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    if (task.completed) {
      playCompletionSound();
      requestAnimationFrame(() => showCompletionFeedback(id));
    }
    save();
  }

  function toggleStar(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.starred = !task.starred;
    save();
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
  }

  function updateProgress() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const percentage = total ? Math.round(done / total * 100) : 0;
    progressFill.style.width = `${percentage}%`;
    if (!total) progressText.textContent = "ابدأ أول نية";
    else if (percentage === 100) progressText.textContent = "ما شاء الله! كملت كل نواياك 🎉";
    else progressText.textContent = `${done} من ${total} أُنجزت · ${percentage}%`;
  }

  function render() {
    updateProgress();
    tasksContainer.innerHTML = "";

    const active = tasks.filter(t => !t.completed).sort((a,b) => Number(b.starred) - Number(a.starred));
    const completed = tasks.filter(t => t.completed);

    if (!tasks.length) {
      tasksContainer.innerHTML = `<div class="empty"><div class="empty-icon">🌱</div><strong>مفيش نوايا هنا</strong><span>اكتب أول نية ليومك وابدأ.</span></div>`;
      return;
    }

    active.forEach(t => tasksContainer.appendChild(createTaskElement(t)));
    if (completed.length) {
      const divider = document.createElement("div");
      divider.className = "completed-divider";
      const span = document.createElement("span");
      span.textContent = `النوايا المحققة (${completed.length})`;
      divider.appendChild(span);
      tasksContainer.appendChild(divider);
      completed.forEach(t => tasksContainer.appendChild(createTaskElement(t)));
    }
  }

  function createTaskElement(task) {
    const el = document.createElement("div");
    el.className = `task${task.completed ? " completed" : ""}`;
    el.dataset.taskId = task.id;

    const check = document.createElement("div");
    check.className = "check";
    check.setAttribute("aria-hidden", "true");

    const main = document.createElement("div");
    main.className = "task-main";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.text;
    main.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const star = document.createElement("button");
    star.type = "button";
    star.className = `icon-btn${task.starred ? " starred" : ""}`;
    star.dataset.action = "star";
    star.setAttribute("aria-label", task.starred ? "إلغاء التمييز" : "تمييز بنجمة");
    star.textContent = task.starred ? "★" : "☆";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn delete";
    del.dataset.action = "delete";
    del.setAttribute("aria-label", "حذف النية");
    del.textContent = "×";

    actions.append(star, del);
    el.append(check, main, actions);
    return el;
  }

  tasksContainer.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-action]");
    const taskEl = e.target.closest(".task");
    if (!taskEl) return;
    const id = taskEl.dataset.taskId;
    if (!id) return;

    if (button) {
      if (button.dataset.action === "star") toggleStar(id);
      if (button.dataset.action === "delete" && confirm("هل أنت متأكد من حذف هذه النية؟")) deleteTask(id);
      return;
    }
    toggleTask(id);
  });

  function resizeInput() {
    taskInput.style.height = "auto";
    taskInput.style.height = `${Math.min(taskInput.scrollHeight, 132)}px`;
    const hasText = taskInput.value.trim().length > 0;
    submitBtn.disabled = !hasText;
    submitBtn.classList.toggle("active", hasText);
  }

  taskInput.addEventListener("input", resizeInput);
  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitFromComposer();
    }
  });
  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    submitFromComposer();
  });

  function submitFromComposer() {
    const value = taskInput.value;
    if (!value.trim()) return;
    addTask(value);
    taskInput.value = "";
    resizeInput();
    taskInput.focus({ preventScroll: true });
  }

  function ensureAudioContext() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioContext || audioContext.state === "closed") audioContext = new Ctx();
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    } catch (_) { return null; }
  }

  function playTone(frequency, duration, volume, type = "sine", endFrequency = null) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);
      if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration * .8);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + duration + .01);
    } catch (_) {}
  }

  function playAddSound() { playTone(430, .12, .055, "sine", 680); }
  function playCompletionSound() {
    playTone(1046.5, .34, .06, "triangle");
    setTimeout(() => playTone(1318.5, .22, .035, "triangle"), 35);
  }

  function showCompletionFeedback(id) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const taskEl = document.querySelector(`[data-task-id="${CSS.escape(id)}"]`);
    const check = taskEl?.querySelector(".check");
    if (!check) return;
    const rect = check.getBoundingClientRect();
    const burst = document.createElement("div");
    burst.className = "completion-burst";
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;
    const colors = ["#19c58b", "#f4c84d", "#f4f7f5"];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement("span");
      p.style.setProperty("--angle", `${i * 30}deg`);
      p.style.setProperty("--color", colors[i % colors.length]);
      p.style.setProperty("--distance", `${29 + (i % 3) * 7}px`);
      p.style.setProperty("--size", `${4 + (i % 2)}px`);
      burst.appendChild(p);
    }
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 600);
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!localStorage.getItem("nawy_install_dismissed")) {
      installOverlay.classList.add("show");
      installOverlay.setAttribute("aria-hidden", "false");
    }
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      closeInstall();
      installGuide.classList.add("show");
      installGuide.setAttribute("aria-hidden", "false");
      return;
    }
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch (_) {}
    deferredInstallPrompt = null;
    closeInstall();
  });

  function closeInstall() {
    installOverlay.classList.remove("show");
    installOverlay.setAttribute("aria-hidden", "true");
    try { localStorage.setItem("nawy_install_dismissed", "1"); } catch (_) {}
  }
  installClose.addEventListener("click", closeInstall);
  guideClose.addEventListener("click", () => {
    installGuide.classList.remove("show");
    installGuide.setAttribute("aria-hidden", "true");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeInstall();
    installGuide.classList.remove("show");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }

  render();
  resizeInput();
})();
