/* =========================================================
   NAWY
   APP.JS
   ========================================================= */

"use strict";


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "nawy_tasks_v4";


/* =========================================================
   DOM
   ========================================================= */

const taskInput =
    document.getElementById("taskInput");

const submitBtn =
    document.getElementById("submitBtn");

const composerForm =
    document.getElementById("composerForm");

const tasksContainer =
    document.getElementById("tasksContainer");

const progressFill =
    document.getElementById("progressFill");

const progressText =
    document.getElementById("progressText");

const currentDate =
    document.getElementById("currentDate");

const installOverlay =
    document.getElementById("installOverlay");

const installBtn =
    document.getElementById("installBtn");

const installClose =
    document.getElementById("installClose");

const installGuide =
    document.getElementById("installGuide");

const guideClose =
    document.getElementById("guideClose");


/* =========================================================
   STATE
   ========================================================= */

let tasks = loadTasks();

let deferredInstallPrompt = null;


/* =========================================================
   DATE
   ========================================================= */

function updateDate() {

    const formatter =
        new Intl.DateTimeFormat(
            "ar-EG",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        );

    currentDate.textContent =
        formatter.format(new Date());
}


/* =========================================================
   STORAGE
   ========================================================= */

function loadTasks() {

    try {

        const current =
            JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            );

        if (Array.isArray(current)) {
            return normalizeTasks(current);
        }


        /*
           دعم النسخة السابقة
        */

        const old =
            JSON.parse(
                localStorage.getItem("nawy_tasks_v3")
            );

        if (Array.isArray(old)) {
            return normalizeTasks(old);
        }

        return [];

    } catch (error) {

        console.warn(
            "Nawy storage error:",
            error
        );

        return [];
    }
}


function normalizeTasks(list) {

    return list
        .filter(item => item && typeof item === "object")
        .map(item => ({
            id:
                String(
                    item.id ||
                    `${Date.now()}-${Math.random()}`
                ),

            text:
                String(item.text || "").trim(),

            completed:
                Boolean(item.completed),

            starred:
                Boolean(item.starred),

            createdAt:
                item.createdAt ||
                new Date().toISOString()
        }))
        .filter(item => item.text.length > 0);
}


function save() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tasks)
        );

    } catch (error) {

        console.warn(
            "Nawy save error:",
            error
        );
    }

    render();
}


/* =========================================================
   TASK ACTIONS
   ========================================================= */

function addTask(text) {

    const clean =
        String(text || "").trim();

    if (!clean) {
        return;
    }

    const newTask = {

        id:
            `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        text: clean,

        completed: false,

        starred: false,

        createdAt:
            new Date().toISOString()
    };


    tasks.unshift(newTask);

    save();
}


function toggleTask(id) {

    const task =
        tasks.find(
            item => item.id === id
        );

    if (!task) {
        return;
    }

    task.completed =
        !task.completed;

    save();
}


function toggleStar(id) {

    const task =
        tasks.find(
            item => item.id === id
        );

    if (!task) {
        return;
    }

    task.starred =
        !task.starred;

    save();
}


function deleteTask(id) {

    tasks =
        tasks.filter(
            item => item.id !== id
        );

    save();
}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress() {

    const total =
        tasks.length;

    const done =
        tasks.filter(
            item => item.completed
        ).length;


    if (total === 0) {

        progressFill.style.width = "0%";

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
            "كملت كل نواياك 🎉";

    } else if (done === 0) {

        progressText.textContent =
            `${total} ${total === 1 ? "نية" : "نوايا"}`;

    } else {

        progressText.textContent =
            `${done} من ${total} أُنجزت`;
    }
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

    updateProgress();

    tasksContainer.innerHTML = "";


    const activeTasks =
        tasks
            .filter(item => !item.completed)
            .sort(
                (a, b) =>
                    Number(b.starred) -
                    Number(a.starred)
            );


    const completedTasks =
        tasks.filter(
            item => item.completed
        );


    /* EMPTY */

    if (tasks.length === 0) {

        tasksContainer.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🌱</div>

                <strong>
                    مفيش نوايا هنا
                </strong>

                <span>
                    اكتب أول حاجة ناوي تعملها النهارده.
                </span>
            </div>
        `;

        return;
    }


    /* ACTIVE */

    activeTasks.forEach(task => {

        tasksContainer.appendChild(
            createTaskElement(task)
        );

    });


    /* COMPLETED */

    if (completedTasks.length > 0) {

        const divider =
            document.createElement("div");

        divider.className =
            "completed-divider";

        divider.innerHTML = `
            <span>
                النوايا المحققة
                (${completedTasks.length})
            </span>
        `;

        tasksContainer.appendChild(divider);


        completedTasks.forEach(task => {

            tasksContainer.appendChild(
                createTaskElement(task)
            );

        });
    }
}


/* =========================================================
   TASK ELEMENT
   ========================================================= */

function createTaskElement(task) {

    const el =
        document.createElement("div");

    el.className =
        "task" +
        (task.completed
            ? " completed"
            : "");

    el.dataset.taskId =
        task.id;


    el.innerHTML = `

        <div class="check"
             aria-hidden="true">
        </div>


        <div class="task-main">

            <div class="task-title">
                ${escapeHtml(task.text)}
            </div>

        </div>


        <div class="task-actions">

            <button
                type="button"
                class="icon-btn ${
                    task.starred
                        ? "starred"
                        : ""
                }"
                data-action="star"
                aria-label="${
                    task.starred
                        ? "إلغاء التمييز"
                        : "تمييز"
                }"
            >
                ${
                    task.starred
                        ? "★"
                        : "☆"
                }
            </button>


            <button
                type="button"
                class="icon-btn delete"
                data-action="delete"
                aria-label="حذف النية"
            >
                ×
            </button>

        </div>
    `;


    return el;
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(
            /[&<>"']/g,
            character => {

                const map = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                };

                return map[character];
            }
        );
}


/* =========================================================
   TASK EVENTS
   ========================================================= */

tasksContainer.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".icon-btn"
            );


        /*
           Star / Delete
        */

        if (button) {

            const taskElement =
                button.closest(".task");

            if (!taskElement) {
                return;
            }

            const id =
                taskElement.dataset.taskId;

            const action =
                button.dataset.action;


            if (action === "star") {

                toggleStar(id);

                return;
            }


            if (action === "delete") {

                const confirmed =
                    window.confirm(
                        "هل أنت متأكد من حذف هذه النية؟"
                    );

                if (confirmed) {
                    deleteTask(id);
                }

                return;
            }
        }


        /*
           Complete / Uncomplete
        */

        const taskElement =
            event.target.closest(".task");

        if (!taskElement) {
            return;
        }


        const id =
            taskElement.dataset.taskId;

        if (!id) {
            return;
        }


        toggleTask(id);
    }
);


/* =========================================================
   COMPOSER
   ========================================================= */

function updateComposerState() {

    const hasText =
        taskInput.value.trim().length > 0;

    submitBtn.disabled =
        !hasText;
}


function resizeTextarea() {

    taskInput.style.height = "auto";

    const height =
        Math.min(
            taskInput.scrollHeight,
            130
        );

    taskInput.style.height =
        `${height}px`;
}


taskInput.addEventListener(
    "input",
    () => {

        resizeTextarea();

        updateComposerState();
    }
);


taskInput.addEventListener(
    "keydown",
    event => {

        /*
           Enter = إرسال
           Shift + Enter = سطر جديد
        */

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            handleSend();
        }
    }
);


composerForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        handleSend();
    }
);


function handleSend() {

    const value =
        taskInput.value;

    if (!value.trim()) {
        return;
    }


    addTask(value);


    taskInput.value = "";

    taskInput.style.height =
        "42px";

    updateComposerState();


    /*
       رجّع المؤشر مباشرة
    */

    requestAnimationFrame(() => {

        taskInput.focus();

    });
}


/* =========================================================
   PWA INSTALL
   ========================================================= */

window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredInstallPrompt =
            event;

        /*
           لا نظهر الرسالة فورًا.
           نترك المستخدم يستخدم التطبيق أولًا.
        */

        setTimeout(() => {

            if (
                deferredInstallPrompt &&
                !isStandalone()
            ) {

                installOverlay.classList.add(
                    "show"
                );

                installOverlay.setAttribute(
                    "aria-hidden",
                    "false"
                );
            }

        }, 3500);
    }
);


installBtn.addEventListener(
    "click",
    async () => {

        if (!deferredInstallPrompt) {

            showInstallGuide();

            return;
        }


        try {

            deferredInstallPrompt.prompt();

            await deferredInstallPrompt.userChoice;

        } catch (error) {

            console.warn(
                "Install prompt error:",
                error
            );

        } finally {

            deferredInstallPrompt = null;

            closeInstallOverlay();
        }
    }
);


installClose.addEventListener(
    "click",
    closeInstallOverlay
);


guideClose.addEventListener(
    "click",
    () => {

        installGuide.classList.remove(
            "show"
        );

        installGuide.setAttribute(
            "aria-hidden",
            "true"
        );
    }
);


function closeInstallOverlay() {

    installOverlay.classList.remove(
        "show"
    );

    installOverlay.setAttribute(
        "aria-hidden",
        "true"
    );
}


function showInstallGuide() {

    closeInstallOverlay();

    installGuide.classList.add(
        "show"
    );

    installGuide.setAttribute(
        "aria-hidden",
        "false"
    );
}


function isStandalone() {

    return (
        window.matchMedia(
            "(display-mode: standalone)"
        ).matches ||
        window.navigator.standalone === true
    );
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("./sw.js")
                .catch(error => {

                    console.warn(
                        "Nawy service worker:",
                        error
                    );

                });

        }
    );
}


/* =========================================================
   START
   ========================================================= */

updateDate();

render();

updateComposerState();
