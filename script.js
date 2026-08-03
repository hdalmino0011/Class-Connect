/* file: script.js - ClassConnect Complete Application Script */

// Supabase Configuration
const SUPABASE_URL = "https://uctodqnrwrroppkaggbl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjdG9kcW5yd3Jyb3Bwa2FnZ2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODk0NDYsImV4cCI6MjEwMTI2NTQ0Nn0.EwFU5LmczD8PLLeV0jTFvWxnuMzL65xy_zpkZEAV3NA";

/*
 * Supabase bootstrap — same as before
 */
let supabaseClient = null;
let supabaseStatus = "not-initialized";
let remoteUser = null;
let remoteProfile = null;

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
          data: {
            subscription: {
              unsubscribe: function () {},
            },
          },
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
      supabaseClient = createSupabaseFallback(
        "Supabase SDK is not loaded. Check that the Supabase script tag appears before script.js."
      );
      return supabaseClient;
    }

    var client = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    if (!client || !client.auth || typeof client.auth.getSession !== "function") {
      throw new Error("Supabase client was created without a working auth API.");
    }

    supabaseClient = client;
    supabaseStatus = "ready";
    console.log("[ClassConnect] Supabase initialized successfully.");
    return supabaseClient;
  } catch (error) {
    supabaseStatus = "fallback";
    console.error("[ClassConnect] Supabase initialization failed:", error);
    supabaseClient = createSupabaseFallback(error.message || "Unknown initialization error");
    return supabaseClient;
  }
}

function getSupabaseClient() {
  return initializeSupabase();
}

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
  return supabaseStatus === "ready" &&
    client &&
    client.auth &&
    typeof client.auth.getSession === "function";
}

function isTransientSupabaseError(error) {
  var message = error && error.message ? String(error.message).toLowerCase() : "";
  return !navigator.onLine ||
    message.indexOf("failed to fetch") !== -1 ||
    message.indexOf("network") !== -1 ||
    message.indexOf("timeout") !== -1 ||
    message.indexOf("timed out") !== -1;
}

function authUserName(authUser) {
  if (!authUser) return "Student";
  var metadata = authUser.user_metadata || {};
  return metadata.full_name || metadata.name || authUser.email || "Student";
}

function getRemoteSession() {
  var client = getSupabaseClient();
  if (!isSupabaseReady()) {
    var unavailable = new Error(
      "Supabase is unavailable. Check the Supabase project URL, SDK, and network connection."
    );
    return Promise.resolve({ session: null, error: unavailable, available: false });
  }

  console.log("[ClassConnect] Checking Supabase session...");
  return withTimeout(client.auth.getSession(), 5000, "Supabase session check")
    .then(function (result) {
      if (result && result.error) {
        console.error("[ClassConnect] Supabase session check returned an error:", result.error);
        return { session: null, error: result.error, available: true };
      }
      var session = result && result.data ? result.data.session : null;
      console.log("[ClassConnect] Supabase session check complete:", session ? "session found" : "no session");
      return { session: session || null, error: null, available: true };
    })
    .catch(function (error) {
      console.error("[ClassConnect] Supabase session check failed:", error);
      return { session: null, error: error, available: true };
    });
}

(function () {
  "use strict";

  // Remove all localStorage data keys for user data; we'll use Supabase for everything.
  // Only keep settings (localStorage) for font type preference, etc.
  const KEYS = {
    SETTINGS: "cc_settings",
    // Keep only settings; everything else will be in Supabase
  };

  const ADMIN_EMAILS = ["admin@classconnect.com", "admin@hddev.com"];

  const DEMO_CLASSMATES = [
    { name: "Maria Delacruz", course: "BSIT", year: "3rd Year", section: "BSIT 3-A", email: "maria.delacruz@ctu.edu.ph", bio: "Aspiring Web Developer & UI Designer" },
    { name: "Juan Reyes", course: "BSIT", year: "3rd Year", section: "BSIT 3-A", email: "juan.reyes@ctu.edu.ph", bio: "Tech Enthusiast and Mobile App Developer" },
    { name: "Anna Santos", course: "BSIT", year: "3rd Year", section: "BSIT 3-B", email: "anna.santos@ctu.edu.ph", bio: "Data Analyst & Database Administrator" },
    { name: "Carlos Garcia", course: "BSIT", year: "3rd Year", section: "BSIT 3-A", email: "carlos.garcia@ctu.edu.ph", bio: "Cybersecurity student & Networking enthusiast" },
    { name: "Lisa Tan", course: "BSIT", year: "3rd Year", section: "BSIT 3-B", email: "lisa.tan@ctu.edu.ph", bio: "AI & Machine Learning student" },
  ];

  const DEMO_FAQS = [
    { question: "What is ClassConnect?", answer: "ClassConnect is a platform designed to help college students connect with classmates, manage subjects, track assignments, calculate GWA, and stay organized throughout their academic journey." },
    { question: "How do I create an account?", answer: "Click on Sign Up on the login page, fill in your full name, email address, and a password of at least 6 characters, then confirm your password and submit." },
    { question: "How are classmates matched?", answer: "Classmates are automatically matched based on your section in your Profile (e.g. BSIT 3-A). Ensure your section is filled in accurately!" },
    { question: "Can I access ClassConnect on multiple devices?", answer: "Yes. ClassConnect is a Progressive Web App that works seamlessly on both mobile phones and desktop computers." },
    { question: "How do I add a subject?", answer: "Go to the Subjects page from the menu, click the Add Subject button, fill in the subject name, professor, and schedule, then click Save." },
    { question: "How do I track my assignments?", answer: "Navigate to the Assignments page, click Add Task to create new tasks, and check them off as you complete them using the checkbox." },
    { question: "How does the Grades page work?", answer: "Enter your grade for each subject along with its units/credits, year level, and semester. The app automatically calculates your General Weighted Average (GWA). You can also exclude PE/NSTP subjects." },
    { question: "How does the Curriculum section work?", answer: "You can organize college subjects by Year Level and Semester, or upload your official curriculum PDF syllabus for instant offline access." },
    { question: "Is my data safe?", answer: "Yes. All your data — profile, subjects, assignments, grades, schedule, curriculum, and posts — is stored in Supabase, a cloud-hosted PostgreSQL database. Supabase enforces Row-Level Security (RLS) on every table, so only your authenticated account can read or modify your records. The only item stored locally on your device is your font preference setting (font family choice)." },
  ];

  // ===== INACTIVITY AUTO-LOGOUT =====
  var INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
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
    if (!overlay) return;
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
  }

  function hideInactivityModal() {
    var overlay = document.getElementById("inactivity-modal-overlay");
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }

  function triggerInactivityLogout() {
    if (!isLoggedIn()) return;
    console.log("[ClassConnect] Inactivity timeout — logging out automatically.");
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

  /* UTILITY FUNCTIONS */
  function cryptoId() {
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  }

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

  // ===== FIXED: timeAgo now handles ISO string timestamps from Supabase =====
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

  // ===== NEW: Format timestamp in Philippine time (Asia/Manila, UTC+8) =====
  function formatTimestampPHT(timestamp) {
    if (!timestamp) return "Just now";
    var date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Just now";
    try {
      var opts = {
        timeZone: "Asia/Manila",
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      };
      return date.toLocaleString("en-PH", opts) + " PHT";
    } catch (e) {
      return date.toLocaleString();
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function normalizeSection(section) {
    if (!section) return "";
    return section.trim().toUpperCase();
  }

  // Legacy getData/setData for settings only
  function getData(key, defaultVal) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function setData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      showToast("Storage is full. Some data may not be saved.", "error");
    }
  }

  function stringToColor(str) {
    if (!str) return "#2563EB";
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var palette = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#84CC16"];
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
    return ADMIN_EMAILS.some(function (email) {
      return user.email.toLowerCase() === email.toLowerCase();
    });
  }

  /* ===== NEW: GLOBAL LOADING OVERLAY ===== */
  var loadingDepth = 0;

  function showGlobalLoading() {
    loadingDepth++;
    var overlay = document.getElementById("global-loading-overlay");
    if (overlay) {
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("cc-global-loading");
  }

  function hideGlobalLoading() {
    if (loadingDepth > 0) loadingDepth--;
    if (loadingDepth === 0) {
      var overlay = document.getElementById("global-loading-overlay");
      if (overlay) {
        overlay.classList.remove("active");
        overlay.setAttribute("aria-hidden", "true");
      }
      document.body.classList.remove("cc-global-loading");
    }
  }

  // Run an async function with the global loading overlay shown around it
  function withLoading(fn) {
    showGlobalLoading();
    return Promise.resolve()
      .then(fn)
      .then(function (result) { hideGlobalLoading(); return result; })
      .catch(function (err) { hideGlobalLoading(); throw err; });
  }

  function showToast(message, type) {
    type = type || "success";
    var existing = document.getElementById("cc-toast");
    if (existing) existing.remove();
    var iconMap = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info",
    };
    var toast = document.createElement("div");
    toast.id = "cc-toast";
    toast.className = "cc-toast cc-toast-" + type;
    toast.innerHTML =
      '<i class="fas ' + (iconMap[type] || "fa-circle-info") + ' toast-icon"></i>' +
      '<span class="toast-msg">' + escapeHtml(message) + '</span>' +
      '<button class="toast-close" aria-label="Close"><i class="fas fa-xmark"></i></button>';
    document.body.appendChild(toast);
    toast.querySelector(".toast-close").addEventListener("click", function () {
      dismissToast(toast);
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add("cc-toast-show");
      });
    });
    var timer = setTimeout(function () { dismissToast(toast); }, 3500);
    toast._timer = timer;
  }

  function dismissToast(toast) {
    if (!toast) return;
    clearTimeout(toast._timer);
    toast.classList.remove("cc-toast-show");
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 380);
  }

  function showConfirm(message, onConfirm) {
    var existing = document.getElementById("cc-confirm-overlay");
    if (existing) existing.remove();
    var overlay = document.createElement("div");
    overlay.id = "cc-confirm-overlay";
    overlay.className = "cc-confirm-overlay";
    overlay.innerHTML =
      '<div class="cc-confirm-box" role="dialog" aria-modal="true">' +
        '<div class="cc-confirm-icon-wrap">' +
          '<i class="fas fa-triangle-exclamation"></i>' +
        '</div>' +
        '<p class="cc-confirm-msg">' + escapeHtml(message) + '</p>' +
        '<div class="cc-confirm-btns">' +
          '<button class="cc-confirm-cancel">Cancel</button>' +
          '<button class="cc-confirm-ok">Confirm</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add("active");
      });
    });
    function closeConfirm() {
      overlay.classList.remove("active");
      setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 300);
    }
    overlay.querySelector(".cc-confirm-cancel").addEventListener("click", closeConfirm);
    overlay.querySelector(".cc-confirm-ok").addEventListener("click", function () {
      closeConfirm();
      if (typeof onConfirm === "function") onConfirm();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeConfirm();
    });
  }

  function showSuccessModal(message, buttonText, onButtonClick) {
    var existing = document.getElementById("cc-success-overlay");
    if (existing) existing.remove();
    var overlay = document.createElement("div");
    overlay.id = "cc-success-overlay";
    overlay.className = "cc-success-overlay";
    overlay.innerHTML =
      '<div class="cc-success-box" role="dialog" aria-modal="true">' +
        '<div class="cc-success-icon-wrap">' +
          '<i class="fas fa-check-circle"></i>' +
        '</div>' +
        '<h3 class="cc-success-title">Success!</h3>' +
        '<p class="cc-success-msg">' + escapeHtml(message) + '</p>' +
        '<button class="cc-success-btn btn-primary">' + escapeHtml(buttonText || "OK") + '</button>' +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add("active");
      });
    });
    function closeSuccess() {
      overlay.classList.remove("active");
      setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 300);
    }
    overlay.querySelector(".cc-success-btn").addEventListener("click", function () {
      closeSuccess();
      if (typeof onButtonClick === "function") onButtonClick();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        closeSuccess();
        if (typeof onButtonClick === "function") onButtonClick();
      }
    });
  }

  function getCurrentUser() { return remoteUser; }

  function isLoggedIn() {
    return !!(remoteUser && remoteUser.email && remoteUser.provider === "supabase");
  }

  // ---------- Supabase data helpers ----------
  function supabaseTable(tableName) {
    var client = getSupabaseClient();
    if (!isSupabaseReady()) {
      throw new Error("Supabase is not available.");
    }
    return client.from(tableName);
  }

  async function withAuthCheck(fn) {
    if (!isLoggedIn()) {
      throw new Error("You must be logged in.");
    }
    return fn();
  }

  // ===== POSTS =====
  async function getPosts() {
    return withAuthCheck(async function () {
      var result = await withTimeout(
        supabaseTable("posts")
          .select("*")
          .order("timestamp", { ascending: false }),
        8000,
        "Posts load"
      );
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
        timestamp: new Date().toISOString(),
      };
      var result = await withTimeout(
        supabaseTable("posts").insert(post).select().single(),
        8000,
        "Post create"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updatePost(id, content) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("posts")
          .update({ content: content.trim() })
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single(),
        8000,
        "Post update"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deletePost(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("posts")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id),
        8000,
        "Post delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  // ===== POST ACKNOWLEDGMENTS =====
  async function getPostAcknowledgments(postId) {
    return withAuthCheck(async function () {
      var result = await withTimeout(
        supabaseTable("post_acknowledgments")
          .select("*")
          .eq("post_id", postId),
        8000,
        "Acknowledgments load"
      );
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function toggleAcknowledgePost(postId) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      // Check if already acknowledged
      var existing = await withTimeout(
        supabaseTable("post_acknowledgments")
          .select("*")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle(),
        8000,
        "Acknowledgment check"
      );
      if (existing.error) throw existing.error;
      if (existing.data) {
        // Remove acknowledgment
        var del = await withTimeout(
          supabaseTable("post_acknowledgments")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id),
          8000,
          "Acknowledgment remove"
        );
        if (del.error) throw del.error;
        return false; // now not acknowledged
      } else {
        // Add acknowledgment
        var newAck = {
          post_id: postId,
          user_id: user.id,
          name: user.name || "Student",
          email: user.email,
        };
        var ins = await withTimeout(
          supabaseTable("post_acknowledgments").insert(newAck).select().single(),
          8000,
          "Acknowledgment add"
        );
        if (ins.error) throw ins.error;
        return true; // now acknowledged
      }
    });
  }

  async function hasAcknowledgedPost(postId) {
    try {
      var acks = await getPostAcknowledgments(postId);
      var user = getCurrentUser();
      return acks.some(function (a) { return a.user_id === user.id; });
    } catch (e) {
      return false;
    }
  }

  // ===== COMMENTS =====
  async function getCommentsForPosts(postIds) {
    if (!postIds || postIds.length === 0) return [];
    return withAuthCheck(async function () {
      var result = await withTimeout(
        supabaseTable("comments")
          .select("*")
          .in("post_id", postIds)
          .order("created_at", { ascending: true }),
        8000,
        "Comments load"
      );
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addComment(postId, content) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var comment = {
        post_id: postId,
        user_id: user.id,
        author: user.name || "Student",
        content: content.trim(),
        created_at: new Date().toISOString(),
      };
      var result = await withTimeout(
        supabaseTable("comments").insert(comment).select().single(),
        8000,
        "Comment add"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteComment(commentId) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("comments")
          .delete()
          .eq("id", commentId)
          .eq("user_id", user.id),
        8000,
        "Comment delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  // ===== SUBJECTS =====
  async function getSubjects() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("subjects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        8000,
        "Subjects load"
      );
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addSubject(name, professor, schedule) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var colors = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];
      var existing = await getSubjects();
      var color = colors[existing.length % colors.length];
      var newSubject = {
        user_id: user.id,
        name: name.trim(),
        professor: professor.trim(),
        schedule: schedule.trim(),
        color: color,
        tasks: [],
      };
      var result = await withTimeout(
        supabaseTable("subjects").insert(newSubject).select().single(),
        8000,
        "Subject add"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updateSubject(id, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("subjects")
          .update(data)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single(),
        8000,
        "Subject update"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteSubject(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("subjects")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id),
        8000,
        "Subject delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  async function addSubjectTask(subjectId, text) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      // Fetch current subject
      var subj = await withTimeout(
        supabaseTable("subjects")
          .select("tasks")
          .eq("id", subjectId)
          .eq("user_id", user.id)
          .single(),
        8000,
        "Subject fetch"
      );
      if (subj.error) throw subj.error;
      var tasks = subj.data.tasks || [];
      var newTask = { id: cryptoId(), text: text.trim(), completed: false };
      tasks.push(newTask);
      var result = await withTimeout(
        supabaseTable("subjects")
          .update({ tasks: tasks })
          .eq("id", subjectId)
          .eq("user_id", user.id)
          .select()
          .single(),
        8000,
        "Subject task add"
      );
      if (result.error) throw result.error;
      return newTask;
    });
  }

  async function toggleSubjectTask(subjectId, taskId) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var subj = await withTimeout(
        supabaseTable("subjects")
          .select("tasks")
          .eq("id", subjectId)
          .eq("user_id", user.id)
          .single(),
        8000,
        "Subject fetch"
      );
      if (subj.error) throw subj.error;
      var tasks = subj.data.tasks || [];
      var task = tasks.find(function (t) { return t.id === taskId; });
      if (task) {
        task.completed = !task.completed;
        var result = await withTimeout(
          supabaseTable("subjects")
            .update({ tasks: tasks })
            .eq("id", subjectId)
            .eq("user_id", user.id),
          8000,
          "Subject task toggle"
        );
        if (result.error) throw result.error;
        return true;
      }
      return false;
    });
  }

  async function deleteSubjectTask(subjectId, taskId) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var subj = await withTimeout(
        supabaseTable("subjects")
          .select("tasks")
          .eq("id", subjectId)
          .eq("user_id", user.id)
          .single(),
        8000,
        "Subject fetch"
      );
      if (subj.error) throw subj.error;
      var tasks = subj.data.tasks || [];
      var newTasks = tasks.filter(function (t) { return t.id !== taskId; });
      var result = await withTimeout(
        supabaseTable("subjects")
          .update({ tasks: newTasks })
          .eq("id", subjectId)
          .eq("user_id", user.id),
        8000,
        "Subject task delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  // ===== SCHEDULE =====
  async function getSchedule() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("schedule")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        8000,
        "Schedule load"
      );
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addScheduleItem(subject, day, startTime, endTime, room) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var item = {
        user_id: user.id,
        subject: subject.trim(),
        day: day.trim(),
        start_time: startTime,
        end_time: endTime,
        room: room.trim(),
      };
      var result = await withTimeout(
        supabaseTable("schedule").insert(item).select().single(),
        8000,
        "Schedule add"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updateScheduleItem(id, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("schedule")
          .update(data)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single(),
        8000,
        "Schedule update"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteScheduleItem(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("schedule")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id),
        8000,
        "Schedule delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  // ===== ASSIGNMENTS =====
  async function getAssignments() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("assignments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        8000,
        "Assignments load"
      );
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addAssignment(text, subject, dueDate) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var item = {
        user_id: user.id,
        text: text.trim(),
        subject: subject.trim(),
        due_date: dueDate || "",
        completed: false,
      };
      var result = await withTimeout(
        supabaseTable("assignments").insert(item).select().single(),
        8000,
        "Assignment add"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function toggleAssignment(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      // Fetch current status
      var current = await withTimeout(
        supabaseTable("assignments")
          .select("completed")
          .eq("id", id)
          .eq("user_id", user.id)
          .single(),
        8000,
        "Assignment fetch"
      );
      if (current.error) throw current.error;
      var newCompleted = !current.data.completed;
      var result = await withTimeout(
        supabaseTable("assignments")
          .update({ completed: newCompleted })
          .eq("id", id)
          .eq("user_id", user.id),
        8000,
        "Assignment toggle"
      );
      if (result.error) throw result.error;
      return newCompleted;
    });
  }

  async function deleteAssignment(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("assignments")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id),
        8000,
        "Assignment delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  // ===== GRADES =====
  async function getGrades() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("grades")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        8000,
        "Grades load"
      );
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
      var result = await withTimeout(
        supabaseTable("grades").insert(item).select().single(),
        8000,
        "Grade add"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updateGrade(id, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("grades")
          .update(data)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single(),
        8000,
        "Grade update"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteGrade(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("grades")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id),
        8000,
        "Grade delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  async function toggleGradeExclude(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var current = await withTimeout(
        supabaseTable("grades")
          .select("exclude")
          .eq("id", id)
          .eq("user_id", user.id)
          .single(),
        8000,
        "Grade fetch"
      );
      if (current.error) throw current.error;
      var newExclude = !current.data.exclude;
      var result = await withTimeout(
        supabaseTable("grades")
          .update({ exclude: newExclude })
          .eq("id", id)
          .eq("user_id", user.id),
        8000,
        "Grade exclude toggle"
      );
      if (result.error) throw result.error;
      return newExclude;
    });
  }

  // ===== CURRICULUM SUBJECTS =====
  async function getCurriculumSubjects() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("curriculum_subjects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        8000,
        "Curriculum subjects load"
      );
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  async function addCurriculumSubject(name, code, schedule, year, semester) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var item = {
        user_id: user.id,
        name: name.trim(),
        code: code.trim(),
        schedule: schedule.trim(),
        year: year.trim(),
        semester: semester || "1st Semester",
      };
      var result = await withTimeout(
        supabaseTable("curriculum_subjects").insert(item).select().single(),
        8000,
        "Curriculum subject add"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function updateCurriculumSubject(id, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("curriculum_subjects")
          .update(data)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single(),
        8000,
        "Curriculum subject update"
      );
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function deleteCurriculumSubject(id) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("curriculum_subjects")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id),
        8000,
        "Curriculum subject delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  // ===== CURRICULUM PDF =====
  async function getCurriculumPDF() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("curriculum_pdf")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        8000,
        "Curriculum PDF load"
      );
      if (result.error) throw result.error;
      return result.data || null;
    });
  }

  async function saveCurriculumPDF(name, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await getCurriculumPDF();
      var payload = {
        user_id: user.id,
        name: name.trim(),
        data: data,
      };
      var result;
      if (existing) {
        result = await withTimeout(
          supabaseTable("curriculum_pdf")
            .update(payload)
            .eq("id", existing.id)
            .eq("user_id", user.id)
            .select()
            .single(),
          8000,
          "Curriculum PDF update"
        );
      } else {
        result = await withTimeout(
          supabaseTable("curriculum_pdf").insert(payload).select().single(),
          8000,
          "Curriculum PDF insert"
        );
      }
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function removeCurriculumPDF() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await getCurriculumPDF();
      if (!existing) return true;
      var result = await withTimeout(
        supabaseTable("curriculum_pdf")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", user.id),
        8000,
        "Curriculum PDF delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  // ===== COR PDF =====
  async function getCORPDF() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var result = await withTimeout(
        supabaseTable("cor_pdf")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        8000,
        "COR PDF load"
      );
      if (result.error) throw result.error;
      return result.data || null;
    });
  }

  async function saveCORPDF(name, data) {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await getCORPDF();
      var payload = {
        user_id: user.id,
        name: name.trim(),
        data: data,
      };
      var result;
      if (existing) {
        result = await withTimeout(
          supabaseTable("cor_pdf")
            .update(payload)
            .eq("id", existing.id)
            .eq("user_id", user.id)
            .select()
            .single(),
          8000,
          "COR PDF update"
        );
      } else {
        result = await withTimeout(
          supabaseTable("cor_pdf").insert(payload).select().single(),
          8000,
          "COR PDF insert"
        );
      }
      if (result.error) throw result.error;
      return result.data;
    });
  }

  async function removeCORPDF() {
    return withAuthCheck(async function () {
      var user = getCurrentUser();
      var existing = await getCORPDF();
      if (!existing) return true;
      var result = await withTimeout(
        supabaseTable("cor_pdf")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", user.id),
        8000,
        "COR PDF delete"
      );
      if (result.error) throw result.error;
      return true;
    });
  }

  // ===== Save profile =====
  async function saveProfile(data) {
    const user = getCurrentUser();
    if (!user || !isSupabaseReady()) {
      throw new Error("No active Supabase session is available.");
    }
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
    return { name: user.name, email: user.email, section: "BSIT 3-A" };
  }

  function getProfilePhoto() {
    return getProfile().photo || null;
  }

  async function saveProfilePhoto(base64) {
    const p = getProfile();
    p.photo = base64;
    return saveProfile(p);
  }

  // Legacy auth functions (now use Supabase)
  function saveRemoteUserSession(authUser) {
    if (!authUser || !authUser.email) {
      console.warn("[ClassConnect] Supabase returned no authenticated user.");
      remoteUser = null;
      return null;
    }
    remoteUser = {
      id: authUser.id || cryptoId(),
      name: authUserName(authUser),
      email: authUser.email.trim().toLowerCase(),
      provider: "supabase",
    };
    return remoteUser;
  }

  function profileToRemoteRow(profile, user) {
    var source = profile || {};
    return {
      id: user.id,
      email: user.email,
      full_name: source.name || user.name || "Student",
      bio: source.bio || "",
      student_id: source.studentId || "",
      course: source.course || "",
      year: source.year || "",
      section: source.section || "BSIT 3-A",
      contact: source.contact || "",
      birthdate: source.birthdate || null,
      gender: source.gender || "",
      address: source.address || "",
      emergency: source.emergency || "",
      guardian_name: source.guardianName || "",
      guardian_contact: source.guardianContact || "",
      photo: source.photo || null,
    };
  }

  function remoteRowToProfile(row, user) {
    var current = row || {};
    return {
      name: current.full_name || (user && user.name) || "Student",
      email: current.email || (user && user.email) || "",
      bio: current.bio || "",
      studentId: current.student_id || "",
      course: current.course || "",
      year: current.year || "",
      section: current.section || "BSIT 3-A",
      contact: current.contact || "",
      birthdate: current.birthdate || "",
      gender: current.gender || "",
      address: current.address || "",
      emergency: current.emergency || "",
      guardianName: current.guardian_name || "",
      guardianContact: current.guardian_contact || "",
      photo: current.photo || null,
    };
  }

  async function loadRemoteProfile() {
    var user = getCurrentUser();
    if (!user || !isSupabaseReady()) return null;
    var client = getSupabaseClient();
    var response = await withTimeout(
      client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      8000,
      "Supabase profile load"
    );
    if (response.error) {
      console.error("[ClassConnect] Supabase profile load failed:", response.error);
      throw response.error;
    }
    remoteProfile = remoteRowToProfile(response.data, user);
    return remoteProfile;
  }

  async function upsertRemoteProfile(profile) {
    var user = getCurrentUser();
    if (!user || !isSupabaseReady()) {
      throw new Error("No active Supabase session is available.");
    }
    var client = getSupabaseClient();
    var response = await withTimeout(
      client.from("profiles").upsert(profileToRemoteRow(profile, user), { onConflict: "id" }).select().single(),
      8000,
      "Supabase profile save"
    );
    if (response.error) {
      console.error("[ClassConnect] Supabase profile save failed:", response.error);
      throw response.error;
    }
    remoteProfile = remoteRowToProfile(response.data, user);
    return remoteProfile;
  }

  // ===== AUTH functions =====
  async function signup(name, email, password) {
    console.log("[ClassConnect] Signup requested for:", email);

    if (!isSupabaseReady()) {
      return {
        success: false,
        message: "Supabase is unavailable. Your account was not created. Please check the connection and try again.",
      };
    }

    try {
      var client = getSupabaseClient();
      var response = await withTimeout(
        client.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: { full_name: name.trim(), name: name.trim() },
          },
        }),
        8000,
        "Supabase signup"
      );

      if (!response || response.error) {
        var signupError = response && response.error
          ? response.error
          : new Error("Supabase returned an empty signup response.");
        console.error("[ClassConnect] Supabase signup failed:", signupError);
        return { success: false, message: signupError.message || "Unable to create your account." };
      }

      var createdUser = response.data && response.data.user;
      if (!createdUser) {
        return { success: false, message: "Supabase did not return a new user. Your account was not created." };
      }

      if (response.data.session) {
        saveRemoteUserSession(createdUser);
        await upsertRemoteProfile({
          name: name.trim(),
          section: "BSIT 3-A",
          course: "BSIT",
          year: "3rd Year",
        });
      }
      console.log(
        "[ClassConnect] Supabase signup succeeded:",
        response.data.session ? "signed in" : "email confirmation required"
      );
      return {
        success: true,
        confirmationRequired: !response.data.session,
        message: response.data.session
          ? "Your Supabase account has been created successfully!"
          : "Your Supabase account was created. Check your email to confirm it, then log in.",
      };
    } catch (error) {
      console.error("[ClassConnect] Supabase signup exception:", error);
      return {
        success: false,
        message: isTransientSupabaseError(error)
          ? "Could not reach Supabase. Your account was not created. Please try again."
          : error.message || "Unable to create your account.",
      };
    }
  }

  async function login(email, password) {
    console.log("[ClassConnect] Login requested for:", email);

    if (!isSupabaseReady()) {
      return {
        success: false,
        message: "Supabase is unavailable. Local login is disabled. Please check the connection and try again.",
      };
    }

    try {
      var client = getSupabaseClient();
      var response = await withTimeout(
        client.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        }),
        8000,
        "Supabase login"
      );

      if (!response || response.error) {
        var authError = response && response.error
          ? response.error
          : new Error("Supabase returned an empty login response.");
        console.error("[ClassConnect] Supabase login failed:", authError);
        return {
          success: false,
          message: isTransientSupabaseError(authError)
            ? "Could not reach Supabase. Local login is disabled. Please try again."
            : authError.message || "Invalid email or password.",
        };
      }
      if (!response.data || !response.data.user) {
        return { success: false, message: "Supabase did not return an authenticated user." };
      }
      saveRemoteUserSession(response.data.user);
      await loadRemoteProfile();
      console.log("[ClassConnect] Supabase login succeeded.");
      return { success: true, remote: true };
    } catch (error) {
      console.error("[ClassConnect] Supabase login exception:", error);
      return {
        success: false,
        message: isTransientSupabaseError(error)
          ? "Could not reach Supabase. Local login is disabled. Please try again."
          : error.message || "Unable to sign in.",
      };
    }
  }

  function logout() {
    showConfirm("Are you sure you want to log out?", function () {
      console.log("[ClassConnect] Logout requested.");
      var client = getSupabaseClient();
      var remoteLogout = isSupabaseReady() && client.auth && typeof client.auth.signOut === "function"
        ? withTimeout(client.auth.signOut(), 5000, "Supabase logout").catch(function (error) {
            console.warn("[ClassConnect] Supabase logout failed; clearing local session anyway:", error);
          })
        : Promise.resolve();
      remoteLogout.then(function () {
        stopInactivityTimer();
        remoteUser = null;
        remoteProfile = null;
        closeDrawer();
        closeAllModals();
        switchView("view-home");
        showPage("login-page");
        showLoginForm();
        console.log("[ClassConnect] Logout complete.");
        showToast("You have been logged out.", "info");
      });
    });
  }

  // Password change
  async function changePassword(currentPwd, newPwd, confirmPwd) {
    if (!currentPwd || !newPwd || !confirmPwd) {
      return { success: false, message: "Please fill in all password fields." };
    }
    if (newPwd.length < 6) {
      return { success: false, message: "New password must be at least 6 characters." };
    }
    if (newPwd !== confirmPwd) {
      return { success: false, message: "New passwords do not match." };
    }
    var user = getCurrentUser();
    if (!user) return { success: false, message: "Not logged in." };
    if (!isSupabaseReady()) {
      return { success: false, message: "Supabase is unavailable. Password was not changed." };
    }
    try {
      var client = getSupabaseClient();
      var verify = await withTimeout(
        client.auth.signInWithPassword({ email: user.email, password: currentPwd }),
        8000,
        "Supabase password verification"
      );
      if (!verify || verify.error) {
        return { success: false, message: (verify && verify.error && verify.error.message) || "Current password is incorrect." };
      }
      var response = await withTimeout(
        client.auth.updateUser({ password: newPwd }),
        8000,
        "Supabase password update"
      );
      if (response && response.error) {
        return { success: false, message: response.error.message || "Unable to update your password." };
      }
      return { success: true, message: "Password updated successfully in Supabase." };
    } catch (error) {
      console.error("[ClassConnect] Supabase password update failed:", error);
      return {
        success: false,
        message: isTransientSupabaseError(error)
          ? "Could not reach Supabase. Password was not changed."
          : error.message || "Unable to update your password.",
      };
    }
  }

  // ===== UI HELPERS (unchanged) =====
  function showPage(pageId) {
    document.querySelectorAll(".page").forEach(function (p) {
      p.classList.remove("active-page");
      p.style.display = "none";
    });
    var target = document.getElementById(pageId);
    if (target) {
      target.classList.add("active-page");
      target.style.display = "";
    }

    var bottomNav = document.querySelector(".bottom-nav");
    if (bottomNav) {
      bottomNav.style.display = pageId === "dashboard-page" ? "" : "none";
    }

    if (pageId === "dashboard-page") {
      document.body.classList.remove("body-scroll-lock");
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    } else {
      document.body.classList.add("body-scroll-lock");
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    }
  }

  function showLoginForm() {
    var lf = document.getElementById("login-form");
    var sf = document.getElementById("signup-form");
    if (sf) {
      sf.classList.remove("active-form");
      sf.style.display = "none";
    }
    if (lf) {
      lf.classList.add("active-form");
      lf.style.display = "";
    }
    hideError("login-error");
    hideError("signup-error");
  }

  function showSignupForm() {
    var lf = document.getElementById("login-form");
    var sf = document.getElementById("signup-form");
    if (lf) {
      lf.classList.remove("active-form");
      lf.style.display = "none";
    }
    if (sf) {
      sf.classList.add("active-form");
      sf.style.display = "";
    }
    hideError("login-error");
    hideError("signup-error");
  }

  function showError(elId, message) {
    var el = document.getElementById(elId);
    if (el) {
      el.textContent = message;
      el.hidden = false;
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function hideError(elId) {
    var el = document.getElementById(elId);
    if (el) el.hidden = true;
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
  }

  function openModal(id) {
    var overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add("active-modal");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    var overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove("active-modal");
    if (!document.querySelector(".modal-overlay.active-modal")) {
      document.body.style.overflow = "";
    }
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach(function (m) {
      m.classList.remove("active-modal");
    });
    document.body.style.overflow = "";
  }

  function switchView(viewId) {
    document.querySelectorAll(".dashboard-view").forEach(function (v) {
      v.classList.remove("active-view");
      v.style.display = "none";
    });
    var target = document.getElementById(viewId);
    if (target) {
      target.classList.add("active-view");
      target.style.display = "";
      var main = document.querySelector(".dashboard-main");
      if (main) main.scrollTop = 0;
    }
    document.querySelectorAll(".nav-item[data-view]").forEach(function (btn) {
      btn.classList.toggle("active-nav", btn.getAttribute("data-view") === viewId);
    });
    document.querySelectorAll(".drawer-item[data-view]").forEach(function (btn) {
      btn.classList.toggle("active-drawer-item", btn.getAttribute("data-view") === viewId);
    });
    closeDrawer();
    if (viewId === "view-settings") updateStorageDisplay();
    if (viewId === "view-grades") loadGrades();
    if (viewId === "view-classmates") loadClassmates();
    if (viewId === "view-faqs") loadFaqs();
    if (viewId === "view-curriculum") {
      setupCurriculumFilters();
      loadCurriculum();
    }
  }

  function navigateTo(viewId) { switchView(viewId); }

  function openDrawer() {
    var overlay = document.getElementById("side-drawer-overlay");
    var drawer = document.getElementById("side-drawer");
    if (overlay) overlay.classList.add("active-drawer");
    if (drawer) drawer.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    var overlay = document.getElementById("side-drawer-overlay");
    var drawer = document.getElementById("side-drawer");
    if (overlay) overlay.classList.remove("active-drawer");
    if (drawer) drawer.classList.remove("open");
    if (!document.querySelector(".modal-overlay.active-modal")) {
      document.body.style.overflow = "";
    }
  }

  function toggleDrawer() {
    var drawer = document.getElementById("side-drawer");
    if (drawer && drawer.classList.contains("open")) closeDrawer();
    else openDrawer();
  }

  function handleOffline(isOffline) {
    var banner = document.getElementById("offline-banner");
    if (banner) banner.hidden = !isOffline;
  }

  function lockPortrait() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("portrait").catch(function () {});
      }
    } catch (e) {}

    function applyLandscapeLock() {
      var lock = document.getElementById("landscape-lock");
      if (!lock) return;
      // Only enforce portrait on mobile phones (touch device with a small screen).
      // Desktop monitors are always wider than tall — never show the overlay there.
      var isMobilePhone = navigator.maxTouchPoints > 0 &&
        Math.min(screen.width, screen.height) <= 480;
      var isLandscape = window.innerWidth > window.innerHeight;
      lock.hidden = !(isMobilePhone && isLandscape);
    }
    applyLandscapeLock();
    window.addEventListener("resize", applyLandscapeLock);
    window.addEventListener("orientationchange", applyLandscapeLock);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function (err) {
        console.warn("Service worker registration failed:", err);
      });
    }
  }

  // ===== LOAD FUNCTIONS =====

  // Render comments for a single post (call after post card is rendered)
  function renderComments(postId, comments, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    if (!comments || comments.length === 0) {
      container.innerHTML = '<div class="no-comments">No comments yet.</div>';
      return;
    }
    var user = getCurrentUser();
    comments.forEach(function (comment) {
      var div = document.createElement("div");
      div.className = "post-comment-item";
      var avatarBg = comment.photo ? 'background-image:url(' + comment.photo + ')' : 'background:' + stringToColor(comment.author);
      var avatarContent = comment.photo ? '' : escapeHtml(initials(comment.author));
      var isOwn = user && comment.user_id === user.id;
      div.innerHTML =
        '<div class="comment-avatar" style="' + avatarBg + '">' + avatarContent + '</div>' +
        '<div class="comment-body">' +
          '<div class="comment-author">' + escapeHtml(comment.author) + '</div>' +
          '<div class="comment-text">' + escapeHtml(comment.content) + '</div>' +
          '<div class="comment-meta">' +
            '<span>' + formatTimestampPHT(comment.created_at) + '</span>' +
            (isOwn ? '<button class="comment-delete-btn" data-comment-id="' + comment.id + '" title="Delete comment"><i class="fas fa-trash"></i></button>' : '') +
          '</div>' +
        '</div>';
      container.appendChild(div);
    });
    // Attach delete event listeners (delegation will also work, but we can attach directly)
    container.querySelectorAll(".comment-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var commentId = btn.getAttribute("data-comment-id");
        showConfirm("Delete this comment?", function () {
          withLoading(function () { return deleteComment(commentId); }).then(function () {
            // Reload posts to refresh comments
            loadPosts(document.getElementById("dashboard-search-input") ? document.getElementById("dashboard-search-input").value : "");
          }).catch(function (err) {
            showToast(err.message || "Could not delete comment.", "error");
          });
        });
      });
    });
  }

  // POSTS LOAD – FIXED: deduplicate posts by id and add comments
  async function loadPosts(searchQuery) {
    const feed = document.getElementById("posts-feed");
    if (!feed) return;
    // Clear immediately so rapid/concurrent calls never append duplicate cards
    feed.innerHTML = "";
    try {
      var posts = await getPosts();

      // ===== FIX: Deduplicate posts by id =====
      var seenIds = new Set();
      posts = posts.filter(function(post) {
        if (seenIds.has(post.id)) {
          return false;
        }
        seenIds.add(post.id);
        return true;
      });
      // =======================================

      if (searchQuery && searchQuery.trim() !== "") {
        var q = searchQuery.trim().toLowerCase();
        posts = posts.filter(function (p) {
          var matchAuthor = p.author && p.author.toLowerCase().indexOf(q) !== -1;
          var matchContent = p.content && p.content.toLowerCase().indexOf(q) !== -1;
          var matchTag = p.tag && p.tag.toLowerCase().indexOf(q) !== -1;
          var matchDate = formatTimestampPHT(p.timestamp).toLowerCase().indexOf(q) !== -1 || timeAgo(p.timestamp).toLowerCase().indexOf(q) !== -1;
          return matchAuthor || matchContent || matchTag || matchDate;
        });
      }

      // Fetch comments for all posts
      var postIds = posts.map(function (p) { return p.id; });
      var allComments = [];
      if (postIds.length > 0) {
        allComments = await getCommentsForPosts(postIds);
      }
      // Group comments by post_id
      var commentsByPost = {};
      allComments.forEach(function (c) {
        if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
        commentsByPost[c.post_id].push(c);
      });

      feed.innerHTML = "";
      if (posts.length === 0) {
        feed.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon"><i class="fas fa-search"></i></div>' +
            '<p class="empty-title">' + (searchQuery ? 'No matching posts found' : 'No posts yet') + '</p>' +
            '<p class="empty-sub">' + (searchQuery ? 'Try searching for another keyword or author.' : 'Be the first to share something with your class.') + '</p>' +
          '</div>';
        return;
      }

      // Keep the same rendering as before
      var user = getCurrentUser();
      for (var i = 0; i < posts.length; i++) {
        var post = posts[i];
        var card = document.createElement("div");
        card.className = "post-card";
        var imgHtml = post.image ? '<div class="post-image-wrap"><img src="' + post.image + '" alt="Post image" loading="lazy"></div>' : "";
        var tagHtml = post.tag ? '<div class="post-tag-wrap"><span class="post-tag"><i class="fas fa-tag"></i> ' + escapeHtml(post.tag) + '</span></div>' : "";

        var canDel = await canDeletePost(post.id);
        var canEdt = await canEditPost(post.id);
        var hasAck = await hasAcknowledgedPost(post.id);
        var acks = await getPostAcknowledgments(post.id);
        var ackCount = acks.length;

        var actionsHtml = '<div class="post-footer">';
        actionsHtml += '<div class="post-footer-left">';
        actionsHtml +=
          '<button class="btn-acknowledge ' + (hasAck ? "acknowledged" : "") + '" data-id="' + post.id + '">' +
            '<i class="fas ' + (hasAck ? "fa-check-circle" : "fa-circle") + '"></i> ' +
            (hasAck ? "Acknowledged" : "Acknowledge") +
          '</button>';
        if (ackCount > 0) {
          actionsHtml +=
            '<span class="acknowledge-count" data-id="' + post.id + '" title="View who acknowledged">' +
              ackCount + ' ' + (ackCount === 1 ? "person" : "people") +
            '</span>';
        }
        actionsHtml += '</div>';
        actionsHtml += '<div class="post-footer-right">';
        // Comments button
        var commentCount = (commentsByPost[post.id] || []).length;
        actionsHtml +=
          '<button class="btn-comments" data-post-id="' + post.id + '">' +
            '<i class="fas fa-comment"></i> ' +
            (commentCount > 0 ? '<span class="comment-count-badge">' + commentCount + '</span>' : 'Comment') +
          '</button>';
        if (canEdt) {
          actionsHtml +=
            '<button class="btn-edit-post" data-id="' + post.id + '">' +
              '<i class="fas fa-pen"></i> Edit' +
            '</button>';
        }
        if (canDel) {
          actionsHtml +=
            '<button class="btn-delete-post" data-id="' + post.id + '">' +
              '<i class="fas fa-trash"></i> Delete' +
            '</button>';
        }
        actionsHtml += '</div></div>';

        // Comments section
        var commentsSectionId = "comments-container-" + post.id;
        var commentsHtml =
          '<div class="post-comments-section">' +
            '<div class="post-comments-list" id="' + commentsSectionId + '">' +
              '<!-- comments rendered by JS -->' +
            '</div>' +
            '<div class="post-comment-form">' +
              '<div class="comment-avatar-small">' + (user ? initials(user.name) : 'S') + '</div>' +
              '<div class="comment-input-wrap">' +
                '<input type="text" class="comment-input" placeholder="Write a comment..." data-post-id="' + post.id + '">' +
                '<button class="comment-submit-btn" data-post-id="' + post.id + '"><i class="fas fa-paper-plane"></i></button>' +
              '</div>' +
            '</div>' +
          '</div>';

        card.innerHTML =
          tagHtml +
          '<div class="post-header">' +
            '<div class="avatar-circle post-avatar" style="background:' + stringToColor(post.author) + '">' +
              escapeHtml(initials(post.author)) +
            '</div>' +
            '<div class="post-author-info">' +
              '<span class="post-author-name">' + escapeHtml(post.author) + '</span>' +
              '<span class="post-timestamp"><i class="fas fa-clock"></i> ' + formatTimestampPHT(post.timestamp) + ' &middot; ' + timeAgo(post.timestamp) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="post-content">' + post.content + imgHtml + '</div>' +
          actionsHtml +
          commentsHtml;
        feed.appendChild(card);

        // Render comments into the container
        var commentsContainer = document.getElementById(commentsSectionId);
        if (commentsContainer) {
          var postComments = commentsByPost[post.id] || [];
          renderComments(post.id, postComments, commentsSectionId);
        }
      }

      // Attach event listeners
      feed.querySelectorAll(".btn-delete-post").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showConfirm("Delete this post?", function () {
            var postId = btn.getAttribute("data-id");
            withLoading(function () { return deletePost(postId); }).then(function () {
              loadPosts(document.getElementById("dashboard-search-input") ? document.getElementById("dashboard-search-input").value : "");
              showToast("Post deleted.", "info");
            }).catch(function (err) {
              showToast(err.message || "Could not delete post.", "error");
            });
          });
        });
      });

      feed.querySelectorAll(".btn-edit-post").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var postId = btn.getAttribute("data-id");
          openEditPostModal(postId);
        });
      });

      feed.querySelectorAll(".btn-acknowledge").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var postId = btn.getAttribute("data-id");
          withLoading(function () { return toggleAcknowledgePost(postId); }).then(function () {
            loadPosts(document.getElementById("dashboard-search-input") ? document.getElementById("dashboard-search-input").value : "");
          }).catch(function (err) {
            showToast(err.message || "Could not toggle acknowledgment.", "error");
          });
        });
      });

      feed.querySelectorAll(".acknowledge-count").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var postId = btn.getAttribute("data-id");
          showAcknowledgmentsPopup(postId);
        });
      });

      // Comments: toggle expand/collapse (optional) but we always show them.
      // Comment submit
      feed.querySelectorAll(".comment-submit-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          var postId = btn.getAttribute("data-id");
          var input = btn.parentElement.querySelector(".comment-input");
          if (!input) return;
          var content = input.value.trim();
          if (!content) {
            showToast("Please write a comment.", "warning");
            return;
          }
          withLoading(function () { return addComment(postId, content); }).then(function () {
            input.value = "";
            // Reload posts to refresh comments
            loadPosts(document.getElementById("dashboard-search-input") ? document.getElementById("dashboard-search-input").value : "");
          }).catch(function (err) {
            showToast(err.message || "Could not add comment.", "error");
          });
        });
      });
      // Also allow Enter key on comment input
      feed.querySelectorAll(".comment-input").forEach(function (input) {
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            var btn = this.parentElement.querySelector(".comment-submit-btn");
            if (btn) btn.click();
          }
        });
      });

    } catch (err) {
      console.error("Error loading posts:", err);
      feed.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load posts</p><p class="empty-sub">' + escapeHtml(err.message) + '</p></div>';
    }
  }

  async function canDeletePost(postId) {
    var user = getCurrentUser();
    if (!user) return false;
    if (isAdmin()) return true;
    try {
      var posts = await getPosts();
      var found = posts.find(function (p) { return p.id === postId; });
      if (!found) return false;
      return found.author === user.name;
    } catch (e) {
      return false;
    }
  }

  async function canEditPost(postId) {
    var user = getCurrentUser();
    if (!user) return false;
    try {
      var posts = await getPosts();
      var found = posts.find(function (p) { return p.id === postId; });
      if (!found) return false;
      return found.author === user.name;
    } catch (e) {
      return false;
    }
  }

  function showAcknowledgmentsPopup(postId) {
    getPostAcknowledgments(postId).then(function (acks) {
      var overlay = document.createElement("div");
      overlay.className = "acknowledgments-popup-overlay active";
      var popup = document.createElement("div");
      popup.className = "acknowledgments-popup active";
      var listHtml = "";
      if (acks.length === 0) {
        listHtml = '<p style="text-align:center;color:var(--gray-400);padding:16px 0;">No one has acknowledged this post yet.</p>';
      } else {
        listHtml = '<div class="acknowledgments-list">';
        acks.forEach(function (a) {
          var color = stringToColor(a.name);
          listHtml +=
            '<div class="ack-item">' +
              '<div class="ack-avatar" style="background:' + color + '">' + escapeHtml(initials(a.name)) + '</div>' +
              '<span>' + escapeHtml(a.name) + '</span>' +
            '</div>';
        });
        listHtml += '</div>';
      }
      popup.innerHTML =
        '<h4>People who acknowledged</h4>' +
        listHtml +
        '<button class="acknowledgments-close">Close</button>';
      document.body.appendChild(overlay);
      document.body.appendChild(popup);
      popup.querySelector(".acknowledgments-close").addEventListener("click", function () {
        overlay.remove();
        popup.remove();
      });
      overlay.addEventListener("click", function () {
        overlay.remove();
        popup.remove();
      });
    }).catch(function (err) {
      showToast("Could not load acknowledgments.", "error");
    });
  }

  function openEditPostModal(postId) {
    getPosts().then(function (posts) {
      var found = posts.find(function (p) { return p.id === postId; });
      if (!found) { showToast("Post not found.", "error"); return; }
      var editor = document.getElementById("edit-post-content-editable");
      var idField = document.getElementById("edit-post-id");
      if (editor) editor.innerHTML = found.content;
      if (idField) idField.value = postId;
      openModal("edit-post-modal-overlay");
      setTimeout(function () { if (editor) editor.focus(); }, 300);
    }).catch(function (err) {
      showToast("Could not load post.", "error");
    });
  }

  // ===== SUBJECTS LOAD =====
  async function loadSubjects() {
    const list = document.getElementById("subjects-list");
    if (!list) return;
    try {
      var subjects = await getSubjects();
      list.innerHTML = "";
      if (subjects.length === 0) {
        list.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon"><i class="fas fa-book-open"></i></div>' +
            '<p class="empty-title">No subjects yet</p>' +
            '<p class="empty-sub">Click "Add Subject" to get started.</p>' +
          '</div>';
        return;
      }
      for (var i = 0; i < subjects.length; i++) {
        var subject = subjects[i];
        var card = document.createElement("div");
        card.className = "subject-card";
        card.style.borderLeftColor = subject.color || "#2563EB";
        var tasks = subject.tasks || [];
        var done = tasks.filter(function (t) { return t.completed; }).length;
        var total = tasks.length;
        var pct = total > 0 ? Math.round((done / total) * 100) : 0;
        var progressHtml = total > 0
          ? '<div class="subject-progress-wrap">' +
              '<div class="subject-progress-track">' +
                '<div class="subject-progress-fill" style="width:' + pct + '%;background:' + (subject.color || "#2563EB") + '"></div>' +
              '</div>' +
              '<span class="subject-progress-label">' + done + ' / ' + total + ' tasks complete</span>' +
            '</div>'
          : "";
        var tasksHtml = "";
        if (tasks.length > 0) {
          tasksHtml += '<p class="subject-tasks-label"><i class="fas fa-list-check"></i> Tasks</p>';
          tasks.forEach(function (task) {
            tasksHtml +=
              '<div class="subject-task-item">' +
                '<input type="checkbox" class="task-checkbox" ' +
                  'data-subject-id="' + subject.id + '" ' +
                  'data-task-id="' + task.id + '" ' +
                  (task.completed ? "checked" : "") + '>' +
                '<span class="task-text ' + (task.completed ? "completed" : "") + '">' +
                  escapeHtml(task.text) +
                '</span>' +
                '<button class="btn-task-delete" ' +
                  'data-subject-id="' + subject.id + '" ' +
                  'data-task-id="' + task.id + '" ' +
                  'title="Delete task">' +
                  '<i class="fas fa-xmark"></i>' +
                '</button>' +
              '</div>';
          });
        }
        card.innerHTML =
          '<div class="subject-card-header">' +
            '<div class="subject-card-title">' +
              '<span class="subject-color-dot" style="background:' + (subject.color || "#2563EB") + '"></span>' +
              '<h4>' + escapeHtml(subject.name) + '</h4>' +
            '</div>' +
            '<div class="subject-actions">' +
              '<button class="btn-icon btn-edit-subject" data-id="' + subject.id + '" title="Edit subject">' +
                '<i class="fas fa-pen"></i>' +
              '</button>' +
              '<button class="btn-icon btn-delete-subject" data-id="' + subject.id + '" title="Delete subject">' +
                '<i class="fas fa-trash"></i>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="subject-meta">' +
            '<span><i class="fas fa-user-tie"></i> ' + escapeHtml(subject.professor || "No professor assigned") + '</span>' +
            '<span><i class="fas fa-calendar"></i> ' + escapeHtml(subject.schedule || "No schedule set") + '</span>' +
          '</div>' +
          progressHtml +
          '<div class="subject-tasks">' +
            tasksHtml +
            '<button class="subject-add-task-btn" data-subject-id="' + subject.id + '">' +
              '<i class="fas fa-plus"></i> Add Task' +
            '</button>' +
          '</div>';
        list.appendChild(card);
      }

      // Attach events
      list.querySelectorAll(".btn-edit-subject").forEach(function (btn) {
        btn.addEventListener("click", function () { editSubject(btn.getAttribute("data-id")); });
      });
      list.querySelectorAll(".btn-delete-subject").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showConfirm("Delete this subject and all its tasks?", function () {
            withLoading(function () { return deleteSubject(btn.getAttribute("data-id")); }).then(function () {
              loadSubjects();
              showToast("Subject deleted.", "info");
            }).catch(function (err) {
              showToast(err.message || "Could not delete subject.", "error");
            });
          });
        });
      });
      list.querySelectorAll(".task-checkbox").forEach(function (cb) {
        cb.addEventListener("change", function () {
          withLoading(function () { return toggleSubjectTask(cb.getAttribute("data-subject-id"), cb.getAttribute("data-task-id")); }).then(function () {
            loadSubjects();
          }).catch(function (err) {
            showToast(err.message || "Could not update task.", "error");
          });
        });
      });
      list.querySelectorAll(".btn-task-delete").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showConfirm("Delete this task?", function () {
            withLoading(function () { return deleteSubjectTask(btn.getAttribute("data-subject-id"), btn.getAttribute("data-task-id")); }).then(function () {
              loadSubjects();
              showToast("Task deleted.", "info");
            }).catch(function (err) {
              showToast(err.message || "Could not delete task.", "error");
            });
          });
        });
      });
      list.querySelectorAll(".subject-add-task-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          document.getElementById("subject-task-subject-id").value = btn.getAttribute("data-subject-id");
          document.getElementById("subject-task-text").value = "";
          openModal("subject-task-modal-overlay");
        });
      });

    } catch (err) {
      console.error("Error loading subjects:", err);
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load subjects</p><p class="empty-sub">' + escapeHtml(err.message) + '</p></div>';
    }
  }

  function editSubject(id) {
    getSubjects().then(function (subjects) {
      var subject = subjects.find(function (s) { return s.id === id; });
      if (!subject) return;
      document.getElementById("subject-edit-id").value = id;
      document.getElementById("subject-name").value = subject.name;
      document.getElementById("subject-professor").value = subject.professor || "";
      document.getElementById("subject-schedule").value = subject.schedule || "";
      document.getElementById("subject-modal-title").textContent = "Edit Subject";
      openModal("subject-modal-overlay");
    }).catch(function (err) {
      showToast("Could not load subject.", "error");
    });
  }

  // ===== SCHEDULE LOAD =====
  async function loadSchedule() {
    const list = document.getElementById("schedule-list");
    if (!list) return;
    try {
      var schedule = await getSchedule();
      list.innerHTML = "";
      if (schedule.length === 0) {
        list.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon"><i class="fas fa-calendar-days"></i></div>' +
            '<p class="empty-title">No schedule yet</p>' +
            '<p class="empty-sub">Click "Add Schedule" to get started.</p>' +
          '</div>';
        return;
      }
      const dayOrder = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
      var sorted = schedule.slice().sort(function (a, b) {
        var da = a.day ? a.day.substring(0, 3) : "";
        var db = b.day ? b.day.substring(0, 3) : "";
        var od = (dayOrder[da] !== undefined ? dayOrder[da] : 99) - (dayOrder[db] !== undefined ? dayOrder[db] : 99);
        return od !== 0 ? od : (a.start_time || "").localeCompare(b.start_time || "");
      });
      const badgeColors = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];
      sorted.forEach(function (item) {
        var card = document.createElement("div");
        card.className = "schedule-card";
        var dayIdx = item.day ? (dayOrder[item.day.substring(0, 3)] || 0) : 0;
        card.innerHTML =
          '<div class="schedule-card-top">' +
            '<div class="schedule-day-badge" style="background:' + badgeColors[dayIdx % badgeColors.length] + '">' +
              escapeHtml(item.day || "N/A") +
            '</div>' +
            '<div class="schedule-card-actions">' +
              '<button class="btn-icon btn-edit-schedule" data-id="' + item.id + '" title="Edit"><i class="fas fa-pen"></i></button>' +
              '<button class="btn-icon btn-delete-schedule" data-id="' + item.id + '" title="Delete"><i class="fas fa-trash"></i></button>' +
            '</div>' +
          '</div>' +
          '<div class="schedule-card-info">' +
            '<h4>' + escapeHtml(item.subject) + '</h4>' +
            '<p class="schedule-time"><i class="fas fa-clock"></i> ' +
              formatTime12h(item.start_time) + ' &ndash; ' + formatTime12h(item.end_time) +
            '</p>' +
            '<p class="schedule-room"><i class="fas fa-location-dot"></i> ' +
              escapeHtml(item.room || "No room assigned") +
            '</p>' +
          '</div>';
        list.appendChild(card);
      });

      list.querySelectorAll(".btn-edit-schedule").forEach(function (btn) {
        btn.addEventListener("click", function () { editScheduleItem(btn.getAttribute("data-id")); });
      });
      list.querySelectorAll(".btn-delete-schedule").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showConfirm("Delete this schedule entry?", function () {
            withLoading(function () { return deleteScheduleItem(btn.getAttribute("data-id")); }).then(function () {
              loadSchedule();
              showToast("Schedule entry deleted.", "info");
            }).catch(function (err) {
              showToast(err.message || "Could not delete schedule entry.", "error");
            });
          });
        });
      });

    } catch (err) {
      console.error("Error loading schedule:", err);
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load schedule</p><p class="empty-sub">' + escapeHtml(err.message) + '</p></div>';
    }
  }

  function editScheduleItem(id) {
    getSchedule().then(function (schedule) {
      var item = schedule.find(function (s) { return s.id === id; });
      if (!item) return;
      document.getElementById("schedule-edit-id").value = id;
      document.getElementById("schedule-subject").value = item.subject;
      document.getElementById("schedule-day").value = item.day || "";
      document.getElementById("schedule-start-time").value = item.start_time || "";
      document.getElementById("schedule-end-time").value = item.end_time || "";
      document.getElementById("schedule-room").value = item.room || "";
      document.getElementById("schedule-modal-title").textContent = "Edit Schedule";
      openModal("schedule-modal-overlay");
    }).catch(function (err) {
      showToast("Could not load schedule item.", "error");
    });
  }

  // ===== ASSIGNMENTS LOAD =====
  async function loadAssignments() {
    const list = document.getElementById("assignments-list");
    if (!list) return;
    try {
      var assignments = await getAssignments();
      list.innerHTML = "";
      if (assignments.length === 0) {
        list.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon"><i class="fas fa-clipboard-check"></i></div>' +
            '<p class="empty-title">No assignments yet</p>' +
            '<p class="empty-sub">Click "Add Task" to get started.</p>' +
          '</div>';
        return;
      }
      var sorted = assignments.slice().sort(function (a, b) {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return 0;
      });
      sorted.forEach(function (item) {
        var div = document.createElement("div");
        div.className = "assignment-item" + (item.completed ? " assignment-done" : "");
        var dueCls = "";
        var dueLabel = "Due";
        if (item.due_date && !item.completed) {
          if (isOverdue(item.due_date)) { dueCls = "due-overdue"; dueLabel = "Overdue"; }
          else if (isDueSoon(item.due_date)) { dueCls = "due-soon"; }
        }
        var dueHtml = item.due_date
          ? '<span class="assignment-due ' + dueCls + '"><i class="fas fa-calendar-day"></i> ' + dueLabel + ': ' + escapeHtml(item.due_date) + '</span>'
          : "";
        var subjectHtml = item.subject
          ? '<span class="assignment-subject"><i class="fas fa-book"></i> ' + escapeHtml(item.subject) + '</span>'
          : "";
        div.innerHTML =
          '<label class="assignment-check-wrap" title="Mark complete">' +
            '<input type="checkbox" class="assignment-checkbox" data-id="' + item.id + '" ' + (item.completed ? "checked" : "") + '>' +
            '<span class="assignment-checkmark"></span>' +
          '</label>' +
          '<div class="assignment-info">' +
            '<span class="assignment-text ' + (item.completed ? "completed" : "") + '">' + escapeHtml(item.text) + '</span>' +
            '<div class="assignment-meta">' + subjectHtml + dueHtml + '</div>' +
          '</div>' +
          '<button class="btn-assignment-delete" data-id="' + item.id + '" title="Delete task">' +
            '<i class="fas fa-trash"></i>' +
          '</button>';
        list.appendChild(div);
      });

      list.querySelectorAll(".assignment-checkbox").forEach(function (cb) {
        cb.addEventListener("change", function () {
          withLoading(function () { return toggleAssignment(cb.getAttribute("data-id")); }).then(function () {
            loadAssignments();
          }).catch(function (err) {
            showToast(err.message || "Could not update task.", "error");
          });
        });
      });
      list.querySelectorAll(".btn-assignment-delete").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showConfirm("Delete this task?", function () {
            withLoading(function () { return deleteAssignment(btn.getAttribute("data-id")); }).then(function () {
              loadAssignments();
              showToast("Task deleted.", "info");
            }).catch(function (err) {
              showToast(err.message || "Could not delete task.", "error");
            });
          });
        });
      });

    } catch (err) {
      console.error("Error loading assignments:", err);
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load assignments</p><p class="empty-sub">' + escapeHtml(err.message) + '</p></div>';
    }
  }

  function isDueSoon(dueDate) {
    if (!dueDate) return false;
    var diff = (new Date(dueDate) - new Date()) / 86400000;
    return diff >= 0 && diff <= 3;
  }

  function isOverdue(dueDate) {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  // ===== GRADES LOAD =====
  async function loadGrades() {
    const list = document.getElementById("grades-list");
    const gwaDisplay = document.getElementById("gwa-value");
    if (!list) return;
    const yearEl = document.getElementById("grade-year-filter");
    const semEl = document.getElementById("grade-semester-filter");
    const year = yearEl ? yearEl.value : "all";
    const semester = semEl ? semEl.value : "all";

    try {
      var grades = await getGrades();
      var filtered = grades.filter(function (g) {
        var yMatch = (year === "all" || !year || g.year === year);
        var sMatch = (semester === "all" || !semester || g.semester === semester);
        return yMatch && sMatch;
      });

      list.innerHTML = "";
      if (filtered.length === 0) {
        list.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon"><i class="fas fa-chart-simple"></i></div>' +
            '<p class="empty-title">No grades found</p>' +
            '<p class="empty-sub">Click "Add Grade" to record your subjects and compute your GWA.</p>' +
          '</div>';
        if (gwaDisplay) { gwaDisplay.textContent = "0.00"; gwaDisplay.style.color = ""; }
        return;
      }

      filtered.forEach(function (item) {
        var div = document.createElement("div");
        div.className = "grade-item" + (item.exclude ? " grade-excluded" : "");
        var gc = item.exclude ? "#94A3B8" : gradeColor(item.grade);
        var gl = item.exclude ? "Excluded from GWA" : gradeLabel(item.grade);
        var uLabel = (item.units || 3) + " Units";

        div.innerHTML =
          '<div class="grade-card-main">' +
            '<div class="grade-card-header-row">' +
              '<h4 class="grade-subject-title">' + escapeHtml(item.subject) + '</h4>' +
              '<div class="grade-score-wrap">' +
                '<span class="grade-score-value" style="color:' + gc + '">' +
                  (item.exclude ? '<s>' + item.grade.toFixed(2) + '</s>' : item.grade.toFixed(2)) +
                '</span>' +
              '</div>' +
            '</div>' +
            '<div class="grade-meta-tags-row">' +
              '<span class="grade-badge" style="background:' + gc + '20;color:' + gc + '">' + gl + '</span>' +
              '<span class="grade-unit-badge"><i class="fas fa-layer-group"></i> ' + uLabel + '</span>' +
              '<span class="grade-term-badge"><i class="fas fa-calendar"></i> ' + escapeHtml(item.year || "1st Year") + ' &bull; ' + escapeHtml(item.semester || "1st Semester") + '</span>' +
            '</div>' +
            '<div class="grade-card-actions-row">' +
              '<button class="btn-grade-action btn-toggle-exclude" data-id="' + item.id + '" ' +
                'title="' + (item.exclude ? 'Include in GWA calculation' : 'Exclude from GWA calculation (e.g. PE/NSTP)') + '">' +
                '<i class="fas ' + (item.exclude ? 'fa-eye' : 'fa-eye-slash') + '"></i> ' +
                (item.exclude ? 'Include' : 'Exclude') +
              '</button>' +
              '<button class="btn-grade-action btn-edit-grade" data-id="' + item.id + '" title="Edit grade">' +
                '<i class="fas fa-pen"></i> Edit' +
              '</button>' +
              '<button class="btn-grade-action btn-delete-grade" data-id="' + item.id + '" title="Delete grade">' +
                '<i class="fas fa-trash"></i> Delete' +
              '</button>' +
            '</div>' +
          '</div>';
        list.appendChild(div);
      });

      // Event listeners
      list.querySelectorAll(".btn-toggle-exclude").forEach(function (btn) {
        btn.addEventListener("click", function () {
          withLoading(function () { return toggleGradeExclude(btn.getAttribute("data-id")); }).then(function () {
            loadGrades();
          }).catch(function (err) {
            showToast(err.message || "Could not update exclude status.", "error");
          });
        });
      });
      list.querySelectorAll(".btn-edit-grade").forEach(function (btn) {
        btn.addEventListener("click", function () {
          editGradeItem(btn.getAttribute("data-id"));
        });
      });
      list.querySelectorAll(".btn-delete-grade").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showConfirm("Delete this grade?", function () {
            withLoading(function () { return deleteGrade(btn.getAttribute("data-id")); }).then(function () {
              loadGrades();
              showToast("Grade deleted.", "info");
            }).catch(function (err) {
              showToast(err.message || "Could not delete grade.", "error");
            });
          });
        });
      });

      // Calculate GWA
      var gwa = calculateGWA(grades, year, semester);
      if (gwaDisplay) {
        gwaDisplay.textContent = gwa > 0 ? gwa.toFixed(4).replace(/00$/, '') : "0.00";
        gwaDisplay.style.color = gwa > 0 ? gradeColor(gwa) : "";
      }

    } catch (err) {
      console.error("Error loading grades:", err);
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load grades</p><p class="empty-sub">' + escapeHtml(err.message) + '</p></div>';
    }
  }

  function gradeColor(g) {
    if (g <= 1.50 && g > 0) return "#10B981";
    if (g <= 2.00 && g > 0) return "#2563EB";
    if (g <= 2.50 && g > 0) return "#F59E0B";
    if (g <= 3.00 && g > 0) return "#8B5CF6";
    if (g > 5.00) {
      if (g >= 90) return "#10B981";
      if (g >= 80) return "#2563EB";
      if (g >= 75) return "#F59E0B";
      return "#EF4444";
    }
    return "#EF4444";
  }

  function gradeLabel(g) {
    if (g <= 1.25 && g > 0) return "Excellent";
    if (g <= 1.75 && g > 0) return "Very Good";
    if (g <= 2.25 && g > 0) return "Good";
    if (g <= 2.75 && g > 0) return "Satisfactory";
    if (g <= 3.00 && g > 0) return "Passing";
    if (g > 3.00 && g <= 5.00) return "Failed";
    if (g >= 90) return "Excellent";
    if (g >= 80) return "Good";
    if (g >= 75) return "Satisfactory";
    return "Below Average";
  }

  function calculateGWA(grades, year, semester) {
    var eligible = grades.filter(function (g) {
      var yearMatch = (year === "all" || !year || g.year === year);
      var semMatch = (semester === "all" || !semester || g.semester === semester);
      return yearMatch && semMatch && !g.exclude && !isNaN(g.grade);
    });
    if (!eligible.length) return 0;
    var totalWeighted = 0;
    var totalUnits = 0;
    eligible.forEach(function (g) {
      var u = parseFloat(g.units) || 3;
      totalWeighted += (parseFloat(g.grade) * u);
      totalUnits += u;
    });
    if (totalUnits === 0) return 0;
    return totalWeighted / totalUnits;
  }

  function editGradeItem(id) {
    getGrades().then(function (grades) {
      var item = grades.find(function (g) { return g.id === id; });
      if (!item) return;
      document.getElementById("grade-edit-id").value = id;
      document.getElementById("grade-subject").value = item.subject;
      document.getElementById("grade-value").value = item.grade;
      document.getElementById("grade-units").value = item.units || 3;
      document.getElementById("grade-year").value = item.year || "1st Year";
      document.getElementById("grade-semester").value = item.semester || "1st Semester";
      document.getElementById("grade-exclude").checked = !!item.exclude;
      document.getElementById("grade-modal-title").textContent = "Edit Grade";
      openModal("grade-modal-overlay");
    }).catch(function (err) {
      showToast("Could not load grade.", "error");
    });
  }

  // ===== CLASSMATES LOAD =====
  async function loadClassmates() {
    const list = document.getElementById("classmates-list");
    const mySectionBadge = document.getElementById("my-section-display");
    if (!list) return;

    var userProf = getProfile();
    var mySec = userProf.section ? normalizeSection(userProf.section) : "BSIT 3-A";
    if (mySectionBadge) {
      mySectionBadge.textContent = "Your Section: " + mySec;
    }

    try {
      var classmates = await getSectionClassmates();
      list.innerHTML = "";
      if (classmates.length === 0) {
        list.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon"><i class="fas fa-users"></i></div>' +
            '<p class="empty-title">No classmates found for section ' + escapeHtml(mySec) + '</p>' +
            '<p class="empty-sub">Make sure your Section in Profile matches your classmates (e.g. BSIT 3-A).</p>' +
          '</div>';
        return;
      }

      classmates.forEach(function (cm) {
        var card = document.createElement("div");
        card.className = "classmate-card clickable-card";
        var avatarBg = cm.photo ? 'background-image:url(' + cm.photo + ')' : 'background:' + stringToColor(cm.name);
        var avatarContent = cm.photo ? '' : escapeHtml(initials(cm.name));

        card.innerHTML =
          '<div class="classmate-avatar" style="' + avatarBg + '">' +
            avatarContent +
          '</div>' +
          '<div class="classmate-info">' +
            '<h4>' + escapeHtml(cm.name) + '</h4>' +
            '<p>' +
              (cm.course ? '<span><i class="fas fa-graduation-cap"></i> ' + escapeHtml(cm.course) + '</span> ' : '') +
              (cm.year ? '<span>' + escapeHtml(cm.year) + '</span>' : '') +
            '</p>' +
            '<p class="classmate-section"><i class="fas fa-users"></i> Section ' + escapeHtml(cm.section) + '</p>' +
          '</div>' +
          '<div class="classmate-arrow"><i class="fas fa-chevron-right"></i></div>';

        card.addEventListener("click", function () {
          showClassmateProfileModal(cm);
        });

        list.appendChild(card);
      });

    } catch (err) {
      console.error("Error loading classmates:", err);
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load classmates</p><p class="empty-sub">' + escapeHtml(err.message) + '</p></div>';
    }
  }

  async function getSectionClassmates() {
    var userProf = getProfile();
    var currentUser = getCurrentUser();
    var mySection = userProf.section ? normalizeSection(userProf.section) : "BSIT 3-A";

    var result = [];

    // 1. Registered users matching section from Supabase
    if (currentUser && isSupabaseReady()) {
      try {
        var client = getSupabaseClient();
        var response = await withTimeout(
          client
            .from("profiles")
            .select("id,email,full_name,course,year,section,bio,student_id,contact,photo")
            .neq("id", currentUser.id),
          8000,
          "Supabase classmates load"
        );
        if (response.error) throw response.error;
        (response.data || []).forEach(function (prof) {
          var uSec = prof.section ? normalizeSection(prof.section) : "BSIT 3-A";
          if (uSec === mySection || mySection === "ALL") {
            result.push({
              id: prof.id || cryptoId(),
              name: prof.full_name || prof.email || "Classmate",
              email: prof.email || "",
              course: prof.course || "BSIT",
              year: prof.year || "3rd Year",
              section: uSec,
              bio: prof.bio || "Classmate in " + uSec,
              studentId: prof.student_id || "N/A",
              contact: prof.contact || "N/A",
              photo: prof.photo || null
            });
          }
        });
      } catch (error) {
        console.error("[ClassConnect] Supabase classmates load failed:", error);
      }
    }

    // 2. Demo classmates matching section
    var demo = getDemoClassmates();
    demo.forEach(function (cm) {
      var cmSec = normalizeSection(cm.section);
      if (cmSec === mySection || mySection === "ALL") {
        var alreadyAdded = result.some(function (r) { return r.name.toLowerCase() === cm.name.toLowerCase(); });
        if (!alreadyAdded) {
          result.push({
            id: cryptoId(),
            name: cm.name,
            email: cm.email || (cm.name.toLowerCase().replace(/\s+/g, '.') + "@ctu.edu.ph"),
            course: cm.course || "BSIT",
            year: cm.year || "3rd Year",
            section: cmSec,
            bio: cm.bio || "BSIT Student at CTU Main Campus",
            studentId: "2023-CTU-" + Math.floor(1000 + Math.random() * 9000),
            contact: "0912-345-6789",
            photo: null
          });
        }
      }
    });

    return result;
  }

  function getDemoClassmates() {
    return DEMO_CLASSMATES;
  }

  function showClassmateProfileModal(cm) {
    var avatarEl = document.getElementById("cm-modal-avatar");
    var nameEl = document.getElementById("cm-modal-name");
    var sectionEl = document.getElementById("cm-modal-section");
    var courseYearEl = document.getElementById("cm-modal-course-year");
    var emailEl = document.getElementById("cm-modal-email");
    var bioEl = document.getElementById("cm-modal-bio");
    var studentIdEl = document.getElementById("cm-modal-studentid");
    var contactEl = document.getElementById("cm-modal-contact");

    if (avatarEl) {
      if (cm.photo) {
        avatarEl.style.backgroundImage = "url(" + cm.photo + ")";
        avatarEl.textContent = "";
      } else {
        avatarEl.style.backgroundImage = "";
        avatarEl.style.backgroundColor = stringToColor(cm.name);
        avatarEl.textContent = initials(cm.name);
      }
    }
    if (nameEl) nameEl.textContent = cm.name;
    if (sectionEl) sectionEl.textContent = "Section: " + cm.section;
    if (courseYearEl) courseYearEl.textContent = (cm.course || "BSIT") + " • " + (cm.year || "3rd Year");
    if (emailEl) emailEl.textContent = cm.email || "N/A";
    if (bioEl) bioEl.textContent = cm.bio || "No bio provided.";
    if (studentIdEl) studentIdEl.textContent = cm.studentId || "N/A";
    if (contactEl) contactEl.textContent = cm.contact || "N/A";

    openModal("classmate-profile-modal-overlay");
  }

  // ===== FAQS LOAD =====
  function loadFaqs() {
    const list = document.getElementById("faqs-list");
    if (!list) return;
    list.innerHTML = "";
    DEMO_FAQS.forEach(function (faq) {
      var div = document.createElement("div");
      div.className = "faq-item";
      div.innerHTML =
        '<div class="faq-question">' +
          '<span>' + escapeHtml(faq.question) + '</span>' +
          '<i class="fas fa-chevron-down faq-chevron"></i>' +
        '</div>' +
        '<div class="faq-answer">' + escapeHtml(faq.answer) + '</div>';
      list.appendChild(div);
    });
    list.querySelectorAll(".faq-question").forEach(function (q) {
      q.addEventListener("click", function () {
        var parent = q.parentElement;
        var isOpen = parent.classList.contains("open");
        list.querySelectorAll(".faq-item.open").forEach(function (item) {
          item.classList.remove("open");
        });
        if (!isOpen) parent.classList.add("open");
      });
    });
  }

  // ===== CURRICULUM LOAD =====
  async function loadCurriculum() {
    var list = document.getElementById("curriculum-subjects-list");
    var pdfSection = document.getElementById("curriculum-pdf-section");
    var corSection = document.getElementById("cor-pdf-section");
    if (!list) return;

    try {
      // Load PDF section
      if (pdfSection) {
        var pdfData = await getCurriculumPDF();
        if (pdfData) {
          pdfSection.innerHTML =
            '<div class="pdf-upload-area pdf-active-card">' +
              '<div class="pdf-info">' +
                '<i class="fas fa-file-pdf pdf-icon"></i>' +
                '<div>' +
                  '<h4 class="pdf-filename">' + escapeHtml(pdfData.name || "Curriculum PDF") + '</h4>' +
                  '<span class="pdf-subtitle">Uploaded curriculum syllabus</span>' +
                '</div>' +
              '</div>' +
              '<div class="pdf-actions">' +
                '<button class="btn-pdf-view" onclick="window.open(\'' + pdfData.data + '\',\'_blank\')"><i class="fas fa-eye"></i> View PDF</button>' +
                '<button class="btn-pdf-export" id="export-pdf-btn"><i class="fas fa-download"></i> Export</button>' +
                '<button class="btn-pdf-remove" id="remove-pdf-btn"><i class="fas fa-trash"></i> Remove</button>' +
              '</div>' +
            '</div>';
          var removeBtn = document.getElementById("remove-pdf-btn");
          if (removeBtn) {
            removeBtn.addEventListener("click", function () {
              showConfirm("Remove the uploaded PDF?", function () {
                withLoading(function () { return removeCurriculumPDF(); }).then(function () {
                  loadCurriculum();
                  showToast("PDF removed.", "info");
                }).catch(function (err) {
                  showToast(err.message || "Could not remove PDF.", "error");
                });
              });
            });
          }
          var exportBtn = document.getElementById("export-pdf-btn");
          if (exportBtn) {
            exportBtn.addEventListener("click", function () {
              downloadPDF(pdfData, "curriculum.pdf");
              showToast("Curriculum PDF download started.", "success");
            });
          }
        } else {
          pdfSection.innerHTML =
            '<div class="pdf-upload-area">' +
              '<div class="no-pdf">' +
                '<i class="fas fa-file-pdf"></i>' +
                '<span>No curriculum PDF uploaded yet</span>' +
              '</div>' +
              '<div class="pdf-actions">' +
                '<button class="btn-pdf-upload" id="upload-pdf-btn"><i class="fas fa-upload"></i> Upload PDF Syllabus</button>' +
                '<input type="file" id="pdf-file-input" accept=".pdf" hidden>' +
              '</div>' +
            '</div>';
          var uploadBtn = document.getElementById("upload-pdf-btn");
          var fileInput = document.getElementById("pdf-file-input");
          if (uploadBtn && fileInput) {
            uploadBtn.addEventListener("click", function () { fileInput.click(); });
            fileInput.addEventListener("change", function () {
              var file = fileInput.files[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                showToast("PDF must be smaller than 10 MB.", "error");
                fileInput.value = "";
                return;
              }
              var reader = new FileReader();
              reader.onload = function (e) {
                var base64 = e.target.result;
                withLoading(function () { return saveCurriculumPDF(file.name, base64); }).then(function () {
                  loadCurriculum();
                  showToast("Curriculum PDF uploaded successfully.", "success");
                  fileInput.value = "";
                }).catch(function (err) {
                  showToast(err.message || "Could not upload PDF.", "error");
                });
              };
              reader.readAsDataURL(file);
            });
          }
        }
      }

      // Load COR section
      if (corSection) {
        var corData = await getCORPDF();
        if (corData) {
          corSection.innerHTML =
            '<div class="pdf-upload-area pdf-active-card cor-active-card">' +
              '<div class="pdf-info">' +
                '<i class="fas fa-id-card pdf-icon cor-icon"></i>' +
                '<div>' +
                  '<h4 class="pdf-filename">' + escapeHtml(corData.name || "Certificate of Registration") + '</h4>' +
                  '<span class="pdf-subtitle">Certificate of Registration (COR)</span>' +
                '</div>' +
              '</div>' +
              '<div class="pdf-actions">' +
                '<button class="btn-pdf-view" onclick="window.open(\'' + corData.data + '\',\'_blank\')"><i class="fas fa-eye"></i> View COR</button>' +
                '<button class="btn-pdf-export" id="export-cor-btn"><i class="fas fa-download"></i> Export</button>' +
                '<button class="btn-pdf-remove" id="remove-cor-btn"><i class="fas fa-trash"></i> Remove</button>' +
              '</div>' +
            '</div>';
          var removeCorBtn = document.getElementById("remove-cor-btn");
          if (removeCorBtn) {
            removeCorBtn.addEventListener("click", function () {
              showConfirm("Remove the uploaded Certificate of Registration?", function () {
                withLoading(function () { return removeCORPDF(); }).then(function () {
                  loadCurriculum();
                  showToast("Certificate of Registration removed.", "info");
                }).catch(function (err) {
                  showToast(err.message || "Could not remove COR.", "error");
                });
              });
            });
          }
          var exportCorBtn = document.getElementById("export-cor-btn");
          if (exportCorBtn) {
            exportCorBtn.addEventListener("click", function () {
              downloadPDF(corData, "certificate-of-registration.pdf");
              showToast("COR download started.", "success");
            });
          }
        } else {
          corSection.innerHTML =
            '<div class="pdf-upload-area">' +
              '<div class="pdf-info">' +
                '<i class="fas fa-id-card pdf-icon" style="color:var(--slate-blue,#6366f1);font-size:28px;flex-shrink:0;"></i>' +
                '<div class="no-pdf" style="background:none;padding:0;">' +
                  '<span>No Certificate of Registration uploaded yet</span>' +
                '</div>' +
              '</div>' +
              '<div class="pdf-actions">' +
                '<button class="btn-pdf-upload" id="upload-cor-btn"><i class="fas fa-upload"></i> Upload COR</button>' +
                '<input type="file" id="cor-file-input" accept=".pdf,image/*" hidden>' +
              '</div>' +
            '</div>';
          var uploadCorBtn = document.getElementById("upload-cor-btn");
          var corFileInput = document.getElementById("cor-file-input");
          if (uploadCorBtn && corFileInput) {
            uploadCorBtn.addEventListener("click", function () { corFileInput.click(); });
            corFileInput.addEventListener("change", function () {
              var file = corFileInput.files[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                showToast("File must be smaller than 10 MB.", "error");
                corFileInput.value = "";
                return;
              }
              var reader = new FileReader();
              reader.onload = function (e) {
                var base64 = e.target.result;
                withLoading(function () { return saveCORPDF(file.name, base64); }).then(function () {
                  loadCurriculum();
                  showToast("Certificate of Registration uploaded successfully.", "success");
                  corFileInput.value = "";
                }).catch(function (err) {
                  showToast(err.message || "Could not upload COR.", "error");
                });
              };
              reader.readAsDataURL(file);
            });
          }
        }
      }

      // Load subjects with filters
      var subjects = await getCurriculumSubjects();
      var yearFilterBtn = document.querySelector(".curriculum-year-filter.active");
      var filterYear = yearFilterBtn ? yearFilterBtn.getAttribute("data-year") : "all";

      var semSelect = document.getElementById("curriculum-semester-filter");
      var filterSem = semSelect ? semSelect.value : "all";

      var filtered = subjects.filter(function (s) {
        var matchYear = (filterYear === "all" || s.year === filterYear);
        var matchSem = (filterSem === "all" || !s.semester || s.semester === filterSem);
        return matchYear && matchSem;
      });

      list.innerHTML = "";
      if (filtered.length === 0) {
        list.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon"><i class="fas fa-book-open"></i></div>' +
            '<p class="empty-title">No subjects found</p>' +
            '<p class="empty-sub">Add subjects to your curriculum or select another filter.</p>' +
          '</div>';
        return;
      }
      filtered.forEach(function (item) {
        var card = document.createElement("div");
        card.className = "curriculum-subject-card";
        card.style.borderLeftColor = stringToColor(item.name);
        card.innerHTML =
          '<div class="cs-info">' +
            '<h4>' + escapeHtml(item.name) + '</h4>' +
            '<div class="cs-meta">' +
              '<span><i class="fas fa-hashtag"></i> ' + escapeHtml(item.code) + '</span>' +
              '<span><i class="fas fa-clock"></i> ' + escapeHtml(item.schedule || "No schedule") + '</span>' +
              '<span class="cs-year">' + escapeHtml(item.year) + '</span>' +
              '<span class="cs-sem">' + escapeHtml(item.semester || "1st Semester") + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="cs-actions">' +
            '<button class="btn-icon btn-edit-curriculum" data-id="' + item.id + '" title="Edit"><i class="fas fa-pen"></i></button>' +
            '<button class="btn-icon btn-delete-curriculum" data-id="' + item.id + '" title="Delete"><i class="fas fa-trash"></i></button>' +
          '</div>';
        list.appendChild(card);
      });

      list.querySelectorAll(".btn-edit-curriculum").forEach(function (btn) {
        btn.addEventListener("click", function () {
          editCurriculumSubject(btn.getAttribute("data-id"));
        });
      });
      list.querySelectorAll(".btn-delete-curriculum").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showConfirm("Delete this curriculum subject?", function () {
            withLoading(function () { return deleteCurriculumSubject(btn.getAttribute("data-id")); }).then(function () {
              loadCurriculum();
              showToast("Subject deleted.", "info");
            }).catch(function (err) {
              showToast(err.message || "Could not delete subject.", "error");
            });
          });
        });
      });

    } catch (err) {
      console.error("Error loading curriculum:", err);
      list.innerHTML = '<div class="empty-state"><p class="empty-title">Could not load curriculum</p><p class="empty-sub">' + escapeHtml(err.message) + '</p></div>';
    }
  }

  function downloadPDF(pdfData, defaultName) {
    var a = document.createElement("a");
    a.href = pdfData.data;
    a.download = pdfData.name || defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function editCurriculumSubject(id) {
    getCurriculumSubjects().then(function (subjects) {
      var found = subjects.find(function (s) { return s.id === id; });
      if (!found) return;
      document.getElementById("curriculum-subject-edit-id").value = id;
      document.getElementById("curriculum-subject-name").value = found.name;
      document.getElementById("curriculum-subject-code").value = found.code;
      document.getElementById("curriculum-subject-schedule").value = found.schedule || "";
      document.getElementById("curriculum-subject-year").value = found.year;
      document.getElementById("curriculum-subject-semester").value = found.semester || "1st Semester";
      document.getElementById("curriculum-subject-modal-title").textContent = "Edit Subject";
      openModal("curriculum-subject-modal-overlay");
    }).catch(function (err) {
      showToast("Could not load subject.", "error");
    });
  }

  function setupCurriculumFilters() {
    var filters = document.querySelectorAll(".curriculum-year-filter");
    filters.forEach(function (btn) {
      if (!btn._ccBound) {
        btn._ccBound = true;
        btn.addEventListener("click", function () {
          filters.forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          loadCurriculum();
        });
      }
    });

    var semFilterSelect = document.getElementById("curriculum-semester-filter");
    if (semFilterSelect && !semFilterSelect._ccBound) {
      semFilterSelect._ccBound = true;
      semFilterSelect.addEventListener("change", function () {
        loadCurriculum();
      });
    }
  }

  // ===== SETTINGS =====
  function getSettings() { return getData(KEYS.SETTINGS, { fontType: "sans-serif" }); }
  function saveSettings(settings) { setData(KEYS.SETTINGS, settings); }

  function applySettings(settings) {
    if (!settings) settings = getSettings();
    var fontType = settings.fontType || "sans-serif";
    document.documentElement.setAttribute("data-font-type", fontType);
  }

  function updateStorageDisplay() {
    var total = 0;
    for (var key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += ((localStorage[key] || "").length) * 2;
      }
    }
    var el = document.getElementById("settings-storage");
    if (!el) return;
    if (total < 1024) el.textContent = total + " B";
    else if (total < 1048576) el.textContent = (total / 1024).toFixed(1) + " KB";
    else el.textContent = (total / 1048576).toFixed(2) + " MB";
  }

  function loadSettings() {
    const settings = getSettings();
    const fontSelect = document.getElementById("font-type-select");
    if (fontSelect) fontSelect.value = settings.fontType || "sans-serif";
    applySettings(settings);
    updateStorageDisplay();
  }

  // ===== PROFILE FORM =====
  function loadProfileForm() {
    var profile = getProfile();
    var user = getCurrentUser();
    var map = {
      "profile-fullname": profile.name || (user ? user.name : ""),
      "profile-email": profile.email || (user ? user.email : ""),
      "profile-bio": profile.bio || "",
      "profile-student-id": profile.studentId || "",
      "profile-course": profile.course || "",
      "profile-year": profile.year || "",
      "profile-section": profile.section || "BSIT 3-A",
      "profile-contact": profile.contact || "",
      "profile-birthdate": profile.birthdate || "",
      "profile-gender": profile.gender || "",
      "profile-address": profile.address || "",
      "profile-emergency": profile.emergency || "",
      "profile-guardian-name": profile.guardianName || "",
      "profile-guardian-contact": profile.guardianContact || "",
    };
    for (var id in map) {
      var el = document.getElementById(id);
      if (el) el.value = map[id];
    }
    var avatar = document.getElementById("profile-avatar");
    var photo = getProfilePhoto();
    if (avatar) {
      if (photo) {
        avatar.style.backgroundImage = "url(" + photo + ")";
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.textContent = "";
      } else {
        avatar.style.backgroundImage = "";
        avatar.textContent = initials(profile.name || (user ? user.name : "S"));
      }
    }
  }

  // ===== POST TOOLBAR =====
  var currentPostImage = null;

  function setupPostToolbar() {
    var editor = document.getElementById("post-content-editable");
    if (!editor) return;
    document.querySelectorAll("#post-modal-overlay .toolbar-btn[data-command]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        document.execCommand(btn.getAttribute("data-command"), false, null);
        btn.classList.toggle("active-toolbar");
      });
    });
    var fontSelect = document.getElementById("post-font-select");
    if (fontSelect) {
      fontSelect.addEventListener("change", function () {
        document.execCommand("fontName", false, fontSelect.value);
        editor.focus();
      });
    }
    var imageBtn = document.getElementById("post-image-btn");
    var imageInput = document.getElementById("post-image-input");
    if (imageBtn && imageInput) {
      imageBtn.addEventListener("click", function () { imageInput.click(); });

      // ===== FIXED IMAGE UPLOAD HANDLER =====
      imageInput.addEventListener("change", async function () {
        var file = imageInput.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          showToast("Image must be smaller than 5 MB.", "error");
          imageInput.value = "";
          return;
        }

        try {
          // Get current user
          var user = getCurrentUser();
          if (!user) {
            showToast("You must be logged in to upload images.", "error");
            imageInput.value = "";
            return;
          }

          // Ensure Supabase is ready
          if (!isSupabaseReady()) {
            showToast("Supabase is not available. Please check your connection.", "error");
            imageInput.value = "";
            return;
          }

          // Generate a unique filename
          var fileExt = file.name.split('.').pop();
          var fileName = "posts/" + user.id + "/" + Date.now() + "." + fileExt;

          // Upload to Supabase Storage
          var uploadResult = await withLoading(function () {
            return withTimeout(supabaseClient.storage.from('post-images').upload(fileName, file), 8000, "Image upload");
          });
          if (uploadResult.error) {
            console.error("[ClassConnect] Storage upload error:", uploadResult.error);
            throw new Error(uploadResult.error.message || "Upload failed.");
          }

          // Get the public URL
          var urlData = supabaseClient.storage.from('post-images').getPublicUrl(fileName);
          if (!urlData || !urlData.publicUrl) {
            throw new Error("Could not retrieve the uploaded image URL.");
          }

          // Store the URL for the post
          currentPostImage = urlData.publicUrl;

          // Show preview
          var preview = document.getElementById("post-image-preview");
          var img = document.getElementById("post-preview-img");
          if (preview && img) {
            img.src = currentPostImage;
            preview.hidden = false;
          }

          imageInput.value = "";
          showToast("Image uploaded successfully.", "success");
        } catch (error) {
          console.error("[ClassConnect] Image upload error:", error);
          showToast("Failed to upload image: " + (error.message || "Unknown error"), "error");
          imageInput.value = "";
        }
      });
      // ===== END FIXED IMAGE UPLOAD HANDLER =====
    }
    var removeBtn = document.getElementById("post-remove-image-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        currentPostImage = null;
        var preview = document.getElementById("post-image-preview");
        var img = document.getElementById("post-preview-img");
        if (preview) preview.hidden = true;
        if (img) img.src = "#";
      });
    }
  }

  function setupEditPostToolbar() {
    var editor = document.getElementById("edit-post-content-editable");
    if (!editor) return;
    document.querySelectorAll("#edit-post-modal-overlay .toolbar-btn[data-command]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        document.execCommand(btn.getAttribute("data-command"), false, null);
        btn.classList.toggle("active-toolbar");
      });
    });
    var fontSelect = document.getElementById("edit-post-font-select");
    if (fontSelect) {
      fontSelect.addEventListener("change", function () {
        document.execCommand("fontName", false, fontSelect.value);
        editor.focus();
      });
    }
  }

  function getPostContent() {
    var editor = document.getElementById("post-content-editable");
    return editor ? editor.innerHTML.trim() : "";
  }

  function clearPostContent() {
    var editor = document.getElementById("post-content-editable");
    if (editor) editor.innerHTML = "";
    currentPostImage = null;
    var preview = document.getElementById("post-image-preview");
    var img = document.getElementById("post-preview-img");
    if (preview) preview.hidden = true;
    if (img) img.src = "#";
    var fontSel = document.getElementById("post-font-select");
    if (fontSel) fontSel.selectedIndex = 0;
    document.querySelectorAll(".toolbar-btn.active-toolbar").forEach(function (b) {
      b.classList.remove("active-toolbar");
    });
  }

  function isPostContentEmpty(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    return !tmp.textContent.trim() && !tmp.querySelector("img");
  }

  function toggleSettingsGroup(groupId) {
    var group = document.getElementById(groupId);
    if (!group) return;
    var isHidden = group.style.display === "none" || group.style.display === "";
    group.style.display = isHidden ? "block" : "none";
    var chevronId = groupId.replace("-group", "-chevron");
    var chevron = document.getElementById(chevronId);
    if (chevron) chevron.style.transform = isHidden ? "rotate(180deg)" : "";
  }

  // ===== EXPORT / IMPORT DATA (Now mostly for settings and maybe migration) =====
  function exportData() {
    var user = getCurrentUser();
    var data = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      exportedBy: user ? user.email : "unknown",
      settings: getSettings(),
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "classconnect-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Settings exported successfully.", "success");
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.version) { showToast("Invalid backup file.", "error"); return; }
        showConfirm("This will replace your settings. Continue?", function () {
          if (data.settings) saveSettings(data.settings);
          applySettings(getSettings());
          showToast("Settings imported. Reloading...", "success");
          setTimeout(function () { location.reload(); }, 1500);
        });
      } catch (err) {
        showToast("Failed to import. Check the file format.", "error");
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    showConfirm("Delete all your data? This cannot be undone.", function () {
      showConfirm("This is permanent. Are you absolutely sure?", function () {
        var user = getCurrentUser();
        if (user) {
          var tables = ["posts", "subjects", "schedule", "assignments", "grades", "curriculum_subjects", "curriculum_pdf", "cor_pdf"];
          withLoading(function () {
            return Promise.all(tables.map(function (table) { return supabaseTable(table).delete().eq("user_id", user.id); }));
          }).then(function () {
            showToast("All data cleared. Reloading...", "info");
            setTimeout(function () { location.reload(); }, 1500);
          }).catch(function (err) {
            showToast("Could not clear all data: " + err.message, "error");
          });
        } else {
          showToast("No user logged in.", "error");
        }
      });
    });
  }

  // ===== LOAD DASHBOARD =====
  async function loadDashboard() {
    if (!isLoggedIn()) {
      showPage("login-page");
      showLoginForm();
      return;
    }
    var user = getCurrentUser();
    var name = user ? user.name : "Student";
    var email = user ? user.email : "";
    var dashName = document.getElementById("dash-user-name");
    var drawerName = document.getElementById("drawer-name");
    var drawerEmail = document.getElementById("drawer-email");
    if (dashName) dashName.textContent = name;
    if (drawerName) drawerName.textContent = name;
    if (drawerEmail) drawerEmail.textContent = email;
    var composerAvatar = document.getElementById("composer-avatar");
    if (composerAvatar) composerAvatar.textContent = initials(name);
    var drawerAvatar = document.getElementById("drawer-avatar");
    if (drawerAvatar) {
      var photo = getProfilePhoto();
      if (photo) {
        drawerAvatar.style.backgroundImage = "url(" + photo + ")";
        drawerAvatar.style.backgroundSize = "cover";
        drawerAvatar.style.backgroundPosition = "center";
        drawerAvatar.textContent = "";
      } else {
        drawerAvatar.style.backgroundImage = "";
        drawerAvatar.textContent = initials(name);
      }
    }

    // Load all data from Supabase
    try {
      showGlobalLoading();
      loadProfileForm();
      await loadPosts(document.getElementById("dashboard-search-input") ? document.getElementById("dashboard-search-input").value : "");
      await loadSubjects();
      await loadSchedule();
      await loadAssignments();
      await loadGrades();
      await loadClassmates();
      loadFaqs();
      loadSettings();
      switchView("view-home");
      startInactivityTimer();
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      showToast("Some data could not be loaded. Please refresh.", "warning");
    } finally {
      hideGlobalLoading();
    }
  }

  // ===== INIT EVENT LISTENERS =====
  function initEventListeners() {
    var showSignupLink = document.getElementById("show-signup");
    var showLoginLink = document.getElementById("show-login");
    if (showSignupLink) {
      showSignupLink.addEventListener("click", function (e) { e.preventDefault(); showSignupForm(); });
    }
    if (showLoginLink) {
      showLoginLink.addEventListener("click", function (e) { e.preventDefault(); showLoginForm(); });
    }

    document.querySelectorAll(".toggle-password").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.getAttribute("data-target"));
        var icon = btn.querySelector("i");
        if (!input || !icon) return;
        if (input.type === "password") {
          input.type = "text";
          icon.classList.replace("fa-eye", "fa-eye-slash");
        } else {
          input.type = "password";
          icon.classList.replace("fa-eye-slash", "fa-eye");
        }
      });
    });

    var loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        hideError("login-error");
        var emailInput = document.getElementById("login-email");
        var passwordInput = document.getElementById("login-password");
        var email = emailInput ? (emailInput.value || "").trim() : "";
        var password = passwordInput ? passwordInput.value || "" : "";
        if (!isValidEmail(email)) { showError("login-error", "Please enter a valid email address."); return; }
        if (!password) { showError("login-error", "Please enter your password."); return; }
        var btn = document.getElementById("login-submit-btn");
        setButtonLoading(btn, true);
        try {
          var result = await withLoading(function () { return login(email, password); });
          setButtonLoading(btn, false);
          if (!result.success) { showError("login-error", result.message); return; }
          loginForm.reset();
          showPage("dashboard-page");
          loadDashboard();
          var currentUser = getCurrentUser();
          showToast(
            "Welcome back, " + (currentUser ? currentUser.name : "Student") + ".",
            "success"
          );
        } catch (error) {
          console.error("[ClassConnect] Login form error:", error);
          showError("login-error", "Unable to sign in right now. Please try again.");
          setButtonLoading(btn, false);
        }
      });
    }

    var signupForm = document.getElementById("signup-form");
    if (signupForm) {
      signupForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        hideError("signup-error");
        var nameInput = document.getElementById("signup-name");
        var emailInput = document.getElementById("signup-email");
        var passwordInput = document.getElementById("signup-password");
        var confirmInput = document.getElementById("signup-confirm");
        var name = nameInput ? (nameInput.value || "").trim() : "";
        var email = emailInput ? (emailInput.value || "").trim() : "";
        var password = passwordInput ? passwordInput.value || "" : "";
        var confirm = confirmInput ? (confirmInput.value || "" ) : "";
        if (name.length < 2) { showError("signup-error", "Please enter your full name."); return; }
        if (!isValidEmail(email)) { showError("signup-error", "Please enter a valid email address."); return; }
        if (password.length < 6) { showError("signup-error", "Password must be at least 6 characters."); return; }
        if (password !== confirm) { showError("signup-error", "Passwords do not match."); return; }
        var btn = document.getElementById("signup-submit-btn");
        setButtonLoading(btn, true);
        try {
          var result = await withLoading(function () { return signup(name, email, password); });
          setButtonLoading(btn, false);
          if (!result.success) { showError("signup-error", result.message); return; }
          signupForm.reset();
          showSuccessModal(
            result.message || "Your account has been created successfully!",
            "Back to Login",
            function () {
            showPage("login-page");
            showLoginForm();
            showToast("Please log in with your new account.", "info");
            }
          );
        } catch (error) {
          console.error("[ClassConnect] Signup form error:", error);
          showError("signup-error", "Unable to create your account right now. Please try again.");
          setButtonLoading(btn, false);
        }
      });
    }

    ["logout-btn", "drawer-logout-btn", "settings-logout-btn"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener("click", logout);
    });

    var clearCacheBtn = document.getElementById("drawer-clear-cache-btn");
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener("click", function () {
        closeDrawer();
        showConfirm(
          "Clear app cache?\n\nThis will remove cached files and restart ClassConnect to enforce the latest updates.",
          function () {
            if ("caches" in window) {
              caches.keys().then(function (names) {
                return Promise.all(names.map(function (name) { return caches.delete(name); }));
              }).then(function () {
                showToast("Cache cleared. Restarting…", "success");
                setTimeout(function () { location.reload(true); }, 1200);
              }).catch(function () {
                showToast("Cache cleared. Restarting…", "success");
                setTimeout(function () { location.reload(true); }, 1200);
              });
            } else {
              showToast("Cache cleared. Restarting…", "success");
              setTimeout(function () { location.reload(true); }, 1200);
            }
          }
        );
      });
    }

    var hamburger = document.getElementById("hamburger-btn");
    var drawerClose = document.getElementById("drawer-close-btn");
    var drawerOverlay = document.getElementById("side-drawer-overlay");
    if (hamburger) hamburger.addEventListener("click", toggleDrawer);
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
    if (drawerOverlay) {
      drawerOverlay.addEventListener("click", function (e) {
        if (e.target === drawerOverlay) closeDrawer();
      });
    }

    document.querySelectorAll(".drawer-item[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () { switchView(btn.getAttribute("data-view")); });
    });

    document.querySelectorAll(".nav-item[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () { switchView(btn.getAttribute("data-view")); });
    });

    var dashboardSearchInput = document.getElementById("dashboard-search-input");
    if (dashboardSearchInput) {
      var searchTimer;
      dashboardSearchInput.addEventListener("input", function (e) {
        clearTimeout(searchTimer);
        var val = e.target.value;
        searchTimer = setTimeout(function () { loadPosts(val); }, 250);
      });
    }

    var forgotLink = document.querySelector(".forgot-link");
    if (forgotLink) {
      forgotLink.addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("forgot-email").value = "";
        hideError("forgot-error");
        var successEl = document.getElementById("forgot-success");
        if (successEl) successEl.hidden = true;
        openModal("forgot-password-modal-overlay");
      });
    }

    var closeForgotModal = document.getElementById("close-forgot-modal-btn");
    if (closeForgotModal) {
      closeForgotModal.addEventListener("click", function () {
        closeModal("forgot-password-modal-overlay");
      });
    }

    var forgotBackToLogin = document.getElementById("forgot-back-to-login");
    if (forgotBackToLogin) {
      forgotBackToLogin.addEventListener("click", function (e) {
        e.preventDefault();
        closeModal("forgot-password-modal-overlay");
      });
    }

    var forgotForm = document.getElementById("forgot-password-form");
    if (forgotForm) {
      forgotForm.addEventListener("submit", function (e) {
        e.preventDefault();
        hideError("forgot-error");
        var successEl = document.getElementById("forgot-success");
        if (successEl) successEl.hidden = true;
        var email = (document.getElementById("forgot-email").value || "").trim();
        if (!isValidEmail(email)) {
          showError("forgot-error", "Please enter a valid email address.");
          return;
        }
        var btn = forgotForm.querySelector(".btn-primary");
        setButtonLoading(btn, true);
        var client = getSupabaseClient();
        if (!isSupabaseReady() || !client.auth || typeof client.auth.resetPasswordForEmail !== "function") {
          setButtonLoading(btn, false);
          showError("forgot-error", "Supabase is unavailable. No reset request was sent.");
          return;
        }
        console.log("[ClassConnect] Sending Supabase password reset email.");
        withLoading(function () {
          return withTimeout(
            client.auth.resetPasswordForEmail(email, { redirectTo: window.location.href }),
            8000,
            "Supabase password reset"
          );
        }).then(function (response) {
          setButtonLoading(btn, false);
          if (response && response.error) {
            console.error("[ClassConnect] Supabase password reset failed:", response.error);
            showError(
              "forgot-error",
              isTransientSupabaseError(response.error)
                ? "The connection to Supabase is unavailable. Please try again later."
                : response.error.message || "Unable to send reset instructions."
            );
            return;
          }
          if (successEl) {
            successEl.textContent = "Supabase password reset instructions have been sent to " + email + ".";
            successEl.hidden = false;
          }
          var forgotEmailInput = document.getElementById("forgot-email");
          if (forgotEmailInput) forgotEmailInput.value = "";
          showToast("Password reset link sent to your email.", "success");
        }).catch(function (error) {
          console.error("[ClassConnect] Password reset form error:", error);
          setButtonLoading(btn, false);
          if (isTransientSupabaseError(error)) {
            showError("forgot-error", "The connection is unavailable. Please try again later.");
            return;
          }
          showError("forgot-error", error.message || "Unable to send reset instructions.");
        });
      });
    }

    var forgotOverlay = document.getElementById("forgot-password-modal-overlay");
    if (forgotOverlay) {
      forgotOverlay.addEventListener("click", function (e) {
        if (e.target === forgotOverlay) closeModal("forgot-password-modal-overlay");
      });
    }

    var composerBtn1 = document.getElementById("open-composer-btn");
    var closeModalBtn = document.getElementById("close-modal-btn");
    var postOverlay = document.getElementById("post-modal-overlay");
    var submitPostBtn = document.getElementById("submit-post-btn");

    function openPostModal() {
      openModal("post-modal-overlay");
      setTimeout(function () {
        var ed = document.getElementById("post-content-editable");
        if (ed) ed.focus();
      }, 300);
    }

    if (composerBtn1) composerBtn1.addEventListener("click", openPostModal);

    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", function () {
        closeModal("post-modal-overlay");
        clearPostContent();
      });
    }
    if (postOverlay) {
      postOverlay.addEventListener("click", function (e) {
        if (e.target === postOverlay) { closeModal("post-modal-overlay"); clearPostContent(); }
      });
    }
    if (submitPostBtn) {
      submitPostBtn.addEventListener("click", function () {
        var content = getPostContent();
        if (isPostContentEmpty(content) && !currentPostImage) {
          showToast("Please write something before posting.", "warning");
          return;
        }
        withLoading(function () { return createPost(content, currentPostImage); }).then(function () {
          closeModal("post-modal-overlay");
          clearPostContent();
          loadPosts(dashboardSearchInput ? dashboardSearchInput.value : "");
          switchView("view-home");
          showToast("Post shared successfully.", "success");
        }).catch(function (err) {
          showToast(err.message || "Could not create post.", "error");
        });
      });
    }

    var closeEditModal = document.getElementById("close-edit-modal-btn");
    var editOverlay = document.getElementById("edit-post-modal-overlay");
    var saveEditBtn = document.getElementById("save-edit-post-btn");

    if (closeEditModal) {
      closeEditModal.addEventListener("click", function () {
        closeModal("edit-post-modal-overlay");
      });
    }
    if (editOverlay) {
      editOverlay.addEventListener("click", function (e) {
        if (e.target === editOverlay) closeModal("edit-post-modal-overlay");
      });
    }
    if (saveEditBtn) {
      saveEditBtn.addEventListener("click", function () {
        var id = document.getElementById("edit-post-id").value;
        var editor = document.getElementById("edit-post-content-editable");
        var content = editor ? editor.innerHTML.trim() : "";
        if (!content) {
          showToast("Please write something.", "warning");
          return;
        }
        withLoading(function () { return updatePost(id, content); }).then(function () {
          closeModal("edit-post-modal-overlay");
          loadPosts(dashboardSearchInput ? dashboardSearchInput.value : "");
          showToast("Post updated successfully.", "success");
        }).catch(function (err) {
          showToast(err.message || "Failed to update post.", "error");
        });
      });
    }

    // ----- SUBJECTS -----
    var addSubjectBtn = document.getElementById("add-subject-btn");
    var closeSubjectModal = document.getElementById("close-subject-modal-btn");
    var subjectOverlay = document.getElementById("subject-modal-overlay");
    var subjectForm = document.getElementById("subject-form");

    if (addSubjectBtn) {
      addSubjectBtn.addEventListener("click", function () {
        document.getElementById("subject-edit-id").value = "";
        document.getElementById("subject-name").value = "";
        document.getElementById("subject-professor").value = "";
        document.getElementById("subject-schedule").value = "";
        document.getElementById("subject-modal-title").textContent = "Add Subject";
        openModal("subject-modal-overlay");
      });
    }
    if (closeSubjectModal) closeSubjectModal.addEventListener("click", function () { closeModal("subject-modal-overlay"); });
    if (subjectOverlay) {
      subjectOverlay.addEventListener("click", function (e) {
        if (e.target === subjectOverlay) closeModal("subject-modal-overlay");
      });
    }
    if (subjectForm) {
      subjectForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var id = document.getElementById("subject-edit-id").value;
        var name = (document.getElementById("subject-name").value || "").trim();
        var professor = (document.getElementById("subject-professor").value || "").trim();
        var schedule = (document.getElementById("subject-schedule").value || "").trim();
        if (!name) { showToast("Please enter a subject name.", "warning"); return; }
        if (id) {
          withLoading(function () { return updateSubject(id, { name: name, professor: professor, schedule: schedule }); }).then(function () {
            closeModal("subject-modal-overlay");
            subjectForm.reset();
            loadSubjects();
            showToast("Subject updated.", "success");
          }).catch(function (err) {
            showToast(err.message || "Could not update subject.", "error");
          });
        } else {
          withLoading(function () { return addSubject(name, professor, schedule); }).then(function () {
            closeModal("subject-modal-overlay");
            subjectForm.reset();
            loadSubjects();
            showToast("Subject added.", "success");
          }).catch(function (err) {
            showToast(err.message || "Could not add subject.", "error");
          });
        }
      });
    }

    // ----- SUBJECT TASK -----
    var closeSubjectTaskModal = document.getElementById("close-subject-task-modal-btn");
    var subjectTaskOverlay = document.getElementById("subject-task-modal-overlay");
    var subjectTaskForm = document.getElementById("subject-task-form");

    if (closeSubjectTaskModal) closeSubjectTaskModal.addEventListener("click", function () { closeModal("subject-task-modal-overlay"); });
    if (subjectTaskOverlay) {
      subjectTaskOverlay.addEventListener("click", function (e) {
        if (e.target === subjectTaskOverlay) closeModal("subject-task-modal-overlay");
      });
    }
    if (subjectTaskForm) {
      subjectTaskForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var subjectId = document.getElementById("subject-task-subject-id").value;
        var text = (document.getElementById("subject-task-text").value || "").trim();
        if (!text) { showToast("Please enter a task description.", "warning"); return; }
        withLoading(function () { return addSubjectTask(subjectId, text); }).then(function () {
          closeModal("subject-task-modal-overlay");
          subjectTaskForm.reset();
          loadSubjects();
          showToast("Task added.", "success");
        }).catch(function (err) {
          showToast(err.message || "Could not add task.", "error");
        });
      });
    }

    // ----- SCHEDULE -----
    var addScheduleBtn = document.getElementById("add-schedule-btn");
    var closeScheduleMdl = document.getElementById("close-schedule-modal-btn");
    var scheduleOverlay = document.getElementById("schedule-modal-overlay");
    var scheduleForm = document.getElementById("schedule-form");

    if (addScheduleBtn) {
      addScheduleBtn.addEventListener("click", function () {
        document.getElementById("schedule-edit-id").value = "";
        document.getElementById("schedule-subject").value = "";
        document.getElementById("schedule-day").value = "";
        document.getElementById("schedule-start-time").value = "";
        document.getElementById("schedule-end-time").value = "";
        document.getElementById("schedule-room").value = "";
        document.getElementById("schedule-modal-title").textContent = "Add Schedule";
        openModal("schedule-modal-overlay");
      });
    }
    if (closeScheduleMdl) closeScheduleMdl.addEventListener("click", function () { closeModal("schedule-modal-overlay"); });
    if (scheduleOverlay) {
      scheduleOverlay.addEventListener("click", function (e) {
        if (e.target === scheduleOverlay) closeModal("schedule-modal-overlay");
      });
    }
    if (scheduleForm) {
      scheduleForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var id = document.getElementById("schedule-edit-id").value;
        var subject = (document.getElementById("schedule-subject").value || "").trim();
        var day = (document.getElementById("schedule-day").value || "").trim();
        var startTime = document.getElementById("schedule-start-time").value;
        var endTime = document.getElementById("schedule-end-time").value;
        var room = (document.getElementById("schedule-room").value || "").trim();
        if (!subject || !day || !startTime || !endTime) {
          showToast("Please fill in all required fields.", "warning"); return;
        }
        if (id) {
          withLoading(function () { return updateScheduleItem(id, { subject: subject, day: day, start_time: startTime, end_time: endTime, room: room }); }).then(function () {
            closeModal("schedule-modal-overlay");
            scheduleForm.reset();
            loadSchedule();
            showToast("Schedule updated.", "success");
          }).catch(function (err) {
            showToast(err.message || "Could not update schedule.", "error");
          });
        } else {
          withLoading(function () { return addScheduleItem(subject, day, startTime, endTime, room); }).then(function () {
            closeModal("schedule-modal-overlay");
            scheduleForm.reset();
            loadSchedule();
            showToast("Schedule added.", "success");
          }).catch(function (err) {
            showToast(err.message || "Could not add schedule.", "error");
          });
        }
      });
    }

    // ----- ASSIGNMENTS -----
    var addAssignmentBtn = document.getElementById("add-assignment-btn");
    var closeAssignmentMdl = document.getElementById("close-assignment-modal-btn");
    var assignmentOverlay = document.getElementById("assignment-modal-overlay");
    var assignmentForm = document.getElementById("assignment-form");

    if (addAssignmentBtn) {
      addAssignmentBtn.addEventListener("click", function () {
        document.getElementById("assignment-text").value = "";
        document.getElementById("assignment-subject").value = "";
        document.getElementById("assignment-due-date").value = "";
        openModal("assignment-modal-overlay");
      });
    }
    if (closeAssignmentMdl) closeAssignmentMdl.addEventListener("click", function () { closeModal("assignment-modal-overlay"); });
    if (assignmentOverlay) {
      assignmentOverlay.addEventListener("click", function (e) {
        if (e.target === assignmentOverlay) closeModal("assignment-modal-overlay");
      });
    }
    if (assignmentForm) {
      assignmentForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = (document.getElementById("assignment-text").value || "").trim();
        var subject = (document.getElementById("assignment-subject").value || "").trim();
        var due = document.getElementById("assignment-due-date").value;
        if (!text) { showToast("Please enter a task description.", "warning"); return; }
        withLoading(function () { return addAssignment(text, subject, due); }).then(function () {
          closeModal("assignment-modal-overlay");
          assignmentForm.reset();
          loadAssignments();
          showToast("Assignment added.", "success");
        }).catch(function (err) {
          showToast(err.message || "Could not add assignment.", "error");
        });
      });
    }

    // ----- GRADES -----
    var addGradeBtn = document.getElementById("add-grade-btn");
    var closeGradeMdl = document.getElementById("close-grade-modal-btn");
    var gradeOverlay = document.getElementById("grade-modal-overlay");
    var gradeForm = document.getElementById("grade-form");

    if (addGradeBtn) {
      addGradeBtn.addEventListener("click", function () {
        document.getElementById("grade-edit-id").value = "";
        document.getElementById("grade-subject").value = "";
        document.getElementById("grade-value").value = "";
        document.getElementById("grade-units").value = "3";
        var curYear = (document.getElementById("grade-year-filter") || {}).value || "3rd Year";
        var curSem = (document.getElementById("grade-semester-filter") || {}).value || "1st Semester";
        document.getElementById("grade-year").value = curYear === "all" ? "1st Year" : curYear;
        document.getElementById("grade-semester").value = curSem === "all" ? "1st Semester" : curSem;
        document.getElementById("grade-exclude").checked = false;
        document.getElementById("grade-modal-title").textContent = "Add College Grade";
        openModal("grade-modal-overlay");
      });
    }
    if (closeGradeMdl) {
      closeGradeMdl.addEventListener("click", function () {
        closeModal("grade-modal-overlay");
      });
    }
    if (gradeOverlay) {
      gradeOverlay.addEventListener("click", function (e) {
        if (e.target === gradeOverlay) closeModal("grade-modal-overlay");
      });
    }
    if (gradeForm) {
      gradeForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var id = document.getElementById("grade-edit-id").value;
        var subject = (document.getElementById("grade-subject").value || "").trim();
        var gradeVal = parseFloat(document.getElementById("grade-value").value);
        var unitsVal = parseFloat(document.getElementById("grade-units").value) || 3;
        var year = document.getElementById("grade-year").value || "1st Year";
        var semester = document.getElementById("grade-semester").value || "1st Semester";
        var exclude = document.getElementById("grade-exclude").checked;
        if (!subject) { showToast("Please enter a subject name.", "warning"); return; }
        if (isNaN(gradeVal) || gradeVal < 0) {
          showToast("Please enter a valid numeric grade.", "warning"); return;
        }
        if (id) {
          withLoading(function () { return updateGrade(id, { subject: subject, grade: gradeVal, units: unitsVal, year: year, semester: semester, exclude: exclude }); }).then(function () {
            closeModal("grade-modal-overlay");
            gradeForm.reset();
            loadGrades();
            showToast("Grade updated.", "success");
          }).catch(function (err) {
            showToast(err.message || "Could not update grade.", "error");
          });
        } else {
          withLoading(function () { return addGrade(subject, gradeVal, unitsVal, year, semester, exclude); }).then(function () {
            closeModal("grade-modal-overlay");
            gradeForm.reset();
            loadGrades();
            showToast("Grade added to " + year + ", " + semester + ".", "success");
          }).catch(function (err) {
            showToast(err.message || "Could not add grade.", "error");
          });
        }
      });
    }

    var yearFilter = document.getElementById("grade-year-filter");
    var semFilter = document.getElementById("grade-semester-filter");
    if (yearFilter) yearFilter.addEventListener("change", loadGrades);
    if (semFilter) semFilter.addEventListener("change", loadGrades);

    var closeCmProfileModalBtn = document.getElementById("close-classmate-modal-btn");
    if (closeCmProfileModalBtn) {
      closeCmProfileModalBtn.addEventListener("click", function () {
        closeModal("classmate-profile-modal-overlay");
      });
    }
    var cmProfileOverlay = document.getElementById("classmate-profile-modal-overlay");
    if (cmProfileOverlay) {
      cmProfileOverlay.addEventListener("click", function (e) {
        if (e.target === cmProfileOverlay) closeModal("classmate-profile-modal-overlay");
      });
    }

    // ----- PROFILE -----
    var profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var rawSec = document.getElementById("profile-section").value;
        var data = {
          name: (document.getElementById("profile-fullname").value || "").trim(),
          bio: (document.getElementById("profile-bio").value || "").trim(),
          studentId: (document.getElementById("profile-student-id").value || "").trim(),
          course: (document.getElementById("profile-course").value || "").trim(),
          year: document.getElementById("profile-year").value,
          section: normalizeSection(rawSec || "BSIT 3-A"),
          contact: (document.getElementById("profile-contact").value || "").trim(),
          birthdate: document.getElementById("profile-birthdate").value,
          gender: document.getElementById("profile-gender").value,
          address: (document.getElementById("profile-address").value || "").trim(),
          emergency: (document.getElementById("profile-emergency").value || "").trim(),
          guardianName: (document.getElementById("profile-guardian-name").value || "").trim(),
          guardianContact: (document.getElementById("profile-guardian-contact").value || "").trim(),
        };
        if (!data.name) { showToast("Please enter your full name.", "warning"); return; }
        try {
          await withLoading(function () { return saveProfile(data); });
          loadDashboard();
          showToast("Profile saved to Supabase successfully.", "success");
        } catch (error) {
          console.error("[ClassConnect] Profile form save failed:", error);
          showToast(error.message || "Profile could not be saved to Supabase.", "error");
        }
      });
    }

    var photoUploadBtn = document.getElementById("upload-photo-btn");
    var photoInput = document.getElementById("profile-photo-input");
    if (photoUploadBtn && photoInput) {
      photoUploadBtn.addEventListener("click", function () { photoInput.click(); });
      photoInput.addEventListener("change", function () {
        var file = photoInput.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
          showToast("Photo must be smaller than 3 MB.", "error");
          photoInput.value = "";
          return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
          withLoading(function () { return saveProfilePhoto(e.target.result); })
            .then(function () {
              loadProfileForm();
              showToast("Profile photo saved to Supabase.", "success");
            })
            .catch(function (error) {
              console.error("[ClassConnect] Profile photo save failed:", error);
              showToast(error.message || "Profile photo could not be saved to Supabase.", "error");
            });
        };
        reader.readAsDataURL(file);
        photoInput.value = "";
      });
    }

    var fontTypeSelect = document.getElementById("font-type-select");
    if (fontTypeSelect) {
      fontTypeSelect.addEventListener("change", function () {
        var settings = getSettings();
        settings.fontType = fontTypeSelect.value;
        saveSettings(settings);
        applySettings(settings);
        showToast("Font type updated.", "info");
      });
    }

    var changePwdBtn = document.getElementById("settings-change-password-btn");
    if (changePwdBtn) {
      changePwdBtn.addEventListener("click", async function () {
        var current = document.getElementById("settings-current-password").value;
        var newPwd = document.getElementById("settings-new-password").value;
        var confirm = document.getElementById("settings-confirm-password").value;
        var result = await withLoading(function () { return changePassword(current, newPwd, confirm); });
        if (result.success) {
          showToast(result.message, "success");
          document.getElementById("settings-current-password").value = "";
          document.getElementById("settings-new-password").value = "";
          document.getElementById("settings-confirm-password").value = "";
          toggleSettingsGroup("password-group");
        } else {
          showToast(result.message, "error");
        }
      });
    }

    var clearDataBtn = document.getElementById("settings-clear-data-btn");
    if (clearDataBtn) clearDataBtn.addEventListener("click", clearAllData);

    var exportBtn = document.getElementById("settings-export-btn");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    var importBtn = document.getElementById("settings-import-btn");
    var importInput = document.getElementById("settings-import-input");
    if (importBtn && importInput) {
      importBtn.addEventListener("click", function () { importInput.click(); });
      importInput.addEventListener("change", function () {
        var file = importInput.files[0];
        if (file) { importData(file); importInput.value = ""; }
      });
    }

    var pwdCollapsible = document.querySelector(".settings-collapsible");
    if (pwdCollapsible) {
      pwdCollapsible.addEventListener("click", function (e) {
        if (e.target.closest("input") || e.target.closest("button")) return;
        toggleSettingsGroup("password-group");
      });
    }

    window.addEventListener("offline", function () { handleOffline(true); });
    window.addEventListener("online", function () {
      handleOffline(false);
      showToast("Connection restored.", "success");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeAllModals(); closeDrawer(); }
    });

    // ----- CURRICULUM -----
    var addCurriculumBtn = document.getElementById("add-curriculum-subject-btn");
    if (addCurriculumBtn) {
      addCurriculumBtn.addEventListener("click", function () {
        document.getElementById("curriculum-subject-edit-id").value = "";
        document.getElementById("curriculum-subject-name").value = "";
        document.getElementById("curriculum-subject-code").value = "";
        document.getElementById("curriculum-subject-schedule").value = "";
        document.getElementById("curriculum-subject-year").value = "1st Year";
        document.getElementById("curriculum-subject-semester").value = "1st Semester";
        document.getElementById("curriculum-subject-modal-title").textContent = "Add Subject";
        openModal("curriculum-subject-modal-overlay");
      });
    }

    var closeCurriculumModal = document.getElementById("close-curriculum-subject-modal-btn");
    if (closeCurriculumModal) {
      closeCurriculumModal.addEventListener("click", function () {
        closeModal("curriculum-subject-modal-overlay");
      });
    }
    var curriculumOverlay = document.getElementById("curriculum-subject-modal-overlay");
    if (curriculumOverlay) {
      curriculumOverlay.addEventListener("click", function (e) {
        if (e.target === curriculumOverlay) closeModal("curriculum-subject-modal-overlay");
      });
    }

    var curriculumForm = document.getElementById("curriculum-subject-form");
    if (curriculumForm) {
      curriculumForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var id = document.getElementById("curriculum-subject-edit-id").value;
        var name = (document.getElementById("curriculum-subject-name").value || "").trim();
        var code = (document.getElementById("curriculum-subject-code").value || "").trim();
        var schedule = (document.getElementById("curriculum-subject-schedule").value || "").trim();
        var year = document.getElementById("curriculum-subject-year").value;
        var semester = document.getElementById("curriculum-subject-semester").value;
        if (!name || !code || !year) {
          showToast("Please fill in all required fields.", "warning");
          return;
        }
        if (id) {
          withLoading(function () { return updateCurriculumSubject(id, { name: name, code: code, schedule: schedule, year: year, semester: semester }); }).then(function () {
            closeModal("curriculum-subject-modal-overlay");
            curriculumForm.reset();
            loadCurriculum();
            showToast("Subject updated.", "success");
          }).catch(function (err) {
            showToast(err.message || "Could not update subject.", "error");
          });
        } else {
          withLoading(function () { return addCurriculumSubject(name, code, schedule, year, semester); }).then(function () {
            closeModal("curriculum-subject-modal-overlay");
            curriculumForm.reset();
            loadCurriculum();
            showToast("Subject added to " + year + ", " + semester + ".", "success");
          }).catch(function (err) {
            showToast(err.message || "Could not add subject.", "error");
          });
        }
      });
    }

    var uploadPdfBtn = document.getElementById("upload-curriculum-pdf-btn");
    if (uploadPdfBtn) {
      uploadPdfBtn.addEventListener("click", function () {
        var fileInput = document.getElementById("pdf-file-input");
        if (fileInput) fileInput.click();
      });
    }

    // ----- INACTIVITY: reset timer on any user activity -----
    ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"].forEach(function (evName) {
      document.addEventListener(evName, resetInactivityTimer, { passive: true });
    });

    // ----- INACTIVITY MODAL: Back to Login button -----
    var inactivityBackBtn = document.getElementById("inactivity-back-to-login-btn");
    if (inactivityBackBtn) {
      inactivityBackBtn.addEventListener("click", function () {
        hideInactivityModal();
        showPage("login-page");
        showLoginForm();
      });
    }
  }

  // ===== INIT =====
  var hasInitialized = false;

  function showLoginFallback(reason) {
    console.warn("[ClassConnect] Showing login fallback:", reason || "no active session");
    try {
      showPage("login-page");
      showLoginForm();
    } catch (error) {
      console.error("[ClassConnect] Could not render the login page:", error);
      var loginPage = document.getElementById("login-page");
      if (loginPage) {
        loginPage.style.display = "";
        loginPage.classList.add("active-page");
      }
    }
  }

  function routeAfterSplash() {
    console.log("[ClassConnect] Splash timer completed; checking authentication.");

    // Fail safe first: the login page is always reachable at this point.
    showLoginFallback("startup fallback");

    getRemoteSession().then(function (remote) {
      if (remote.session && remote.session.user) {
        console.log("[ClassConnect] Restoring Supabase session.");
        var authenticatedUser = saveRemoteUserSession(remote.session.user);
        if (authenticatedUser) {
          loadRemoteProfile()
            .catch(function (error) {
              console.error("[ClassConnect] Could not load Supabase profile during startup:", error);
              remoteProfile = null;
            })
            .then(function () {
              showPage("dashboard-page");
              loadDashboard();
            });
          return;
        }
      }

      console.log("[ClassConnect] No active Supabase session; login page is ready.");
      showLoginFallback(remote.error ? "Supabase session unavailable" : "no active session");
    }).catch(function (error) {
      console.error("[ClassConnect] Startup auth routing failed; login remains available:", error);
      showLoginFallback("startup auth exception");
    });
  }

  function init() {
    if (hasInitialized) {
      console.warn("[ClassConnect] Duplicate init call ignored.");
      return;
    }
    hasInitialized = true;
    console.log("[ClassConnect] Initializing ClassConnect...");

    try {
      showPage("splash-page");
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } catch (error) {
      console.error("[ClassConnect] Splash setup failed:", error);
      showLoginFallback("splash setup exception");
    }

    setTimeout(function () {
      console.log("[ClassConnect] Splash screen finished after 1.8 seconds.");
      var splash = document.getElementById("splash-page");
      if (splash) {
        splash.style.transition = "opacity 0.3s ease";
        splash.style.opacity = "0";
        setTimeout(function () {
          if (splash.parentNode) splash.style.display = "none";
          routeAfterSplash();
        }, 300);
      } else {
        console.warn("[ClassConnect] Splash page not found; routing directly.");
        routeAfterSplash();
      }
    }, 1800);

    try {
      initializeSupabase();
      applySettings(getSettings());
      lockPortrait();

      var bottomNav = document.querySelector(".bottom-nav");
      if (bottomNav) bottomNav.style.display = "none";

      initEventListeners();
      setupPostToolbar();
      setupEditPostToolbar();
      registerServiceWorker();
      handleOffline(!navigator.onLine);
      console.log("[ClassConnect] Optional app setup completed.");
    } catch (error) {
      console.error("[ClassConnect] Optional setup failed; startup will continue:", error);
    }
  }

  window.navigateTo = navigateTo;
  window.toggleSettingsGroup = toggleSettingsGroup;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
