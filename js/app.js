/* =====================================================
NAWY — APP.JS
Version: 5.0
===================================================== */

const STORAGE_KEY = "nawy_tasks_v4";

/* =====================================================
ELEMENTS
===================================================== */

const taskInput = document.getElementById("taskInput");
const submitBtn = document.getElementById("submitBtn");

const tasksContainer = document.getElementById("tasksContainer");

const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

const currentDate = document.getElementById("currentDate");

const installOverlay = document.getElementById("installOverlay");
const installBtn = document.getElementById("installBtn");
const installClose = document.getElementById("installClose");

const installGuide = document.getElementById("installGuide");
const guideClose = document.getElementById("guideClose");

/* =====================================================
STATE
===================================================== */

let tasks = loadTasks();

let deferredInstallPrompt = null;

let audioContext = null;

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
STORAGE
===================================================== */

function loadTasks() {

```
try {

    const saved =
        JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

    if (Array.isArray(saved)) {
        return normalizeTasks(saved);
    }


    const old =
        JSON.parse(
            localStorage.getItem("nawy_tasks_v3")
        );

    if (Array.isArray(old)) {
        return normalizeTasks(old);
    }

    return [];

} catch (error) {

    console.warn("Nawy storage error:", error);

    return [];
}
```

}

function normalizeTasks(list) {

```
return list.map(task => ({
    id:
        String(
            task.id ??
            Date.now() + Math.random()
        ),

    text:
        String(task.text ?? ""),

    completed:
        Boolean(task.completed),

    starred:
        Boolean(task.starred),

    createdAt:
        task.createdAt ??
        new Date().toISOString()
}));
```

}

function save() {

```
try {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tasks)
    );

} catch (error) {

    console.warn("Nawy save error:", error);
}

render();
```

}

/* =====================================================
AUDIO
هادئ ونظيف — Chime للإنجاز
===================================================== */

function ensureAudioContext() {

```
try {

    const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContext) {
        return null;
    }

    if (!audioContext) {

        audioContext =
            new AudioContext();
    }

    if (audioContext.state === "suspended") {

        audioContext.resume().catch(() => {});
    }

    return audioContext;

} catch (error) {

    return null;
}
```

}

/*
صوت الإضافة:
خفيف جدًا ومش مزعج
*/

function playAddSound() {

```
try {

    const ctx =
        ensureAudioContext();

    if (!ctx) return;

    const now =
        ctx.currentTime;

    const osc =
        ctx.createOscillator();

    const gain =
        ctx.createGain();

    osc.type = "sine";

    osc.frequency.setValueAtTime(
        480,
        now
    );

    osc.frequency.exponentialRampToValueAtTime(
        620,
        now + .07
    );

    gain.gain.setValueAtTime(
        .0001,
        now
    );

    gain.gain.exponentialRampToValueAtTime(
        .025,
        now + .012
    );

    gain.gain.exponentialRampToValueAtTime(
        .0001,
        now + .10
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);

    osc.stop(now + .11);

} catch (error) {
    // الصوت اختياري ولا يعطل التطبيق
}
```

}

/*
Chime الإنجاز
نغمتان قصيرتان وناعمتان
*/

function playCompletionSound() {

```
try {

    const ctx =
        ensureAudioContext();

    if (!ctx) return;

    const now =
        ctx.currentTime;


    const notes = [
        {
            frequency: 659.25,
            start: 0,
            duration: .20,
            volume: .035
        },
        {
            frequency: 783.99,
            start: .075,
            duration: .30,
            volume: .045
        }
    ];


    notes.forEach(note => {

        const osc =
            ctx.createOscillator();

        const gain =
            ctx.createGain();


        osc.type = "sine";

        osc.frequency.setValueAtTime(
            note.frequency,
            now + note.start
        );


        gain.gain.setValueAtTime(
            .0001,
            now + note.start
        );

        gain.gain.exponentialRampToValueAtTime(
            note.volume,
            now + note.start + .012
        );

        gain.gain.exponentialRampToValueAtTime(
            .0001,
            now + note.start + note.duration
        );


        osc.connect(gain);

        gain.connect(
            ctx.destination
        );


        osc.start(
            now + note.start
        );

        osc.stop(
            now +
            note.start +
            note.duration +
            .02
        );

    });

} catch (error) {
    // الصوت لا يجب أن يؤثر على التطبيق
}
```

}

/* =====================================================
COMPLETION VISUAL
===================================================== */

function showCompletionFeedback(id) {

```
if (
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches
) {
    return;
}


const taskElement =
    document.querySelector(
        `[data-task-id="${CSS.escape(String(id))}"]`
    );


if (!taskElement) {
    return;
}


taskElement.classList.add(
    "just-completed"
);


window.setTimeout(() => {

    taskElement.classList.remove(
        "just-completed"
    );

}, 600);


const checkElement =
    taskElement.querySelector(
        ".check"
    );


if (!checkElement) {
    return;
}


const bounds =
    checkElement.getBoundingClientRect();


const burst =
    document.createElement("div");


burst.className =
    "completion-burst";

burst.setAttribute(
    "aria-hidden",
    "true"
);


burst.style.left =
    (
        bounds.left +
        bounds.width / 2
    ) + "px";


burst.style.top =
    (
        bounds.top +
        bounds.height / 2
    ) + "px";


const particles = [
    "#19c58b",
    "#f4c84d",
    "#f4f7f5"
];


burst.innerHTML =
    Array.from(
        { length: 10 },
        (_, index) => {

            return `
                <span
                    style="
                        --angle:${index * 36}deg;
                        --color:${particles[index % particles.length]};
                        --distance:${28 + (index % 3) * 6}px;
                        --size:${4 + (index % 2)}px;
                    "
                ></span>
            `;
        }
    ).join("");


document.body.appendChild(
    burst
);


window.setTimeout(() => {

    burst.remove();

}, 600);
```

}

/* =====================================================
TASK ACTIONS
===================================================== */

function addTask(text) {

```
const clean =
    text.trim();

if (!clean) {
    return;
}


const newTask = {

    id:
        String(
            Date.now() +
            Math.random()
        ),

    text:
        clean,

    completed:
        false,

    starred:
        false,

    createdAt:
        new Date().toISOString()
};


tasks.unshift(
    newTask
);


playAddSound();

save();
```

}

function toggleTask(id) {

```
const task =
    tasks.find(
        t => String(t.id) === String(id)
    );


if (!task) {
    return;
}


task.completed =
    !task.completed;


if (task.completed) {

    /*
       الصوت والمؤثر بعد التحويل
    */

    playCompletionSound();

    /*
       render يحصل داخل save()
       لذلك نعمل feedback بعد render
    */

    save();

    requestAnimationFrame(() => {

        showCompletionFeedback(
            task.id
        );

    });

    return;
}


save();
```

}

function toggleStar(id) {

```
const task =
    tasks.find(
        t => String(t.id) === String(id)
    );


if (!task) {
    return;
}


task.starred =
    !task.starred;


save();
```

}

function deleteTask(id) {

```
tasks =
    tasks.filter(
        t =>
            String(t.id) !==
            String(id)
    );


save();
```

}

/* =====================================================
PROGRESS
===================================================== */

function updateProgress() {

```
const total =
    tasks.length;

const done =
    tasks.filter(
        t => t.completed
    ).length;


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
    percentage + "%";


if (percentage === 100) {

    progressText.textContent =
        "ما شاء الله! كملت كل نواياك 🎉";

} else {

    progressText.textContent =
        `${done} من ${total} أُنجزت (${percentage}%)`;
}
```

}

/* =====================================================
RENDER
===================================================== */

function render() {

```
updateProgress();

tasksContainer.innerHTML = "";


const activeTasks =
    tasks
        .filter(
            t => !t.completed
        )
        .sort(
            (a, b) =>
                Number(b.starred) -
                Number(a.starred)
        );


const completedTasks =
    tasks.filter(
        t => t.completed
    );


if (tasks.length === 0) {

    tasksContainer.innerHTML = `

        <div class="empty">

            <div class="empty-icon">
                🌱
            </div>

            <strong>
                مفيش نوايا هنا
            </strong>

            <span>
                اكتب نية جديدة وابدأ يومك.
            </span>

        </div>

    `;

    return;
}


activeTasks.forEach(task => {

    tasksContainer.appendChild(
        createTaskElement(task)
    );

});


if (completedTasks.length > 0) {

    const divider =
        document.createElement("div");


    divider.className =
        "completed-divider";


    divider.innerHTML =
        `
            <span>
                النوايا المحققة
                (${completedTasks.length})
            </span>
        `;


    tasksContainer.appendChild(
        divider
    );


    completedTasks.forEach(task => {

        tasksContainer.appendChild(
            createTaskElement(task)
        );

    });
}
```

}

/* =====================================================
CREATE TASK
===================================================== */

function createTaskElement(task) {

```
const el =
    document.createElement("div");


el.className =
    "task" +
    (
        task.completed
            ? " completed"
            : ""
    );


el.dataset.taskId =
    String(task.id);


el.innerHTML = `

    <div
        class="check"
        aria-hidden="true"
    ></div>


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
            aria-label="تمييز بنجمة"
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
            aria-label="حذف"
        >
            ×
        </button>

    </div>
`;


return el;
```

}

/* =====================================================
SECURITY
===================================================== */

function escapeHtml(str) {

```
return String(str).replace(
    /[&<>"']/g,
    match => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[match]
);
```

}

/* =====================================================
TASK EVENTS
===================================================== */

tasksContainer.addEventListener(
"click",
event => {

```
    const iconBtn =
        event.target.closest(
            ".icon-btn"
        );


    if (iconBtn) {

        const taskEl =
            iconBtn.closest(".task");


        if (!taskEl) {
            return;
        }


        const id =
            taskEl.dataset.taskId;


        const action =
            iconBtn.dataset.action;


        if (action === "star") {

            toggleStar(id);

            return;
        }


        if (action === "delete") {

            if (
                window.confirm(
                    "هل أنت متأكد من حذف هذه النية؟"
                )
            ) {

                deleteTask(id);
            }

            return;
        }
    }


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


    toggleTask(id);
}
```

);

/* =====================================================
INPUT
===================================================== */

taskInput.addEventListener(
"input",
() => {

```
    taskInput.style.height =
        "auto";


    taskInput.style.height =
        Math.min(
            taskInput.scrollHeight,
            120
        ) + "px";


    if (
        taskInput.value.trim().length > 0
    ) {

        submitBtn.classList.add(
            "active"
        );

    } else {

        submitBtn.classList.remove(
            "active"
        );
    }
}
```

);

/* =====================================================
ENTER SEND
===================================================== */

taskInput.addEventListener(
"keydown",
event => {

```
    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        handleSend();
    }
}
```

);

submitBtn.addEventListener(
"click",
handleSend
);

function handleSend() {

```
const value =
    taskInput.value;


if (!value.trim()) {
    return;
}


addTask(value);


taskInput.value =
    "";


taskInput.style.height =
    "42px";


submitBtn.classList.remove(
    "active"
);


/*
   يرجع المؤشر لصندوق الكتابة
   لتجربة سريعة مثل ChatGPT
*/

requestAnimationFrame(() => {

    taskInput.focus();

});
```

}

/* =====================================================
PWA INSTALL
===================================================== */

window.addEventListener(
"beforeinstallprompt",
event => {

```
    event.preventDefault();

    deferredInstallPrompt =
        event;

    installOverlay.classList.add(
        "show"
    );

    installOverlay.setAttribute(
        "aria-hidden",
        "false"
    );
}
```

);

installBtn.addEventListener(
"click",
async () => {

```
    if (deferredInstallPrompt) {

        deferredInstallPrompt
            .prompt();


        try {

            await deferredInstallPrompt
                .userChoice;

        } catch (_) {}


        deferredInstallPrompt =
            null;


        installOverlay.classList.remove(
            "show"
        );

        installOverlay.setAttribute(
            "aria-hidden",
            "true"
        );

        return;
    }


    installOverlay.classList.remove(
        "show"
    );


    installGuide.classList.add(
        "show"
    );

    installGuide.setAttribute(
        "aria-hidden",
        "false"
    );
}
```

);

installClose.addEventListener(
"click",
() => {

```
    installOverlay.classList.remove(
        "show"
    );

    installOverlay.setAttribute(
        "aria-hidden",
        "true"
    );
}
```

);

guideClose.addEventListener(
"click",
() => {

```
    installGuide.classList.remove(
        "show"
    );

    installGuide.setAttribute(
        "aria-hidden",
        "true"
    );
}
```

);

/* =====================================================
SERVICE WORKER
===================================================== */

if ("serviceWorker" in navigator) {

```
window.addEventListener(
    "load",
    () => {

        navigator.serviceWorker
            .register("./sw.js")
            .catch(() => {});

    }
);
```

}

/* =====================================================
INITIAL RENDER
===================================================== */

render();
