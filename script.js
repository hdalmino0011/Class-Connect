/* file: script.js - ClassConnect Complete Application Script */

// Supabase Configuration
const SUPABASE_URL = "https://uctodqnrwrroppkaggbl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjdG9kcW5yd3Jyb3Bwa2FnZ2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODk0NDYsImV4cCI6MjEwMTI2NTQ0Nn0.EwFU5LmczD8PLLeV0jTFvWxnuMzL65xy_zpkZEAV3NA";

let supabaseClient = null;
let supabaseStatus = "not-initialized";
let remoteUser = null;
let remoteProfile = null;
let postLoadSequence = 0; // For search race-condition protection

function createSupabaseFallback(reason) {
  console.warn("[ClassConnect] Supabase unavailable:", reason);
  return {
    auth: {
      getSession: function () {
        return Promise.resolve({ data: { session: null }, error: null });
      },
      signUp: function () {
        return Promise.resolve({
          data: { user: null, session: null },
          error: { message: "Supabase is unavailable." },
        });
      },
      signInWithPassword: function () {
        return Promise.resolve({
          data: { user: null, session: null },
          error: { message: "Supabase is unavailable." },
        });
      },
      signOut: function () {
        return Promise.resolve({ error: null });
      },
      resetPasswordForEmail: function () {
        return Promise.resolve({
          data: null,
          error: { message: "Supabase is unavailable." },
        });
      },
      updateUser: function () {
        return Promise.resolve({
          data: { user: null },
          error: { message: "Supabase is unavailable." },
        });
      },
      onAuthStateChange: function () {
        return {
          data: { subscription: { unsubscribe: function () {} } },
          error: null,
        };
      },
    },
  };
}

function initializeSupabase() {
  if (supabaseClient && supabaseStatus === "ready") {
    return supabaseClient;
  }

  try {
    var sdk = typeof window !== "undefined" ? window.supabase : null;
    if (!sdk || typeof sdk.createClient !== "function") {
      supabaseStatus = "fallback";
      supabaseClient = createSupabaseFallback("Supabase SDK is not loaded.");
      return supabaseClient;
    }

    var client = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    supabaseClient = client;
    supabaseStatus = "ready";
    console.log("[ClassConnect] Supabase initialized successfully.");
    return supabaseClient;
  } catch (error) {
    supabaseStatus = "fallback";
    console.error("[ClassConnect] Supabase initialization failed:", error);
    supabaseClient = createSupabaseFallback(error.message || "Unknown error");
    return supabaseClient;
  }
}

function getSupabaseClient() { return initializeSupabase(); }

function withTimeout(promise, milliseconds, label) {
  var timeoutId;
  var timeout = new Promise(function (_, reject) {
    timeoutId = setTimeout(function () {
      reject(new Error(label + " timed out after " + milliseconds + "ms."));
    }, milliseconds);
  });
  return Promise.race([promise, timeout]).finally(function () {
    clearTimeout(timeoutId);
  });
}

function isSupabaseReady() {
  var client = getSupabaseClient();
  return supabaseStatus === "ready" && client && client.auth && typeof client.auth.getSession === "function";
}

function isTransientSupabaseError(error) {
  var message = error && error.message ? String(error.message).toLowerCase() : "";
  return !navigator.onLine ||
    message.indexOf("failed to fetch") !== -1 ||
    message.indexOf("network") !== -1 ||
    message.indexOf("timeout") !== -1;
}

function authUserName(authUser) {
  if (!authUser) return "Student";
  var metadata = authUser.user_metadata || {};
  return metadata.full_name || metadata.name || authUser.email || "Student";
}

function getRemoteSession() {
  var client = getSupabaseClient();
  if (!isSupabaseReady()) {
    return Promise.resolve({ session: null, error: new Error("Supabase unavailable"), available: false });
  }

  return withTimeout(client.auth.getSession(), 5000, "Supabase session check")
    .then(function (result) {
      if (result && result.error) return { session: null, error: result.error, available: true };
      return { session: (result && result.data && result.data.session) || null, error: null, available: true };
    })
    .catch(function (error) {
      return { session: null, error: error, available: true };
    });
}

(function () {
  "use strict";

  const KEYS = { SETTINGS: "cc_settings" };
  const ADMIN_EMAILS = ["admin@classconnect.com", "admin@hddev.com"];

  const DEMO_CLASSMATES = [
    { name: "Maria Delacruz", course: "BSIT", year: "3rd Year", section: "BSIT 3-A", email: "maria.delacruz@ctu.edu.ph", bio: "Aspiring Web Developer & UI Designer" },
    { name: "Juan Reyes", course: "BSIT", year: "3rd Year", section: "BSIT 3-A", email: "juan.reyes@ctu.edu.ph", bio: "Tech Enthusiast and Mobile App Developer" },
    { name: "Anna Santos", course: "BSIT", year: "3rd Year", section: "BSIT 3-B", email: "anna.santos@ctu.edu.ph", bio: "Data Analyst & Database Administrator" },
    { name: "Carlos Garcia", course: "BSIT", year: "3rd Year", section: "BSIT 3-A", email: "carlos.garcia@ctu.edu.ph", bio: "Cybersecurity student & Networking enthusiast" },
    { name: "Lisa Tan", course: "BSIT", year: "3rd Year", section: "BSIT 3-B", email: "lisa.tan@ctu.edu.ph", bio: "AI & Machine Learning student" },
  ];

  const DEMO_FAQS = [
    { question: "What is ClassConnect?", answer: "ClassConnect is a platform designed to help college students connect with classmates, manage subjects, track schedules, assignments, grades, and curriculum in one synchronized place." },
    { question: "How do subjects synchronize across sections?", answer: "When you add a subject with its Year Level and Semester, it automatically updates your Schedule, Grades, and Curriculum sections seamlessly!" },
    { question: "How does the current subjects option work?", answer: "In Subjects and Schedule, you can check 'Display current year level & semester subjects only'. ClassConnect remembers this setting so every time you log in, your current term schedule and subjects are displayed automatically." },
    { question: "How do un-graded subjects appear in Grades?", answer: "Added subjects appear in your Grades section. If you haven't assigned a grade yet, it shows 'Not Graded'. Click 'Grade Subject' to enter your mark whenever you get your grade." },
    { question: "How does Curriculum view work?", answer: "In Curriculum, you can view your subjects ordered vertically by Year Level and Semester, complete with Subject Code, Schedule, and Grade status." },
  ];

  var INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
  var inactivityTimer = null;
  var inactivityActive = false;

  function resetInactivityTimer() {
    if (!inactivityActive) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(triggerInactivityLogout, INACTIVITY_TIMEOUT_MS);
  }

  function startInactivityTimer() {
    inactivityActive = true;
    resetInactivityTimer();
  }

  function stopInactivityTimer() {
    inactivityActive = false;
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  function showInactivityModal() {
    var overlay = document.getElementById("inactivity-modal-overlay");
    if (overlay) { overlay.classList.add("active"); overlay.setAttribute("aria-hidden", "false"); }
  }

  function hideInactivityModal() {
    var overlay = document.getElementById("inactivity-modal-overlay");
    if (overlay) { overlay.classList.remove("active"); overlay.setAttribute("aria-hidden", "true"); }
  }

  function triggerInactivityLogout() {
    if (!isLoggedIn()) return;
    stopInactivityTimer();
    var client = getSupabaseClient();
    var remoteLogout = isSupabaseReady() && client.auth && typeof client.auth.signOut === "function"
      ? withTimeout(client.auth.signOut(), 5000, "Supabase inactivity logout").catch(function () {})
      : Promise.resolve();
    remoteLogout.then(function () {
      remoteUser = null;
      remoteProfile = null;
      closeDrawer();
      closeAllModals();
      switchView("view-home");
      showInactivityModal();
    });
  }

  /* UTILS */
  function cryptoId() { return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9); }
  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function initials(name) {
    if (!name) return "S";
    const parts = name.trim().split(" ");
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }
  function timeAgo(timestamp) {
    if (!timestamp) return "Just now";
    var date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Just now";
    var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    var days = Math.floor(hours / 24);
    if (days < 7) return days + "d ago";
    return Math.floor(days / 7) + "w ago";
  }
  function formatTimestampPHT(timestamp) {
    if (!timestamp) return "Just now";
    var date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Just now";
    try {
      return date.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      }) + " PHT";
    } catch (e) {
      return date.toLocaleString();
    }
  }
  function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  function normalizeSection(section) { return section ? section.trim().toUpperCase() : ""; }
  function stringToColor(str) {
    if (!str) return "#2563EB";
    var hash = 0;
    for (var i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    var palette = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];
    return palette[Math.abs(hash) % palette.length];
  }
  function formatTime12h(time24) {
    if (!time24) return "";
    var parts = time24.split(":");
    var h = parseInt(parts[0], 10);
    var m = parts[1] || "00";
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + m + " " + ampm;
  }
  function isAdmin() {
    var user = getCurrentUser();
    if (!user) return false;
    return ADMIN_EMAILS.some(e => user.email.toLowerCase() === e.toLowerCase());
  }

  var loadingDepth = 0;
  function showGlobalLoading() {
    loadingDepth++;
    var overlay = document.getElementById("global-loading-overlay");
    if (overlay) { overlay.classList.add("active"); overlay.setAttribute("aria-hidden", "false"); }
    document.body.classList.add("cc-global-loading");
  }
  function hideGlobalLoading() {
    if (loadingDepth > 0) loadingDepth--;
    if (loadingDepth === 0) {
      var overlay = document.getElementById("global-loading-overlay");
      if (overlay) { overlay.classList.remove("active"); overlay.setAttribute("aria-hidden", "true"); }
      document.body.classList.remove("cc-global-loading");
    }
  }
  function withLoading(fn) {
    showGlobalLoading();
    return Promise.resolve().then(fn).then(r => { hideGlobalLoading(); return r; }).catch(e => { hideGlobalLoading(); throw e; });
  }

  function showToast(message, type = "success") {
    var existing = document.getElementById("cc-toast");
    if (existing) existing.remove();
    var iconMap = { success: "fa-circle-check", error: "fa-circle-xmark", warning: "fa-triangle-exclamation", info: "fa-circle-info" };
    var toast = document.createElement("div");
    toast.id = "cc-toast";
    toast.className = "cc-toast cc-toast-" + type;
    toast.innerHTML = '<i class="fas ' + (iconMap[type] || "fa-circle-info") + ' toast-icon"></i><span class="toast-msg">' + escapeHtml(message) + '</span><button class="toast-close"><i class="fas fa-xmark"></i></button>';
    document.body.appendChild(toast);
    toast.querySelector(".toast-close").addEventListener("click", () => dismissToast(toast));
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("cc-toast-show")));
    toast._timer = setTimeout(() => dismissToast(toast), 3500);
  }

  function dismissToast(toast) {
    if (!toast) return;
    clearTimeout(toast._timer);
    toast.classList.remove("cc-toast-show");
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 380);
  }

  function showConfirm(message, onConfirm) {
    var existing = document.getElementById("cc-confirm-overlay");
    if (existing) existing.remove();
    var overlay = document.createElement("div");
    overlay.id = "cc-confirm-overlay";
    overlay.className = "cc-confirm-overlay";
    overlay.innerHTML = '<div class="cc-confirm-box"><div class="cc-confirm-icon-wrap"><i class="fas fa-triangle-exclamation"></i></div><p class="cc-confirm-msg">' + escapeHtml(message) + '</p><div class="cc-confirm-btns"><button class="cc-confirm-cancel">Cancel</button><button class="cc-confirm-ok">Confirm</button></div></div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("active")));
    function closeConfirm() { overlay.classList.remove("active"); setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300); }
    overlay.querySelector(".cc-confirm-cancel").addEventListener("click", closeConfirm);
    overlay.querySelector(".cc-confirm-ok").addEventListener("click", () => { closeConfirm(); if (typeof onConfirm === "function") onConfirm(); });
  }

  function getCurrentUser() { return remoteUser; }
  function isLoggedIn() { return !!(remoteUser && remoteUser.email && remoteUser.provider === "supabase"); }

  function supabaseTable(tableName) {
    var client = getSupabaseClient();
    if (!isSupabaseReady()) throw new Error("Supabase is not available.");
    return client.from(tableName);
  }

  async function withAuthCheck(fn) {
    if (!isLoggedIn()) throw new Error("You must be logged in.");
    return fn();
  }

  /* =========================================================
     POSTS DATA & DEDUPLICATION BUG FIX
     ========================================================= */
  async function getPosts() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var section = (remoteProfile && remoteProfile.section) || user.section || null;
      var year = (remoteProfile && remoteProfile.year) || user.year || null;
      var query = supabaseTable("posts").select("*").order("timestamp", { ascending: false });
      if (section) {
        query = query.eq("section", section);
        if (year) query = query.or("year.eq." + year + ",year.is.null");
      } else {
        query = query.eq("user_id", user.id);
      }
      var result = await withTimeout(query, 8000, "Posts load");
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function createPost(content, imageData) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var post = {
        user_id: user.id,
        author: user.name || "Student",
        content: content.trim(),
        image: imageData || null,
        tag: null,
        section: (remoteProfile && remoteProfile.section) || user.section || null,
        year: (remoteProfile && remoteProfile.year) || user.year || null,
        timestamp: new Date().toISOString(),
      };
      var result = await withTimeout(supabaseTable("posts").insert(post).select().single(), 8000, "Post create");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updatePost(id, content) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("posts").update({ content: content.trim() }).eq("id", id).eq("user_id", user.id).select().single(), 8000, "Post update");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deletePost(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("posts").delete().eq("id", id).eq("user_id", user.id), 8000, "Post delete");
      if (result.error) throw result.error;
      return true;
    });
  }

  async function getPostAcknowledgments(postId) {
    return withAuthCheck(async function () {
      var result = await withTimeout(supabaseTable("post_acknowledgments").select("*").eq("post_id", postId), 8000, "Acknowledgments load");
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function toggleAcknowledgePost(postId) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await withTimeout(supabaseTable("post_acknowledgments").select("*").eq("post_id", postId).eq("user_id", user.id).maybeSingle(), 8000, "Ack check");
      if (existing.error) throw existing.error;
      if (existing.data) {
        await withTimeout(supabaseTable("post_acknowledgments").delete().eq("post_id", postId).eq("user_id", user.id), 8000, "Ack remove");
        return false;
      } else {
        await withTimeout(supabaseTable("post_acknowledgments").insert({ post_id: postId, user_id: user.id, name: user.name || "Student", email: user.email }).select().single(), 8000, "Ack add");
        return true;
      }
    });
  }

  async function hasAcknowledgedPost(postId) {
    try {
      var acks = await getPostAcknowledgments(postId);
      var user = getCurrentUser();
      return acks.some(a => a.user_id === user.id);
    } catch (e) { return false; }
  }

  async function getCommentsForPosts(postIds) {
    if (!postIds || postIds.length === 0) return [];
    return withAuthCheck(async function () {
      var result = await withTimeout(supabaseTable("comments").select("*").in("post_id", postIds).order("created_at", { ascending: true }), 8000, "Comments load");
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addComment(postId, content) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var comment = { post_id: postId, user_id: user.id, author: user.name || "Student", content: content.trim(), created_at: new Date().toISOString() };
      var result = await withTimeout(supabaseTable("comments").insert(comment).select().single(), 8000, "Comment add");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteComment(commentId) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("comments").delete().eq("id", commentId).eq("user_id", user.id), 8000, "Comment delete");
      if (result.error) throw result.error;
      return true;
    });
  }

  /* =========================================================
     SYNCHRONIZED SUBJECTS, SCHEDULE, GRADES & CURRICULUM
     ========================================================= */
  async function getSubjects() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("subjects").select("*").eq("user_id", user.id).order("created_at", { ascending: true }), 8000, "Subjects load");
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addSubject(data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var colors = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];
      var existing = await getSubjects();
      var color = colors[existing.length % colors.length];

      var newSubject = {
        user_id: user.id,
        name: data.name.trim(),
        code: (data.code || "SUBJ-" + (existing.length + 1)).trim(),
        professor: (data.professor || "").trim(),
        schedule: (data.schedule || (data.day ? data.day + " " + (data.start_time || "") + "-" + (data.end_time || "") : "")).trim(),
        day: (data.day || "").trim(),
        start_time: data.start_time || "",
        end_time: data.end_time || "",
        room: (data.room || "").trim(),
        year: data.year || (remoteProfile ? remoteProfile.year : "1st Year"),
        semester: data.semester || "1st Semester",
        units: parseFloat(data.units) || 3,
        color: color,
        tasks: [],
      };

      var result = await withTimeout(supabaseTable("subjects").insert(newSubject).select().single(), 8000, "Subject add");
      if (result.error) throw result.error;
      var savedSubj = result.data;

      // AUTOMATIC SYNCHRONIZATION:
      // 1. Sync to Schedule if day/time provided
      if (savedSubj.day && savedSubj.start_time && savedSubj.end_time) {
        try {
          await supabaseTable("schedule").insert({
            user_id: user.id,
            subject: savedSubj.name,
            day: savedSubj.day,
            start_time: savedSubj.start_time,
            end_time: savedSubj.end_time,
            room: savedSubj.room,
            year: savedSubj.year,
            semester: savedSubj.semester,
          });
        } catch (e) { console.warn("Schedule sync warning:", e); }
      }

      // 2. Sync to Curriculum Subjects
      try {
        await supabaseTable("curriculum_subjects").insert({
          user_id: user.id,
          name: savedSubj.name,
          code: savedSubj.code,
          schedule: savedSubj.schedule,
          year: savedSubj.year,
          semester: savedSubj.semester,
        });
      } catch (e) { console.warn("Curriculum sync warning:", e); }

      return savedSubj;
    });
  }

  async function updateSubject(id, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("subjects").update(data).eq("id", id).eq("user_id", user.id).select().single(), 8000, "Subject update");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteSubject(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("subjects").delete().eq("id", id).eq("user_id", user.id), 8000, "Subject delete");
      if (result.error) throw result.error;
      return true;
    });
  }

  async function addSubjectTask(subjectId, text) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var subj = await withTimeout(supabaseTable("subjects").select("tasks").eq("id", subjectId).eq("user_id", user.id).single(), 8000, "Subject fetch");
      if (subj.error) throw subj.error;
      var tasks = subj.data.tasks || [];
      var newTask = { id: cryptoId(), text: text.trim(), completed: false };
      tasks.push(newTask);
      var result = await withTimeout(supabaseTable("subjects").update({ tasks: tasks }).eq("id", subjectId).eq("user_id", user.id).select().single(), 8000, "Subject task add");
      if (result.error) throw result.error;
      return newTask;
    });
  }

  async function toggleSubjectTask(subjectId, taskId) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var subj = await withTimeout(supabaseTable("subjects").select("tasks").eq("id", subjectId).eq("user_id", user.id).single(), 8000, "Subject fetch");
      if (subj.error) throw subj.error;
      var tasks = subj.data.tasks || [];
      var task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        await withTimeout(supabaseTable("subjects").update({ tasks: tasks }).eq("id", subjectId).eq("user_id", user.id), 8000, "Subject task toggle");
        return true;
      }
      return false;
    });
  }

  async function deleteSubjectTask(subjectId, taskId) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var subj = await withTimeout(supabaseTable("subjects").select("tasks").eq("id", subjectId).eq("user_id", user.id).single(), 8000, "Subject fetch");
      if (subj.error) throw subj.error;
      var tasks = subj.data.tasks || [];
      var newTasks = tasks.filter(t => t.id !== taskId);
      await withTimeout(supabaseTable("subjects").update({ tasks: newTasks }).eq("id", subjectId).eq("user_id", user.id), 8000, "Subject task delete");
      return true;
    });
  }

  /* =========================================================
     SCHEDULE DATA
     ========================================================= */
  async function getSchedule() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("schedule").select("*").eq("user_id", user.id).order("created_at", { ascending: true }), 8000, "Schedule load");
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addScheduleItem(subject, day, startTime, endTime, room, year, semester) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var item = {
        user_id: user.id,
        subject: subject.trim(),
        day: day.trim(),
        start_time: startTime,
        end_time: endTime,
        room: room.trim(),
        year: year || (remoteProfile ? remoteProfile.year : "1st Year"),
        semester: semester || "1st Semester",
      };
      var result = await withTimeout(supabaseTable("schedule").insert(item).select().single(), 8000, "Schedule add");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updateScheduleItem(id, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("schedule").update(data).eq("id", id).eq("user_id", user.id).select().single(), 8000, "Schedule update");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteScheduleItem(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("schedule").delete().eq("id", id).eq("user_id", user.id), 8000, "Schedule delete");
      if (result.error) throw result.error;
      return true;
    });
  }

  /* =========================================================
     ASSIGNMENTS DATA
     ========================================================= */
  async function getAssignments() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("assignments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }), 8000, "Assignments load");
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addAssignment(text, subject, dueDate) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var item = { user_id: user.id, text: text.trim(), subject: subject.trim(), due_date: dueDate || "", completed: false };
      var result = await withTimeout(supabaseTable("assignments").insert(item).select().single(), 8000, "Assignment add");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function toggleAssignment(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var current = await withTimeout(supabaseTable("assignments").select("completed").eq("id", id).eq("user_id", user.id).single(), 8000, "Assignment fetch");
      if (current.error) throw current.error;
      var newCompleted = !current.data.completed;
      await withTimeout(supabaseTable("assignments").update({ completed: newCompleted }).eq("id", id).eq("user_id", user.id), 8000, "Assignment toggle");
      return newCompleted;
    });
  }

  async function deleteAssignment(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      await withTimeout(supabaseTable("assignments").delete().eq("id", id).eq("user_id", user.id), 8000, "Assignment delete");
      return true;
    });
  }

  /* =========================================================
     GRADES DATA
     ========================================================= */
  async function getGrades() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("grades").select("*").eq("user_id", user.id).order("created_at", { ascending: true }), 8000, "Grades load");
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addGrade(subject, gradeValue, units, year, semester, exclude) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var item = {
        user_id: user.id,
        subject: subject.trim(),
        grade: parseFloat(gradeValue),
        units: parseFloat(units) || 3,
        year: year || "1st Year",
        semester: semester || "1st Semester",
        exclude: !!exclude,
      };
      var result = await withTimeout(supabaseTable("grades").insert(item).select().single(), 8000, "Grade add");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updateGrade(id, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("grades").update(data).eq("id", id).eq("user_id", user.id).select().single(), 8000, "Grade update");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteGrade(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      await withTimeout(supabaseTable("grades").delete().eq("id", id).eq("user_id", user.id), 8000, "Grade delete");
      return true;
    });
  }

  async function toggleGradeExclude(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var current = await withTimeout(supabaseTable("grades").select("exclude").eq("id", id).eq("user_id", user.id).single(), 8000, "Grade fetch");
      if (current.error) throw current.error;
      var newExclude = !current.data.exclude;
      await withTimeout(supabaseTable("grades").update({ exclude: newExclude }).eq("id", id).eq("user_id", user.id), 8000, "Grade exclude toggle");
      return newExclude;
    });
  }

  /* =========================================================
     CURRICULUM DATA
     ========================================================= */
  async function getCurriculumSubjects() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("curriculum_subjects").select("*").eq("user_id", user.id).order("created_at", { ascending: true }), 8000, "Curriculum subjects load");
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addCurriculumSubject(name, code, schedule, year, semester) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var item = { user_id: user.id, name: name.trim(), code: code.trim(), schedule: schedule.trim(), year: year.trim(), semester: semester || "1st Semester" };
      var result = await withTimeout(supabaseTable("curriculum_subjects").insert(item).select().single(), 8000, "Curriculum subject add");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updateCurriculumSubject(id, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("curriculum_subjects").update(data).eq("id", id).eq("user_id", user.id).select().single(), 8000, "Curriculum subject update");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteCurriculumSubject(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      await withTimeout(supabaseTable("curriculum_subjects").delete().eq("id", id).eq("user_id", user.id), 8000, "Curriculum subject delete");
      return true;
    });
  }

  async function getCurriculumPDF() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("curriculum_pdf").select("*").eq("user_id", user.id).maybeSingle(), 8000, "Curriculum PDF load");
      if (result.error) throw result.error;
      return result.data || null;
    });
  }

  async function saveCurriculumPDF(name, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await getCurriculumPDF();
      var payload = { user_id: user.id, name: name.trim(), data: data };
      var result = existing
        ? await withTimeout(supabaseTable("curriculum_pdf").update(payload).eq("id", existing.id).eq("user_id", user.id).select().single(), 8000, "PDF update")
        : await withTimeout(supabaseTable("curriculum_pdf").insert(payload).select().single(), 8000, "PDF insert");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function removeCurriculumPDF() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await getCurriculumPDF();
      if (!existing) return true;
      await withTimeout(supabaseTable("curriculum_pdf").delete().eq("id", existing.id).eq("user_id", user.id), 8000, "PDF delete");
      return true;
    });
  }

  async function getCORPDF() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(supabaseTable("cor_pdf").select("*").eq("user_id", user.id).maybeSingle(), 8000, "COR PDF load");
      if (result.error) throw result.error;
      return result.data || null;
    });
  }

  async function saveCORPDF(name, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await getCORPDF();
      var payload = { user_id: user.id, name: name.trim(), data: data };
      var result = existing
        ? await withTimeout(supabaseTable("cor_pdf").update(payload).eq("id", existing.id).eq("user_id", user.id).select().single(), 8000, "COR update")
        : await withTimeout(supabaseTable("cor_pdf").insert(payload).select().single(), 8000, "COR insert");
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function removeCORPDF() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await getCORPDF();
      if (!existing) return true;
      await withTimeout(supabaseTable("cor_pdf").delete().eq("id", existing.id).eq("user_id", user.id), 8000, "COR delete");
      return true;
    });
  }

  /* PROFILE */
  async function saveProfile(data) {
    const user = getCurrentUser();
    if (!user || !isSupabaseReady()) throw new Error("No active Supabase session.");
    remoteProfile = Object.assign({}, getProfile(), data, {
      email: user.email.toLowerCase(),
      section: data.section ? normalizeSection(data.section) : getProfile().section,
    });
    var saved = await upsertRemoteProfile(remoteProfile);
    if (saved && saved.name && remoteUser) remoteUser.name = saved.name;
    return saved;
  }

  function getProfile() {
    const user = getCurrentUser();
    if (!user) return {};
    if (remoteProfile) return Object.assign({}, remoteProfile);
    return { name: user.name, email: user.email, section: "" };
  }

  function saveRemoteUserSession(authUser) {
    if (!authUser || !authUser.email) { remoteUser = null; return null; }
    remoteUser = {
      id: authUser.id || cryptoId(),
      name: authUserName(authUser),
      email: authUser.email.trim().toLowerCase(),
      provider: "supabase",
    };
    return remoteUser;
  }

  async function loadRemoteProfile() {
    var user = getCurrentUser();
    if (!user || !isSupabaseReady()) return null;
    var client = getSupabaseClient();
    var response = await withTimeout(client.from("profiles").select("*").eq("id", user.id).maybeSingle(), 8000, "Profile load");
    if (response.error) throw response.error;
    remoteProfile = remoteRowToProfile(response.data, user);
    return remoteProfile;
  }

  async function upsertRemoteProfile(profile) {
    var user = getCurrentUser();
    if (!user || !isSupabaseReady()) throw new Error("No active session.");
    var client = getSupabaseClient();
    var response = await withTimeout(client.from("profiles").upsert(profileToRemoteRow(profile, user), { onConflict: "id" }).select().single(), 8000, "Profile save");
    if (response.error) throw response.error;
    remoteProfile = remoteRowToProfile(response.data, user);
    return remoteProfile;
  }

  function profileToRemoteRow(profile, user) {
    var s = profile || {};
    return {
      id: user.id, email: user.email, full_name: s.name || user.name || "Student",
      bio: s.bio || "", student_id: s.studentId || "", course: s.course || "",
      year: s.year || "", section: s.section || "", contact: s.contact || "",
      birthdate: s.birthdate || null, gender: s.gender || "", address: s.address || "",
      emergency: s.emergency || "", guardian_name: s.guardianName || "",
      guardian_contact: s.guardianContact || "", photo: s.photo || null,
      filter_current_subjects_only: !!s.filter_current_subjects_only,
      filter_current_schedule_only: !!s.filter_current_schedule_only,
    };
  }

  function remoteRowToProfile(row, user) {
    var c = row || {};
    return {
      name: c.full_name || (user && user.name) || "Student",
      email: c.email || (user && user.email) || "",
      bio: c.bio || "", studentId: c.student_id || "", course: c.course || "",
      year: c.year || "", section: c.section || "", contact: c.contact || "",
      birthdate: c.birthdate || "", gender: c.gender || "", address: c.address || "",
      emergency: c.emergency || "", guardianName: c.guardian_name || "",
      guardianContact: c.guardian_contact || "", photo: c.photo || null,
      filter_current_subjects_only: !!c.filter_current_subjects_only,
      filter_current_schedule_only: !!c.filter_current_schedule_only,
    };
  }

  /* AUTH */
  async function signup(name, email, password, studentId, year, section) {
    if (!isSupabaseReady()) return { success: false, message: "Supabase is unavailable." };
    try {
      var client = getSupabaseClient();
      var response = await withTimeout(client.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: { data: { full_name: name.trim(), student_id: studentId.trim(), year: year.trim(), section: normalizeSection(section) } },
      }), 8000, "Signup");

      if (!response || response.error) return { success: false, message: (response && response.error && response.error.message) || "Unable to signup." };
      var createdUser = response.data && response.data.user;
      if (createdUser && response.data.session) {
        saveRemoteUserSession(createdUser);
        await upsertRemoteProfile({ name: name.trim(), studentId: studentId.trim(), year: year.trim(), section: normalizeSection(section) });
      }
      return { success: true, message: "Account created successfully!" };
    } catch (e) {
      return { success: false, message: e.message || "Signup failed." };
    }
  }

  async function login(email, password) {
    if (!isSupabaseReady()) return { success: false, message: "Supabase is unavailable." };
    try {
      var client = getSupabaseClient();
      var response = await withTimeout(client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: password }), 8000, "Login");
      if (!response || response.error) return { success: false, message: (response && response.error && response.error.message) || "Invalid email or password." };
      saveRemoteUserSession(response.data.user);
      await loadRemoteProfile();
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message || "Login failed." };
    }
  }

  function logout() {
    showConfirm("Are you sure you want to log out?", function () {
      var client = getSupabaseClient();
      var remoteLogout = isSupabaseReady() && client.auth ? withTimeout(client.auth.signOut(), 5000, "Signout").catch(() => {}) : Promise.resolve();
      remoteLogout.then(() => {
        stopInactivityTimer();
        remoteUser = null;
        remoteProfile = null;
        closeDrawer();
        closeAllModals();
        switchView("view-home");
        showPage("login-page");
        showLoginForm();
        showToast("You have been logged out.", "info");
      });
    });
  }

  /* UI SYSTEM */
  function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => { p.classList.remove("active-page"); p.style.display = "none"; });
    var target = document.getElementById(pageId);
    if (target) { target.classList.add("active-page"); target.style.display = ""; }
    var bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav) bottomNav.style.display = pageId === "dashboard-page" ? "" : "none";
  }

  function showLoginForm() {
    var lf = document.getElementById("login-form");
    var sf = document.getElementById("signup-form");
    if (sf) sf.style.display = "none";
    if (lf) { lf.classList.add("active-form"); lf.style.display = ""; }
  }

  function showSignupForm() {
    var lf = document.getElementById("login-form");
    var sf = document.getElementById("signup-form");
    if (lf) lf.style.display = "none";
    if (sf) { sf.classList.add("active-form"); sf.style.display = ""; }
  }

  function openModal(id) {
    var overlay = document.getElementById(id);
    if (overlay) { overlay.classList.add("active-modal"); document.body.style.overflow = "hidden"; }
  }

  function closeModal(id) {
    var overlay = document.getElementById(id);
    if (overlay) { overlay.classList.remove("active-modal"); document.body.style.overflow = ""; }
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active-modal"));
    document.body.style.overflow = "";
  }

  function switchView(viewId) {
    document.querySelectorAll(".dashboard-view").forEach(v => { v.classList.remove("active-view"); v.style.display = "none"; });
    var target = document.getElementById(viewId);
    if (target) { target.classList.add("active-view"); target.style.display = ""; }
    document.querySelectorAll(".nav-item[data-view]").forEach(btn => btn.classList.toggle("active-nav", btn.getAttribute("data-view") === viewId));
    document.querySelectorAll(".drawer-item[data-view]").forEach(btn => btn.classList.toggle("active-drawer-item", btn.getAttribute("data-view") === viewId));
    closeDrawer();

    if (viewId === "view-subjects") loadSubjects();
    if (viewId === "view-schedule") loadSchedule();
    if (viewId === "view-grades") loadGrades();
    if (viewId === "view-curriculum") loadCurriculum();
    if (viewId === "view-classmates") loadClassmates();
    if (viewId === "view-faqs") loadFaqs();
  }

  function openDrawer() {
    var overlay = document.getElementById("side-drawer-overlay");
    var drawer = document.getElementById("side-drawer");
    if (overlay) overlay.classList.add("active-drawer");
    if (drawer) drawer.classList.add("open");
  }

  function closeDrawer() {
    var overlay = document.getElementById("side-drawer-overlay");
    var drawer = document.getElementById("side-drawer");
    if (overlay) overlay.classList.remove("active-drawer");
    if (drawer) drawer.classList.remove("open");
  }

  /* =========================================================
     RENDER FUNCTIONS
     ========================================================= */

  // LOAD POSTS WITH DUPLICATE FIX
  async function loadPosts(searchQuery) {
    const feed = document.getElementById("posts-feed");
    if (!feed) return;

    var currentSeq = ++postLoadSequence;
    feed.innerHTML = "";

    try {
      var posts = await getPosts();
      if (currentSeq !== postLoadSequence) return; // Discard stale response

      // STRICT DEDUPLICATION BY ID
      var seenIds = new Set();
      posts = posts.filter(p => {
        if (!p || !p.id || seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });

      if (searchQuery && searchQuery.trim() !== "") {
        var q = searchQuery.trim().toLowerCase();
        posts = posts.filter(p => {
          var matchAuthor = p.author && p.author.toLowerCase().indexOf(q) !== -1;
          var matchContent = p.content && p.content.toLowerCase().indexOf(q) !== -1;
          var matchTag = p.tag && p.tag.toLowerCase().indexOf(q) !== -1;
          return matchAuthor || matchContent || matchTag;
        });
      }

      if (posts.length === 0) {
        feed.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><p class="empty-title">No posts found</p></div>';
        return;
      }

      var user = getCurrentUser();
      var fragment = document.createDocumentFragment();

      for (var i = 0; i < posts.length; i++) {
        var post = posts[i];
        var card = document.createElement("div");
        card.className = "post-card";
        var imgHtml = post.image ? '<div class="post-image-wrap"><img src="' + post.image + '" alt="Post image" class="post-img-zoomable"></div>' : "";
        var canDel = post.author === (user ? user.name : "") || isAdmin();

        card.innerHTML =
          '<div class="post-header">' +
            '<div class="avatar-circle post-avatar" style="background:' + stringToColor(post.author) + '">' + initials(post.author) + '</div>' +
            '<div class="post-author-info">' +
              '<span class="post-author-name">' + escapeHtml(post.author) + '</span>' +
              '<span class="post-timestamp"><i class="fas fa-clock"></i> ' + formatTimestampPHT(post.timestamp) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="post-content">' + post.content + imgHtml + '</div>' +
          '<div class="post-footer">' +
            '<div class="post-footer-left"><button class="btn-acknowledge" data-id="' + post.id + '"><i class="fas fa-check-circle"></i> Acknowledge</button></div>' +
            '<div class="post-footer-right">' + (canDel ? '<button class="btn-delete-post" data-id="' + post.id + '"><i class="fas fa-trash"></i> Delete</button>' : '') + '</div>' +
          '</div>';

        fragment.appendChild(card);
      }

      feed.innerHTML = "";
      feed.appendChild(fragment);

      feed.querySelectorAll(".btn-delete-post").forEach(btn => {
        btn.addEventListener("click", () => {
          var id = btn.getAttribute("data-id");
          showConfirm("Delete this post?", () => {
            withLoading(() => deletePost(id)).then(() => loadPosts(searchQuery)).catch(e => showToast(e.message, "error"));
          });
        });
      });

    } catch (err) {
      if (currentSeq === postLoadSequence) {
        feed.innerHTML = '<div class="empty-state"><p class="empty-title">Error loading posts</p></div>';
      }
    }
  }

  // LOAD SUBJECTS WITH CURRENT TERM FILTER
  async function loadSubjects() {
    const list = document.getElementById("subjects-list");
    if (!list) return;

    var yearFilter = document.getElementById("subjects-year-filter");
    var semFilter = document.getElementById("subjects-semester-filter");
    var termOnlyCb = document.getElementById("subjects-current-term-only");

    var userProf = getProfile();
    var curYear = userProf.year || "3rd Year";
    var curSem = "1st Semester";

    if (termOnlyCb && userProf.filter_current_subjects_only) {
      termOnlyCb.checked = true;
      if (yearFilter) yearFilter.value = curYear;
      if (semFilter) semFilter.value = curSem;
    }

    try {
      var subjects = await getSubjects();
      list.innerHTML = "";

      var selYear = yearFilter ? yearFilter.value : "all";
      var selSem = semFilter ? semFilter.value : "all";

      if (termOnlyCb && termOnlyCb.checked) {
        selYear = curYear;
        selSem = curSem;
      }

      var filtered = subjects.filter(s => {
        var matchY = (selYear === "all" || !s.year || s.year === selYear);
        var matchS = (selSem === "all" || !s.semester || s.semester === selSem);
        return matchY && matchS;
      });

      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-book-open"></i></div><p class="empty-title">No subjects found</p><p class="empty-sub">Click "Add Subject" to add your subjects.</p></div>';
        return;
      }

      filtered.forEach(subject => {
        var card = document.createElement("div");
        card.className = "subject-card";
        card.style.borderLeftColor = subject.color || "#2563EB";

        var codeTag = subject.code ? '<span class="subject-code-badge">' + escapeHtml(subject.code) + '</span>' : '';
        var termTag = (subject.year || subject.semester) ? '<div class="subject-term-badge"><i class="fas fa-graduation-cap"></i> ' + escapeHtml(subject.year || '') + ' &bull; ' + escapeHtml(subject.semester || '') + '</div>' : '';

        card.innerHTML =
          '<div class="subject-card-header">' +
            '<div class="subject-card-title">' +
              '<span class="subject-color-dot" style="background:' + (subject.color || "#2563EB") + '"></span>' +
              '<h4>' + codeTag + escapeHtml(subject.name) + '</h4>' +
            '</div>' +
            '<div class="subject-actions">' +
              '<button class="btn-icon btn-delete-subject" data-id="' + subject.id + '"><i class="fas fa-trash"></i></button>' +
            '</div>' +
          '</div>' +
          termTag +
          '<div class="subject-meta">' +
            '<span><i class="fas fa-user-tie"></i> ' + escapeHtml(subject.professor || "No professor set") + '</span>' +
            '<span><i class="fas fa-calendar"></i> ' + escapeHtml(subject.schedule || "No schedule set") + '</span>' +
          '</div>';

        list.appendChild(card);
      });

      list.querySelectorAll(".btn-delete-subject").forEach(btn => {
        btn.addEventListener("click", () => {
          showConfirm("Delete this subject?", () => {
            withLoading(() => deleteSubject(btn.getAttribute("data-id"))).then(() => loadSubjects()).catch(e => showToast(e.message, "error"));
          });
        });
      });

    } catch (err) {
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load subjects</p></div>';
    }
  }

  // LOAD SCHEDULE WITH CURRENT TERM OPTION
  async function loadSchedule() {
    const list = document.getElementById("schedule-list");
    if (!list) return;

    var yearFilter = document.getElementById("schedule-year-filter");
    var semFilter = document.getElementById("schedule-semester-filter");
    var termOnlyCb = document.getElementById("schedule-current-term-only");

    var userProf = getProfile();
    var curYear = userProf.year || "3rd Year";
    var curSem = "1st Semester";

    if (termOnlyCb && userProf.filter_current_schedule_only) {
      termOnlyCb.checked = true;
      if (yearFilter) yearFilter.value = curYear;
      if (semFilter) semFilter.value = curSem;
    }

    try {
      var schedule = await getSchedule();
      list.innerHTML = "";

      var selYear = yearFilter ? yearFilter.value : "all";
      var selSem = semFilter ? semFilter.value : "all";

      if (termOnlyCb && termOnlyCb.checked) {
        selYear = curYear;
        selSem = curSem;
      }

      var filtered = schedule.filter(s => {
        var matchY = (selYear === "all" || !s.year || s.year === selYear);
        var matchS = (selSem === "all" || !s.semester || s.semester === selSem);
        return matchY && matchS;
      });

      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-calendar-days"></i></div><p class="empty-title">No schedule entries found</p></div>';
        return;
      }

      filtered.forEach(item => {
        var card = document.createElement("div");
        card.className = "schedule-card";

        var termLabel = (item.year || item.semester) ? '<span class="schedule-term-tag">' + escapeHtml(item.year || '') + ' - ' + escapeHtml(item.semester || '') + '</span>' : '';

        card.innerHTML =
          '<div class="schedule-card-top">' +
            '<div class="schedule-day-badge" style="background:#2563EB">' + escapeHtml(item.day || "MWF") + '</div>' +
            termLabel +
            '<button class="btn-icon btn-delete-schedule" data-id="' + item.id + '"><i class="fas fa-trash"></i></button>' +
          '</div>' +
          '<div class="schedule-card-info">' +
            '<h4>' + escapeHtml(item.subject) + '</h4>' +
            '<p class="schedule-time"><i class="fas fa-clock"></i> ' + formatTime12h(item.start_time) + ' - ' + formatTime12h(item.end_time) + '</p>' +
            '<p class="schedule-room"><i class="fas fa-location-dot"></i> ' + escapeHtml(item.room || "Room 301") + '</p>' +
          '</div>';

        list.appendChild(card);
      });

      list.querySelectorAll(".btn-delete-schedule").forEach(btn => {
        btn.addEventListener("click", () => {
          showConfirm("Delete schedule item?", () => {
            withLoading(() => deleteScheduleItem(btn.getAttribute("data-id"))).then(() => loadSchedule()).catch(e => showToast(e.message, "error"));
          });
        });
      });

    } catch (err) {
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load schedule</p></div>';
    }
  }

  // LOAD GRADES WITH UNGRADED SUBJECTS
  async function loadGrades() {
    const list = document.getElementById("grades-list");
    const gwaDisplay = document.getElementById("gwa-value");
    if (!list) return;

    var yearFilter = document.getElementById("grade-year-filter");
    var semFilter = document.getElementById("grade-semester-filter");
    var selYear = yearFilter ? yearFilter.value : "all";
    var selSem = semFilter ? semFilter.value : "all";

    try {
      var grades = await getGrades();
      var subjects = await getSubjects();

      // Merge subjects into grades list so added subjects appear as 'Not Graded' if grade is missing
      var gradeMap = {};
      grades.forEach(g => { gradeMap[g.subject.toLowerCase()] = g; });

      var displayList = [...grades];

      subjects.forEach(sub => {
        if (!gradeMap[sub.name.toLowerCase()]) {
          displayList.push({
            id: "temp-" + sub.id,
            subject_id: sub.id,
            subject: sub.name,
            grade: null, // NOT GRADED YET
            units: sub.units || 3,
            year: sub.year || "1st Year",
            semester: sub.semester || "1st Semester",
            is_ungraded: true,
          });
        }
      });

      var filtered = displayList.filter(g => {
        var matchY = (selYear === "all" || !selYear || g.year === selYear);
        var matchS = (selSem === "all" || !selSem || g.semester === selSem);
        return matchY && matchS;
      });

      list.innerHTML = "";

      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-chart-simple"></i></div><p class="empty-title">No grades found</p></div>';
        if (gwaDisplay) gwaDisplay.textContent = "0.00";
        return;
      }

      filtered.forEach(item => {
        var card = document.createElement("div");
        card.className = "grade-item" + (item.is_ungraded ? " grade-not-graded" : "");

        var gradeContent = item.is_ungraded
          ? '<span class="not-graded-badge"><i class="fas fa-circle-exclamation"></i> Not Graded</span>'
          : '<span class="grade-score-value">' + parseFloat(item.grade).toFixed(2) + '</span>';

        var actionBtn = item.is_ungraded
          ? '<button class="btn-grade-now" data-subject="' + escapeHtml(item.subject) + '" data-year="' + escapeHtml(item.year) + '" data-semester="' + escapeHtml(item.semester) + '" data-units="' + (item.units || 3) + '"><i class="fas fa-pen"></i> Grade Subject</button>'
          : '<button class="btn-grade-action btn-delete-grade" data-id="' + item.id + '"><i class="fas fa-trash"></i> Delete</button>';

        card.innerHTML =
          '<div class="grade-card-main">' +
            '<div class="grade-card-header-row">' +
              '<h4 class="grade-subject-title">' + escapeHtml(item.subject) + '</h4>' +
              '<div class="grade-score-wrap">' + gradeContent + '</div>' +
            '</div>' +
            '<div class="grade-meta-tags-row">' +
              '<span class="grade-unit-badge"><i class="fas fa-layer-group"></i> ' + (item.units || 3) + ' Units</span>' +
              '<span class="grade-term-badge"><i class="fas fa-calendar"></i> ' + escapeHtml(item.year) + ' &bull; ' + escapeHtml(item.semester) + '</span>' +
            '</div>' +
            '<div class="grade-card-actions-row">' + actionBtn + '</div>' +
          '</div>';

        list.appendChild(card);
      });

      list.querySelectorAll(".btn-grade-now").forEach(btn => {
        btn.addEventListener("click", () => {
          document.getElementById("grade-edit-id").value = "";
          document.getElementById("grade-subject").value = btn.getAttribute("data-subject");
          document.getElementById("grade-year").value = btn.getAttribute("data-year");
          document.getElementById("grade-semester").value = btn.getAttribute("data-semester");
          document.getElementById("grade-units").value = btn.getAttribute("data-units");
          document.getElementById("grade-value").value = "";
          openModal("grade-modal-overlay");
        });
      });

      list.querySelectorAll(".btn-delete-grade").forEach(btn => {
        btn.addEventListener("click", () => {
          showConfirm("Delete grade?", () => {
            withLoading(() => deleteGrade(btn.getAttribute("data-id"))).then(() => loadGrades()).catch(e => showToast(e.message, "error"));
          });
        });
      });

      // Calculate GWA
      var gradedItems = grades.filter(g => !g.exclude && !isNaN(g.grade) && (selYear === "all" || g.year === selYear) && (selSem === "all" || g.semester === selSem));
      if (gwaDisplay) {
        if (gradedItems.length > 0) {
          var totalWeighted = gradedItems.reduce((acc, g) => acc + (parseFloat(g.grade) * (parseFloat(g.units) || 3)), 0);
          var totalUnits = gradedItems.reduce((acc, g) => acc + (parseFloat(g.units) || 3), 0);
          gwaDisplay.textContent = (totalWeighted / totalUnits).toFixed(2);
        } else {
          gwaDisplay.textContent = "0.00";
        }
      }

    } catch (err) {
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load grades</p></div>';
    }
  }

  // LOAD CURRICULUM WITH VERTICAL ACADEMIC STRUCTURE & SYNCHRONIZATION
  async function loadCurriculum() {
    const list = document.getElementById("curriculum-subjects-list");
    if (!list) return;

    try {
      var currSubjects = await getCurriculumSubjects();
      var userSubjects = await getSubjects();
      var grades = await getGrades();

      // Map grades by subject name
      var gradeMap = {};
      grades.forEach(g => { if (g.subject) gradeMap[g.subject.toLowerCase()] = g.grade; });

      // Merge curriculum subjects with user subjects
      var mergedMap = {};
      currSubjects.forEach(s => { mergedMap[s.name.toLowerCase()] = s; });
      userSubjects.forEach(s => {
        if (!mergedMap[s.name.toLowerCase()]) {
          mergedMap[s.name.toLowerCase()] = {
            id: "user-" + s.id,
            name: s.name,
            code: s.code || "SUBJ",
            schedule: s.schedule || "N/A",
            year: s.year || "1st Year",
            semester: s.semester || "1st Semester",
          };
        }
      });

      var allItems = Object.values(mergedMap);

      // Selected filters
      var yearFilterBtn = document.querySelector(".curriculum-year-filter.active");
      var filterYear = yearFilterBtn ? yearFilterBtn.getAttribute("data-year") : "all";
      var semSelect = document.getElementById("curriculum-semester-filter");
      var filterSem = semSelect ? semSelect.value : "all";

      var filtered = allItems.filter(s => {
        var matchY = (filterYear === "all" || s.year === filterYear);
        var matchS = (filterSem === "all" || s.semester === filterSem);
        return matchY && matchS;
      });

      list.innerHTML = "";

      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-book-open"></i></div><p class="empty-title">No curriculum subjects found</p></div>';
        return;
      }

      // Group vertically by Academic Terms
      const termOrder = [
        "1st Year - 1st Semester", "1st Year - 2nd Semester", "1st Year - Summer / Midyear",
        "2nd Year - 1st Semester", "2nd Year - 2nd Semester", "2nd Year - Summer / Midyear",
        "3rd Year - 1st Semester", "3rd Year - 2nd Semester", "3rd Year - Summer / Midyear",
        "4th Year - 1st Semester", "4th Year - 2nd Semester", "4th Year - Summer / Midyear",
        "5th Year - 1st Semester", "5th Year - 2nd Semester", "5th Year - Summer / Midyear",
      ];

      var groups = {};
      filtered.forEach(item => {
        var key = (item.year || "1st Year") + " - " + (item.semester || "1st Semester");
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      termOrder.forEach(termKey => {
        if (groups[termKey] && groups[termKey].length > 0) {
          var termSec = document.createElement("div");
          termSec.className = "curriculum-term-section";

          var termHeader = document.createElement("div");
          termHeader.className = "curriculum-term-header";
          termHeader.innerHTML = '<i class="fas fa-graduation-cap"></i> ' + escapeHtml(termKey);
          termSec.appendChild(termHeader);

          groups[termKey].forEach(subj => {
            var gradeVal = gradeMap[subj.name.toLowerCase()];
            var gradeTag = gradeVal !== undefined && gradeVal !== null
              ? '<span class="cs-grade-badge cs-grade-graded"><i class="fas fa-check-circle"></i> Grade: ' + parseFloat(gradeVal).toFixed(2) + '</span>'
              : '<span class="cs-grade-badge cs-grade-ungraded"><i class="fas fa-clock"></i> Not Graded</span>';

            var card = document.createElement("div");
            card.className = "curriculum-subject-card";
            card.innerHTML =
              '<div class="cs-info">' +
                '<h4><span class="cs-code">' + escapeHtml(subj.code) + '</span> ' + escapeHtml(subj.name) + '</h4>' +
                '<div class="cs-meta">' +
                  '<span><i class="fas fa-clock"></i> ' + escapeHtml(subj.schedule || "No Schedule") + '</span>' +
                  gradeTag +
                '</div>' +
              '</div>';

            termSec.appendChild(card);
          });

          list.appendChild(termSec);
        }
      });

    } catch (err) {
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load curriculum</p></div>';
    }
  }

  async function loadClassmates() {
    const list = document.getElementById("classmates-list");
    if (!list) return;
    try {
      var userProf = getProfile();
      var classmates = await getSectionClassmates();
      list.innerHTML = "";

      if (classmates.length === 0) {
        list.innerHTML = '<div class="empty-state"><p class="empty-title">No classmates found</p></div>';
        return;
      }

      classmates.forEach(cm => {
        var card = document.createElement("div");
        card.className = "classmate-card";
        card.innerHTML =
          '<div class="classmate-avatar" style="background:' + stringToColor(cm.name) + '">' + initials(cm.name) + '</div>' +
          '<div class="classmate-info">' +
            '<h4>' + escapeHtml(cm.name) + '</h4>' +
            '<p><i class="fas fa-graduation-cap"></i> ' + escapeHtml(cm.course || "BSIT") + ' &bull; ' + escapeHtml(cm.year || "3rd Year") + '</p>' +
            '<p class="classmate-section"><i class="fas fa-users"></i> Section ' + escapeHtml(cm.section || "BSIT 3-A") + '</p>' +
          '</div>';
        list.appendChild(card);
      });
    } catch (e) {
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load classmates</p></div>';
    }
  }

  async function getSectionClassmates() {
    var userProf = getProfile();
    var currentUser = getCurrentUser();
    var mySection = userProf.section ? normalizeSection(userProf.section) : "";
    var result = [];

    if (currentUser && isSupabaseReady()) {
      try {
        var client = getSupabaseClient();
        var response = await withTimeout(client.from("profiles").select("*").neq("id", currentUser.id), 8000, "Classmates load");
        if (response.data) {
          response.data.forEach(p => {
            if (normalizeSection(p.section) === mySection || !mySection) {
              result.push({ name: p.full_name || p.email, course: p.course, year: p.year, section: p.section });
            }
          });
        }
      } catch (e) {}
    }

    DEMO_CLASSMATES.forEach(cm => {
      if (normalizeSection(cm.section) === mySection || !mySection) {
        if (!result.some(r => r.name.toLowerCase() === cm.name.toLowerCase())) {
          result.push(cm);
        }
      }
    });

    return result;
  }

  function loadFaqs() {
    const list = document.getElementById("faqs-list");
    if (!list) return;
    list.innerHTML = "";
    DEMO_FAQS.forEach(faq => {
      var div = document.createElement("div");
      div.className = "faq-item";
      div.innerHTML = '<div class="faq-question"><span>' + escapeHtml(faq.question) + '</span><i class="fas fa-chevron-down faq-chevron"></i></div><div class="faq-answer">' + escapeHtml(faq.answer) + '</div>';
      list.appendChild(div);
    });
    list.querySelectorAll(".faq-question").forEach(q => {
      q.addEventListener("click", () => q.parentElement.classList.toggle("open"));
    });
  }

  /* LOAD DASHBOARD */
  async function loadDashboard() {
    if (!isLoggedIn()) { showPage("login-page"); showLoginForm(); return; }
    var user = getCurrentUser();
    var name = user ? user.name : "Student";

    var dashName = document.getElementById("dash-user-name");
    var drawerName = document.getElementById("drawer-name");
    var drawerEmail = document.getElementById("drawer-email");
    if (dashName) dashName.textContent = name;
    if (drawerName) drawerName.textContent = name;
    if (drawerEmail) drawerEmail.textContent = user.email;

    try {
      showGlobalLoading();
      await loadPosts("");
      await loadSubjects();
      await loadSchedule();
      await loadAssignments();
      await loadGrades();
      await loadCurriculum();
      loadFaqs();
      switchView("view-home");
      startInactivityTimer();
    } catch (err) {
      showToast("Some data could not be loaded.", "warning");
    } finally {
      hideGlobalLoading();
    }
  }

  /* EVENT LISTENERS SETUP */
  function initEventListeners() {
    document.getElementById("show-signup")?.addEventListener("click", (e) => { e.preventDefault(); showSignupForm(); });
    document.getElementById("show-login")?.addEventListener("click", (e) => { e.preventDefault(); showLoginForm(); });

    document.querySelectorAll(".toggle-password").forEach(btn => {
      btn.addEventListener("click", () => {
        var input = document.getElementById(btn.getAttribute("data-target"));
        if (input) input.type = input.type === "password" ? "text" : "password";
      });
    });

    document.getElementById("login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      var email = document.getElementById("login-email")?.value;
      var pwd = document.getElementById("login-password")?.value;
      if (!isValidEmail(email) || !pwd) { showToast("Please fill in email and password.", "warning"); return; }
      var res = await withLoading(() => login(email, pwd));
      if (res.success) { showPage("dashboard-page"); loadDashboard(); showToast("Welcome back!", "success"); }
      else { showToast(res.message, "error"); }
    });

    document.getElementById("signup-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      var name = document.getElementById("signup-name")?.value;
      var email = document.getElementById("signup-email")?.value;
      var studentId = document.getElementById("signup-student-id")?.value;
      var year = document.getElementById("signup-year")?.value;
      var section = document.getElementById("signup-section")?.value;
      var pwd = document.getElementById("signup-password")?.value;

      var res = await withLoading(() => signup(name, email, pwd, studentId, year, section));
      if (res.success) { showPage("login-page"); showLoginForm(); showToast(res.message, "success"); }
      else { showToast(res.message, "error"); }
    });

    ["logout-btn", "drawer-logout-btn", "settings-logout-btn"].forEach(id => {
      document.getElementById(id)?.addEventListener("click", logout);
    });

    document.getElementById("hamburger-btn")?.addEventListener("click", openDrawer);
    document.getElementById("drawer-close-btn")?.addEventListener("click", closeDrawer);
    document.getElementById("side-drawer-overlay")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) closeDrawer(); });

    document.querySelectorAll(".drawer-item[data-view], .nav-item[data-view]").forEach(btn => {
      btn.addEventListener("click", () => switchView(btn.getAttribute("data-view")));
    });

    // DASHBOARD SEARCH
    var searchInput = document.getElementById("dashboard-search-input");
    if (searchInput) {
      var timer;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => loadPosts(e.target.value), 250);
      });
    }

    // SUBJECT FORM SUBMIT WITH YEAR & SEMESTER
    document.getElementById("add-subject-btn")?.addEventListener("click", () => {
      var uProf = getProfile();
      document.getElementById("subject-edit-id").value = "";
      document.getElementById("subject-name").value = "";
      document.getElementById("subject-code").value = "";
      document.getElementById("subject-professor").value = "";
      document.getElementById("subject-day").value = "";
      document.getElementById("subject-start-time").value = "";
      document.getElementById("subject-end-time").value = "";
      document.getElementById("subject-room").value = "";
      document.getElementById("subject-year").value = uProf.year || "3rd Year";
      document.getElementById("subject-semester").value = "1st Semester";
      openModal("subject-modal-overlay");
    });

    document.getElementById("close-subject-modal-btn")?.addEventListener("click", () => closeModal("subject-modal-overlay"));

    document.getElementById("subject-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      var data = {
        name: document.getElementById("subject-name").value,
        code: document.getElementById("subject-code").value,
        year: document.getElementById("subject-year").value,
        semester: document.getElementById("subject-semester").value,
        units: document.getElementById("subject-units").value,
        professor: document.getElementById("subject-professor").value,
        day: document.getElementById("subject-day").value,
        start_time: document.getElementById("subject-start-time").value,
        end_time: document.getElementById("subject-end-time").value,
        room: document.getElementById("subject-room").value,
      };

      if (!data.name || !data.year || !data.semester) {
        showToast("Please fill in subject name, year level, and semester.", "warning");
        return;
      }

      withLoading(() => addSubject(data)).then(() => {
        closeModal("subject-modal-overlay");
        loadSubjects();
        loadSchedule();
        loadGrades();
        loadCurriculum();
        showToast("Subject added & synchronized across schedule, grades, and curriculum!", "success");
      }).catch(err => showToast(err.message, "error"));
    });

    // SUBJECT FILTERS & CURRENT TERM PREFERENCE
    var subjectsYearFilter = document.getElementById("subjects-year-filter");
    var subjectsSemFilter = document.getElementById("subjects-semester-filter");
    var subjectsCurrentCb = document.getElementById("subjects-current-term-only");

    [subjectsYearFilter, subjectsSemFilter].forEach(el => el?.addEventListener("change", loadSubjects));
    subjectsCurrentCb?.addEventListener("change", async () => {
      if (subjectsCurrentCb.checked) {
        await saveProfile({ filter_current_subjects_only: true });
        showToast("Current term view set as default for subjects.", "info");
      } else {
        await saveProfile({ filter_current_subjects_only: false });
      }
      loadSubjects();
    });

    // SCHEDULE FILTERS & CURRENT TERM PREFERENCE
    var scheduleYearFilter = document.getElementById("schedule-year-filter");
    var scheduleSemFilter = document.getElementById("schedule-semester-filter");
    var scheduleCurrentCb = document.getElementById("schedule-current-term-only");

    [scheduleYearFilter, scheduleSemFilter].forEach(el => el?.addEventListener("change", loadSchedule));
    scheduleCurrentCb?.addEventListener("change", async () => {
      if (scheduleCurrentCb.checked) {
        await saveProfile({ filter_current_schedule_only: true });
        showToast("Current term view set as default for schedule.", "info");
      } else {
        await saveProfile({ filter_current_schedule_only: false });
      }
      loadSchedule();
    });

    // GRADE FILTERS
    document.getElementById("grade-year-filter")?.addEventListener("change", loadGrades);
    document.getElementById("grade-semester-filter")?.addEventListener("change", loadGrades);

    document.getElementById("add-grade-btn")?.addEventListener("click", () => {
      document.getElementById("grade-edit-id").value = "";
      document.getElementById("grade-subject").value = "";
      document.getElementById("grade-value").value = "";
      openModal("grade-modal-overlay");
    });
    document.getElementById("close-grade-modal-btn")?.addEventListener("click", () => closeModal("grade-modal-overlay"));

    document.getElementById("grade-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      var subject = document.getElementById("grade-subject").value;
      var val = document.getElementById("grade-value").value;
      var units = document.getElementById("grade-units").value;
      var year = document.getElementById("grade-year").value;
      var sem = document.getElementById("grade-semester").value;
      var exclude = document.getElementById("grade-exclude").checked;

      withLoading(() => addGrade(subject, val, units, year, sem, exclude)).then(() => {
        closeModal("grade-modal-overlay");
        loadGrades();
        loadCurriculum();
        showToast("Grade updated!", "success");
      }).catch(err => showToast(err.message, "error"));
    });

    // CURRICULUM FILTERS
    document.querySelectorAll(".curriculum-year-filter").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".curriculum-year-filter").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadCurriculum();
      });
    });
    document.getElementById("curriculum-semester-filter")?.addEventListener("change", loadCurriculum);

    // POST MODAL
    document.getElementById("open-composer-btn")?.addEventListener("click", () => openModal("post-modal-overlay"));
    document.getElementById("close-modal-btn")?.addEventListener("click", () => closeModal("post-modal-overlay"));

    document.getElementById("submit-post-btn")?.addEventListener("click", () => {
      var content = document.getElementById("post-content-editable")?.innerHTML.trim();
      if (!content) return;
      withLoading(() => createPost(content, null)).then(() => {
        closeModal("post-modal-overlay");
        document.getElementById("post-content-editable").innerHTML = "";
        loadPosts("");
        showToast("Post created!", "success");
      }).catch(e => showToast(e.message, "error"));
    });
  }

  function init() {
    initializeSupabase();
    initEventListeners();

    getRemoteSession().then(remote => {
      if (remote.session && remote.session.user) {
        saveRemoteUserSession(remote.session.user);
        loadRemoteProfile().then(() => {
          showPage("dashboard-page");
          loadDashboard();
        });
      } else {
        showPage("login-page");
        showLoginForm();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
