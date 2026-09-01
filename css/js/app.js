(() => {
  "use strict";

  /* =====================================================
     NAWY APP — v5
     الحفاظ على اسم الدالة addTask
  ===================================================== */

  const STORAGE_KEY = "nawy_tasks_v5";

  const LEGACY_KEYS = [
    "nawy_tasks_v4",
    "nawy_tasks_v3"
  ];

  const SOUND_KEY = "nawy_sound_enabled";
  const INSTALL_DISMISSED_KEY = "nawy_install_dismissed";

  const $ = (selector) =>
    document.querySelector(selector);

  const taskInput = $("#taskInput");
  const submitBtn = $("#submitBtn");
  const composerForm = $("#composerForm");
  const tasksContainer = $("#tasksContainer");

  const progressFill = $("#progressFill");
  const progressText = $("#progressText");
  const currentDate = $("#currentDate");

  const soundToggle = $("#soundToggle");

  const toast = $("#toast");
  const toastMessage = $("#toastMessage");
  const toastUndo = $("#toastUndo");

  const installOverlay = $("#installOverlay");
  const installBtn = $("#installBtn");
  const installClose = $("#installClose");

  const installGuide = $("#installGuide");
  const guideClose = $("#guideClose");
  const guideText = $("#guideText");

  const editModal = $("#editModal");
  const editForm = $("#editForm");
  const editInput = $("#editInput");
  const editClose = $("#editClose");
  const editCancel = $("#editCancel");

  let tasks = loadTasks();

  let editingTaskId = null;
  let deletedTask = null;
  let deferredInstallPrompt = null;
  let toastTimer = null;
  let audioContext = null;

  let installHintedAfterTask = false;

  /* =====================================================
     DEVICE HELPERS
  ===================================================== */

  const prefersReducedMotion = () =>
    window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;

  const isStandalone = () =>
    window.matchMedia?.(
      "(display-mode: standalone)"
    )?.matches ||
    window.navigator.standalone === true;

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !window.MSStream;

  /* =====================================================
     DATE
  ===================================================== */

  currentDate.textContent =
    new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(new Date());

  /* =====================================================
     IDS
  ===================================================== */

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  /* =====================================================
     STORAGE
  ===================================================== */

  function normalizeTask(raw) {

    if (
      !raw ||
      typeof raw !== "object"
    ) {
      return null;
    }

    const text =
      typeof raw.text === "string"
        ? raw.text.trim()
        : "";

    if (!text) {
      return null;
    }

    return {
      id: String(
        raw.id || createId()
      ),

      text: text.slice(0, 500),

      completed: Boolean(
        raw.completed
      ),

      starred: Boolean(
        raw.starred
      ),

      createdAt:
        raw.createdAt ||
        new Date().toISOString(),

      completedAt:
        raw.completedAt || null
    };
  }

  function parseTasks(key) {

    try {

      const value =
        JSON.parse(
          localStorage.getItem(key)
        );

      if (!Array.isArray(value)) {
        return null;
      }

      return value
        .map(normalizeTask)
        .filter(Boolean);

    } catch {

      return null;

    }
  }

  function loadTasks() {

    const current =
      parseTasks(STORAGE_KEY);

    if (current) {
      return current;
    }

    for (const key of LEGACY_KEYS) {

      const legacy =
        parseTasks(key);

      if (legacy) {

        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(legacy)
          );
        } catch {}

        return legacy;
      }
    }

    return [];
  }

  function save({
    rerender = true
  } = {}) {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tasks)
      );

    } catch (error) {

      console.warn(
        "Nawy storage error:",
        error
      );
    }

    if (rerender) {
      render();
    }
  }

  /* =====================================================
     SOUND
  ===================================================== */

  function soundEnabled() {

    return (
      localStorage.getItem(
        SOUND_KEY
      ) !== "0"
    );
  }

  function updateSoundButton() {

    const enabled =
      soundEnabled();

    soundToggle.classList.toggle(
      "is-muted",
      !enabled
    );

    soundToggle.innerHTML =
      enabled ? "🔊" : "🔇";

    soundToggle.setAttribute(
      "aria-label",
      enabled
        ? "إيقاف الأصوات"
        : "تشغيل الأصوات"
    );
  }

  function ensureAudioContext() {

    if (!soundEnabled()) {
      return null;
    }

    try {

      const AudioContextCtor =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextCtor) {
        return null;
      }

      if (
        !audioContext ||
        audioContext.state === "closed"
      ) {

        audioContext =
          new AudioContextCtor();
      }

      if (
        audioContext.state ===
        "suspended"
      ) {

        audioContext
          .resume()
          .catch(() => {});
      }

      return audioContext;

    } catch (error) {

      console.warn(
        "Nawy audio error:",
        error
      );

      return null;
    }
  }

  function playTone({
    type = "sine",
    startFrequency,
    endFrequency = startFrequency,
    volume = 0.05,
    duration = 0.1
  }) {

    const ctx =
      ensureAudioContext();

    if (!ctx) {
      return;
    }

    try {

      const now =
        ctx.currentTime;

      const osc =
        ctx.createOscillator();

      const gain =
        ctx.createGain();

      osc.type = type;

      osc.frequency.setValueAtTime(
        startFrequency,
        now
      );

      if (
        endFrequency !==
        startFrequency
      ) {

        osc.frequency.exponentialRampToValueAtTime(
          endFrequency,
          now + duration * .7
        );
      }

      gain.gain.setValueAtTime(
        0.0001,
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        volume,
        now + .008
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + duration
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);

      osc.stop(
        now +
        duration +
        .01
      );

    } catch (error) {

      console.warn(
        "Nawy tone error:",
        error
      );
    }
  }

  function playAddSound() {

    playTone({
      type: "sine",
      startFrequency: 430,
      endFrequency: 680,
      volume: 0.048,
      duration: 0.12
    });
  }

  function playCompletionSound() {

    playTone({
      type: "triangle",
      startFrequency: 1046.5,
      volume: 0.055,
      duration: 0.22
    });

    window.setTimeout(
      () => {

        playTone({
          type: "triangle",
          startFrequency: 1318.5,
          volume: 0.04,
          duration: 0.2
        });

      },
      65
    );
  }

  soundToggle.addEventListener(
    "click",
    () => {

      const next =
        !soundEnabled();

      localStorage.setItem(
        SOUND_KEY,
        next ? "1" : "0"
      );

      updateSoundButton();

      if (next) {
        playAddSound();
      }

    }
  );

  updateSoundButton();

  /* =====================================================
     TASKS
  ===================================================== */

  function maybeSuggestInstallAfterTask() {

    if (
      installHintedAfterTask ||
      isStandalone() ||
      !deferredInstallPrompt ||
      localStorage.getItem(
        INSTALL_DISMISSED_KEY
      ) === "1"
    ) {
      return;
    }

    installHintedAfterTask = true;

    window.setTimeout(() => {

      if (!isStandalone()) {
        showInstallOverlay();
      }

    }, 1400);
  }

  function addTask(text) {

    const clean =
      String(text || "")
        .trim();

    if (!clean) {
      return false;
    }

    tasks.unshift({

      id: createId(),

      text: clean.slice(0, 500),

      completed: false,

      starred: false,

      createdAt:
        new Date().toISOString(),

      completedAt: null

    });

    playAddSound();

    save();

    maybeSuggestInstallAfterTask();

    return true;
  }

  function toggleTask(id) {

    const task =
      tasks.find(
        (item) => item.id === id
      );

    if (!task) {
      return;
    }

    task.completed =
      !task.completed;

    task.completedAt =
      task.completed
        ? new Date().toISOString()
        : null;

    if (task.completed) {

      playCompletionSound();

      render();

      showCompletionFeedback(id);

    } else {

      save();

    }
  }

  function toggleStar(id) {

    const task =
      tasks.find(
        (item) => item.id === id
      );

    if (!task) {
      return;
    }

    task.starred =
      !task.starred;

    save();
  }

  function deleteTask(id) {

    const index =
      tasks.findIndex(
        (item) => item.id === id
      );

    if (index === -1) {
      return;
    }

    deletedTask = {
      task: tasks[index],
      index
    };

    tasks.splice(index, 1);

    save();

    showToast(
      "تم حذف النية"
    );
  }

  function restoreDeletedTask() {

    if (!deletedTask) {
      return;
    }

    const {
      task,
      index
    } = deletedTask;

    tasks.splice(
      Math.min(
        index,
        tasks.length
      ),
      0,
      task
    );

    deletedTask = null;

    save();

    hideToast();
  }

  /* =====================================================
     EDIT
  ===================================================== */

  function openEdit(id) {

    const task =
      tasks.find(
        (item) => item.id === id
      );

    if (!task) {
      return;
    }

    editingTaskId = id;

    editInput.value =
      task.text;

    editModal.hidden = false;

    requestAnimationFrame(() => {

      editInput.focus();

      editInput.setSelectionRange(
        editInput.value.length,
        editInput.value.length
      );

    });
  }

  function closeEdit() {

    editingTaskId = null;

    editModal.hidden = true;
  }

  function saveEdit(text) {

    if (!editingTaskId) {
      return;
    }

    const task =
      tasks.find(
        (item) =>
          item.id ===
          editingTaskId
      );

    if (!task) {
      return;
    }

    const clean =
      String(text || "")
        .trim();

    if (!clean) {
      return;
    }

    task.text =
      clean.slice(0, 500);

    save();

    closeEdit();
  }

  /* =====================================================
     RENDER
  ===================================================== */

  function formatTaskDate(iso) {

    if (!iso) {
      return "";
    }

    try {

      return new Intl.DateTimeFormat(
        "ar-EG",
        {
          hour: "numeric",
          minute: "2-digit"
        }
      ).format(
        new Date(iso)
      );

    } catch {

      return "";

    }
  }

  function updateProgress() {

    const total =
      tasks.length;

    const done =
      tasks.reduce(
        (sum, task) =>
          sum +
          (task.completed
            ? 1
            : 0),
        0
      );

    if (total === 0) {

      progressFill.style.width =
        "0%";

      progressText.textContent =
        "ابدأ أول نية";

      return;
    }

    const percentage =
      Math.round(
        (done / total) * 100
      );

    progressFill.style.width =
      `${percentage}%`;

    if (percentage === 100) {

      progressText.textContent =
        "ما شاء الله! كملت يومك 🎉";

    } else if (done === 0) {

      progressText.textContent =
        `${total} نية اليوم`;

    } else {

      progressText.textContent =
        `${done} من ${total} أُنجزت (${percentage}%)`;
    }
  }

  function sortActive(a, b) {

    if (
      a.starred !==
      b.starred
    ) {

      return (
        Number(b.starred) -
        Number(a.starred)
      );
    }

    return (
      new Date(b.createdAt) -
      new Date(a.createdAt)
    );
  }

  function sortCompleted(a, b) {

    return (
      new Date(
        b.completedAt ||
        b.createdAt
      ) -
      new Date(
        a.completedAt ||
        a.createdAt
      )
    );
  }

  function render() {

    updateProgress();

    tasksContainer.replaceChildren();

    const activeTasks =
      tasks
        .filter(
          (task) =>
            !task.completed
        )
        .sort(sortActive);

    const completedTasks =
      tasks
        .filter(
          (task) =>
            task.completed
        )
        .sort(sortCompleted);

    if (tasks.length === 0) {

      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "empty";

      empty.innerHTML = `
        <div class="empty-icon" aria-hidden="true">
          🌱
        </div>

        <strong>
          لسه مفيش نوايا هنا
        </strong>

        <span>
          اكتب أول حاجة ناوي تعملها وابدأ يومك.
        </span>
      `;

      tasksContainer.appendChild(
        empty
      );

      return;
    }

    activeTasks.forEach(
      (task) => {

        tasksContainer.appendChild(
          createTaskElement(task)
        );

      }
    );

    if (completedTasks.length > 0) {

      const divider =
        document.createElement(
          "div"
        );

      divider.className =
        "completed-divider";

      const span =
        document.createElement(
          "span"
        );

      span.textContent =
        `النوايا المحققة (${completedTasks.length})`;

      divider.appendChild(span);

      tasksContainer.appendChild(
        divider
      );

      completedTasks.forEach(
        (task) => {

          tasksContainer.appendChild(
            createTaskElement(task)
          );

        }
      );
    }
  }

  function createTaskElement(task) {

    const el =
      document.createElement(
        "article"
      );

    el.className =
      `task${
        task.completed
          ? " completed"
          : ""
      }`;

    el.dataset.taskId =
      task.id;

    const check =
      document.createElement(
        "button"
      );

    check.type = "button";

    check.className =
      "check";

    check.dataset.action =
      "toggle";

    check.setAttribute(
      "aria-label",
      task.completed
        ? "إلغاء إنجاز النية"
        : "تحديد النية كمكتملة"
    );

    check.setAttribute(
      "aria-pressed",
      task.completed
        ? "true"
        : "false"
    );

    const main =
      document.createElement(
        "div"
      );

    main.className =
      "task-main";

    const title =
      document.createElement(
        "div"
      );

    title.className =
      "task-title";

    title.textContent =
      task.text;

    main.appendChild(title);

    if (task.completedAt) {

      const meta =
        document.createElement(
          "div"
        );

      meta.className =
        "task-meta";

      meta.textContent =
        `تحققت ${formatTaskDate(
          task.completedAt
        )}`;

      main.appendChild(meta);
    }

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "task-actions";

    const star =
      document.createElement(
        "button"
      );

    star.type = "button";

    star.className =
      `icon-btn${
        task.starred
          ? " starred"
          : ""
      }`;

    star.dataset.action =
      "star";

    star.setAttribute(
      "aria-label",
      task.starred
        ? "إلغاء التمييز"
        : "تمييز بنجمة"
    );

    star.setAttribute(
      "aria-pressed",
      task.starred
        ? "true"
        : "false"
    );

    star.textContent =
      task.starred
        ? "★"
        : "☆";

    const edit =
      document.createElement(
        "button"
      );

    edit.type = "button";

    edit.className =
      "icon-btn";

    edit.dataset.action =
      "edit";

    edit.setAttribute(
      "aria-label",
      "تعديل النية"
    );

    edit.textContent = "✎";

    const remove =
      document.createElement(
        "button"
      );

    remove.type = "button";

    remove.className =
      "icon-btn delete";

    remove.dataset.action =
      "delete";

    remove.setAttribute(
      "aria-label",
      "حذف النية"
    );

    remove.textContent = "×";

    actions.append(
      star,
      edit,
      remove
    );

    el.append(
      check,
      main,
      actions
    );

    return el;
  }

  /* =====================================================
     COMPLETION FEEDBACK
  ===================================================== */

  function showCompletionFeedback(id) {

    if (
      prefersReducedMotion()
    ) {
      return;
    }

    const taskElement =
      tasksContainer.querySelector(
        `[data-task-id="${CSS.escape(id)}"]`
      );

    if (!taskElement) {
      return;
    }

    taskElement.classList.add(
      "just-completed"
    );

    const check =
      taskElement.querySelector(
        ".check"
      );

    if (!check) {
      return;
    }

    const bounds =
      check.getBoundingClientRect();

    const burst =
      document.createElement(
        "div"
      );

    burst.className =
      "completion-burst";

    burst.setAttribute(
      "aria-hidden",
      "true"
    );

    burst.style.left =
      `${
        bounds.left +
        bounds.width / 2
      }px`;

    burst.style.top =
      `${
        bounds.top +
        bounds.height / 2
      }px`;

    const colors = [
      "#19c58b",
      "#f4c84d",
      "#f4f7f5"
    ];

    for (
      let i = 0;
      i < 12;
      i++
    ) {

      const dot =
        document.createElement(
          "span"
        );

      dot.style.setProperty(
        "--angle",
        `${i * 30}deg`
      );

      dot.style.setProperty(
        "--color",
        colors[
          i %
          colors.length
        ]
      );

      dot.style.setProperty(
        "--distance",
        `${29 + (i % 3) * 7}px`
      );

      dot.style.setProperty(
        "--size",
        `${4 + (i % 2)}px`
      );

      burst.appendChild(
        dot
      );
    }

    document.body.appendChild(
      burst
    );

    window.setTimeout(
      () => burst.remove(),
      600
    );
  }

  /* =====================================================
     INPUT
  ===================================================== */

  function resizeComposer() {

    taskInput.style.height =
      "auto";

    taskInput.style.height =
      `${Math.min(
        taskInput.scrollHeight,
        120
      )}px`;
  }

  function updateSubmitState() {

    submitBtn.classList.toggle(
      "active",
      taskInput.value
        .trim()
        .length > 0
    );
  }

  function resetComposer() {

    taskInput.value = "";

    taskInput.style.height =
      "42px";

    updateSubmitState();
  }

  taskInput.addEventListener(
    "input",
    () => {

      resizeComposer();

      updateSubmitState();

    }
  );

  composerForm.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      if (
        addTask(
          taskInput.value
        )
      ) {

        resetComposer();

      }
    }
  );

  taskInput.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        composerForm.requestSubmit();

      }

    }
  );

  /* =====================================================
     EVENT DELEGATION
  ===================================================== */

  tasksContainer.addEventListener(
    "click",
    (event) => {

      const button =
        event.target.closest(
          "button[data-action]"
        );

      const taskEl =
        event.target.closest(
          ".task"
        );

      if (!taskEl) {
        return;
      }

      const id =
        taskEl.dataset.taskId;

      if (!id) {
        return;
      }

      if (button) {

        const action =
          button.dataset.action;

        if (
          action === "toggle"
        ) {

          toggleTask(id);

        } else if (
          action === "star"
        ) {

          toggleStar(id);

        } else if (
          action === "edit"
        ) {

          openEdit(id);

        } else if (
          action === "delete"
        ) {

          deleteTask(id);

        }

        return;
      }

      toggleTask(id);
    }
  );

  /* =====================================================
     EDIT MODAL EVENTS
  ===================================================== */

  editForm.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      saveEdit(
        editInput.value
      );

    }
  );

  editClose.addEventListener(
    "click",
    closeEdit
  );

  editCancel.addEventListener(
    "click",
    closeEdit
  );

  editModal.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        editModal
      ) {

        closeEdit();

      }

    }
  );

  /* =====================================================
     TOAST
  ===================================================== */

  function showToast(message) {

    toastMessage.textContent =
      message;

    toast.classList.add(
      "show"
    );

    window.clearTimeout(
      toastTimer
    );

    toastTimer =
      window.setTimeout(
        () => {

          deletedTask = null;

          hideToast();

        },
        5000
      );
  }

  function hideToast() {

    window.clearTimeout(
      toastTimer
    );

    toast.classList.remove(
      "show"
    );
  }

  toastUndo.addEventListener(
    "click",
    restoreDeletedTask
  );

  /* =====================================================
     INSTALLATION
  ===================================================== */

  function shouldShowInstallPrompt() {

    return (
      !isStandalone() &&
      localStorage.getItem(
        INSTALL_DISMISSED_KEY
      ) !== "1"
    );
  }

  function showInstallOverlay() {

    if (
      !shouldShowInstallPrompt()
    ) {
      return;
    }

    installOverlay.hidden =
      false;
  }

  function closeInstallOverlay(
    remember = true
  ) {

    installOverlay.hidden =
      true;

    if (remember) {

      localStorage.setItem(
        INSTALL_DISMISSED_KEY,
        "1"
      );

    }
  }

  function showManualInstallGuide() {

    const text =
      isIOS()
        ? "على iPhone/iPad: اضغط مشاركة في Safari ثم اختَر إضافة إلى الشاشة الرئيسية عشان تستخدم ناوي كتطبيق."
        : "من قائمة المتصفح اختَر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية عشان تستخدم ناوي كتطبيق.";

    guideText.textContent =
      text;

    installGuide.hidden =
      false;
  }

  window.addEventListener(
    "beforeinstallprompt",
    (event) => {

      event.preventDefault();

      deferredInstallPrompt =
        event;

      window.setTimeout(
        () => {

          if (
            !isStandalone() &&
            !document.hidden
          ) {

            showInstallOverlay();

          }

        },
        9000
      );

    }
  );

  installBtn.addEventListener(
    "click",
    async () => {

      if (!deferredInstallPrompt) {

        closeInstallOverlay(
          false
        );

        showManualInstallGuide();

        return;
      }

      try {

        deferredInstallPrompt.prompt();

        await deferredInstallPrompt.userChoice;

      } catch {}

      deferredInstallPrompt =
        null;

      closeInstallOverlay(
        false
      );
    }
  );

  installClose.addEventListener(
    "click",
    () =>
      closeInstallOverlay(true)
  );

  guideClose.addEventListener(
    "click",
    () => {
      installGuide.hidden =
        true;
    }
  );

  installGuide.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        installGuide
      ) {

        installGuide.hidden =
          true;

      }

    }
  );

  /* =====================================================
     SERVICE WORKER
  ===================================================== */

  if (
    "serviceWorker" in
    navigator
  ) {

    window.addEventListener(
      "load",
      async () => {

        try {

          const registration =
            await navigator.serviceWorker.register(
              "./sw.js",
              {
                scope: "./"
              }
            );

          registration
            .update()
            .catch(() => {});

          document.addEventListener(
            "visibilitychange",
            () => {

              if (
                !document.hidden
              ) {

                registration
                  .update()
                  .catch(() => {});

              }

            }
          );

        } catch (error) {

          console.warn(
            "Nawy Service Worker error:",
            error
          );

        }

      }
    );
  }

  /* =====================================================
     STARTUP
  ===================================================== */

  resizeComposer();

  updateSubmitState();

  render();

  if (
    window.innerWidth >= 760 &&
    !isStandalone()
  ) {

    window.setTimeout(
      () =>
        taskInput.focus(),
      250
    );
  }

  window.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "/" &&
        document.activeElement !== taskInput &&
        document.activeElement !== editInput
      ) {

        event.preventDefault();

        taskInput.focus();

      }

      if (
        event.key === "Escape"
      ) {

        if (
          !editModal.hidden
        ) {

          closeEdit();

        }

        if (
          !installGuide.hidden
        ) {

          installGuide.hidden =
            true;

        }

        if (
          !installOverlay.hidden
        ) {

          closeInstallOverlay(
            false
          );

        }
      }

    }
  );

})();
