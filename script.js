/* file: script.js - ClassConnect Complete Application Script */

// Supabase Configuration
const SUPABASE_URL = "https://uctodqnrwrrorppkgagbl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjdG9kcW5yd3Jyb3Bwa2FnZ2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODk0NDYsImV4cCI6MjEwMTI2NTQ0Nn0.EwFU5LmczD8PLLeV0jTFvWxnuMzL65xy_zpkZEAV3NA";

/*
 * Supabase bootstrap
 *
 * The Supabase CDN exposes an SDK namespace at window.supabase. Keep the
 * actual client in a different variable. Reusing the name "supabase" for
 * both objects is a common source of:
 *   Cannot read properties of undefined (reading 'getSession')
 *
 * The app is intentionally usable without the SDK or a network connection.
 * In that case auth falls back to the existing localStorage implementation.
 * Never put a Supabase secret/service-role key in this browser file. The
 * publishable/anon key is the only key that belongs in a client-side app.
 */
let supabaseClient = null;
let supabaseStatus = "not-initialized";

function createSupabaseFallback(reason) {
  console.warn("[ClassConnect] Supabase fallback mode:", reason);
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
  // Retry when the SDK was loaded after this file.
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
    console.warn("[ClassConnect] Remote session check skipped; using local fallback.");
    return Promise.resolve({ session: null, error: null, available: false });
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
      console.error("[ClassConnect] Supabase session check failed; continuing in fallback mode:", error);
      return { session: null, error: error, available: true };
    });
}

(function () {
  "use strict";

  const KEYS = {
    USERS: "cc_users",
    SESSION: "cc_session",
    POSTS: "cc_posts",
    SUBJECTS: "cc_subjects",
    SCHEDULE: "cc_schedule",
    ASSIGNMENTS: "cc_assignments",
    GRADES: "cc_grades",
    PROFILE: "cc_profile",
    SETTINGS: "cc_settings",
    CLASSMATES: "cc_classmates",
    CURRICULUM_SUBJECTS: "cc_curriculum_subjects",
    CURRICULUM_PDF: "cc_curriculum_pdf",
    COR_PDF: "cc_cor_pdf",
    POST_ACKNOWLEDGMENTS: "cc_post_acknowledgments",
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
    { question: "Is my data safe?", answer: "Your data is stored securely in your browser's local storage and is not shared with third parties." },
  ];

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

  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.floor(hours / 24);
    if (days < 7) return days + "d ago";
    return Math.floor(days / 7) + "w ago";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function normalizeSection(section) {
    if (!section) return "";
    return section.trim().toUpperCase();
  }

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

  function getUsers() { return getData(KEYS.USERS, []); }
  function saveUsers(users) { setData(KEYS.USERS, users); }

  function saveRemoteUserSession(authUser) {
    if (!authUser || !authUser.email) {
      console.warn("[ClassConnect] Supabase returned no authenticated user.");
      return null;
    }

    var remoteUser = {
      id: authUser.id || cryptoId(),
      name: authUserName(authUser),
      email: authUser.email.trim().toLowerCase(),
      provider: "supabase",
    };
    var users = getUsers();
    var existing = users.find(function (u) {
      return u.email && u.email.toLowerCase() === remoteUser.email;
    });
    if (existing) {
      existing.id = remoteUser.id;
      existing.name = remoteUser.name;
      existing.provider = "supabase";
    } else {
      users.push(remoteUser);
    }
    saveUsers(users);
    setSession(remoteUser);
    return remoteUser;
  }

  function signupLocal(name, email, password) {
    const users = getUsers();
    const exists = users.some(function (u) {
      return u.email.toLowerCase() === email.toLowerCase();
    });
    if (exists) {
      return { success: false, message: "An account with this email already exists." };
    }
    const newUser = {
      id: cryptoId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
    };
    users.push(newUser);
    saveUsers(users);
    setSession(newUser);
    saveProfile({ name: newUser.name, email: newUser.email, section: "BSIT 3-A", course: "BSIT", year: "3rd Year" });
    return { success: true };
  }

  async function signup(name, email, password) {
    console.log("[ClassConnect] Signup requested for:", email);

    if (isSupabaseReady()) {
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

        if (response && response.error) {
          console.error("[ClassConnect] Supabase signup failed:", response.error);
          if (!isTransientSupabaseError(response.error)) {
            return { success: false, message: response.error.message || "Unable to create your account." };
          }
          console.warn("[ClassConnect] Signup network failure; using local fallback.");
        } else if (response && response.data) {
          var createdUser = response.data.user;
          if (response.data.session && createdUser) {
            saveRemoteUserSession(createdUser);
            saveProfile({
              name: name.trim(),
              email: email.trim().toLowerCase(),
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
              ? "Your account has been created successfully!"
              : "Account created. Check your email to confirm your account, then log in.",
          };
        }
      } catch (error) {
        console.error("[ClassConnect] Supabase signup exception:", error);
        if (!isTransientSupabaseError(error)) {
          return { success: false, message: error.message || "Unable to create your account." };
        }
      }
    }

    console.warn("[ClassConnect] Creating account in local fallback mode.");
    var localResult = signupLocal(name, email, password);
    if (localResult.success) {
      localResult.localFallback = true;
      localResult.message = "Account created in offline mode. You can log in on this device.";
    }
    return localResult;
  }

  function loginLocal(email, password) {
    const users = getUsers();
    const user = users.find(function (u) {
      return u.email &&
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password;
    });
    if (!user) {
      return { success: false, message: "Invalid email or password. Please try again." };
    }
    setSession(user);
    return { success: true };
  }

  async function login(email, password) {
    console.log("[ClassConnect] Login requested for:", email);

    if (isSupabaseReady()) {
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
          if (!isTransientSupabaseError(authError)) {
            return { success: false, message: authError.message || "Invalid email or password." };
          }
          console.warn("[ClassConnect] Login network failure; trying local fallback.");
        } else if (response.data && response.data.user) {
          saveRemoteUserSession(response.data.user);
          console.log("[ClassConnect] Supabase login succeeded.");
          return { success: true, remote: true };
        }
      } catch (error) {
        console.error("[ClassConnect] Supabase login exception:", error);
        if (!isTransientSupabaseError(error)) {
          return { success: false, message: error.message || "Unable to sign in." };
        }
      }
    }

    console.warn("[ClassConnect] Trying local login fallback.");
    var localResult = loginLocal(email, password);
    if (localResult.success) localResult.localFallback = true;
    return localResult;
  }

  function setSession(user) {
    setData(KEYS.SESSION, {
      id: user.id || null,
      name: user.name || "Student",
      email: user.email.toLowerCase(),
      provider: user.provider || "local",
    });
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
        localStorage.removeItem(KEYS.SESSION);
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

  function getCurrentUser() { return getData(KEYS.SESSION, null); }

  function isLoggedIn() {
    const session = getCurrentUser();
    if (!session || !session.email) return false;
    if (session.provider === "supabase") return true;
    return getUsers().some(function (u) {
      return u.email && u.email.toLowerCase() === session.email.toLowerCase();
    });
  }

  function getProfile() {
    const user = getCurrentUser();
    if (!user) return {};
    const all = getData(KEYS.PROFILE + "_all", {});
    return all[user.email.toLowerCase()] || { name: user.name, email: user.email, section: "BSIT 3-A" };
  }

  function saveProfile(data) {
    const user = getCurrentUser();
    if (!user) return;
    const all = getData(KEYS.PROFILE + "_all", {});
    const existing = all[user.email.toLowerCase()] || {};
    data.email = user.email.toLowerCase();
    if (data.section) {
      data.section = normalizeSection(data.section);
    }
    all[user.email.toLowerCase()] = Object.assign({}, existing, data);
    setData(KEYS.PROFILE + "_all", all);
    if (data.name && data.name !== user.name) {
      const users = getUsers();
      const found = users.find(function (u) {
        return u.email.toLowerCase() === user.email.toLowerCase();
      });
      if (found) {
        found.name = data.name;
        saveUsers(users);
        setSession({ name: data.name, email: user.email });
      }
    }
  }

  function getProfilePhoto() {
    return getProfile().photo || null;
  }

  function saveProfilePhoto(base64) {
    const p = getProfile();
    p.photo = base64;
    saveProfile(p);
  }

  function userKey(base) {
    const user = getCurrentUser();
    if (!user) return base;
    return base + "_" + user.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
  }

  /* ===== POSTS & DASHBOARD SEARCH ===== */
  function getPosts() { return getData(userKey(KEYS.POSTS), []); }
  function savePosts(posts) { setData(userKey(KEYS.POSTS), posts); }

  function seedDemoPosts() {
    if (getPosts().length > 0) return;
    savePosts([
      {
        id: cryptoId(),
        author: "Prof. Santos",
        content: "<strong>Reminder:</strong> Project proposals are due this Friday, 11:59 PM. Submit through the class portal.",
        tag: "Web Systems and Technologies",
        timestamp: Date.now() - 1000 * 60 * 60 * 3,
        image: null,
      },
      {
        id: cryptoId(),
        author: "Maria Delacruz",
        content: "Does anyone have notes from yesterday's lecture on binary trees? I missed the last 20 minutes.",
        tag: "Data Structures and Algorithms",
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
        image: null,
      },
      {
        id: cryptoId(),
        author: "Prof. Reyes",
        content: "<strong>Notice:</strong> Class is moved to Room 402 for next week due to maintenance in our usual room.",
        tag: "Networking II",
        timestamp: Date.now() - 1000 * 60 * 60 * 30,
        image: null,
      },
    ]);
  }

  function createPost(content, imageData) {
    const user = getCurrentUser();
    const posts = getPosts();
    const post = {
      id: cryptoId(),
      author: user ? user.name : "Student",
      content: content.trim(),
      tag: null,
      timestamp: Date.now(),
      image: imageData || null,
    };
    posts.unshift(post);
    savePosts(posts);
    return post;
  }

  function updatePost(id, content) {
    const posts = getPosts();
    const idx = posts.findIndex(function (p) { return p.id === id; });
    if (idx === -1) return null;
    posts[idx].content = content.trim();
    savePosts(posts);
    return posts[idx];
  }

  function deletePost(id) {
    savePosts(getPosts().filter(function (p) { return p.id !== id; }));
  }

  function canDeletePost(postId) {
    var user = getCurrentUser();
    if (!user) return false;
    if (isAdmin()) return true;
    var posts = getPosts();
    var found = posts.find(function (p) { return p.id === postId; });
    if (!found) return false;
    return found.author === user.name;
  }

  function canEditPost(postId) {
    var user = getCurrentUser();
    if (!user) return false;
    var posts = getPosts();
    var found = posts.find(function (p) { return p.id === postId; });
    if (!found) return false;
    return found.author === user.name;
  }

  function getPostAcknowledgmentKey(postId) {
    return userKey(KEYS.POST_ACKNOWLEDGMENTS) + "_" + postId;
  }

  function getPostAcknowledgments(postId) {
    return getData(getPostAcknowledgmentKey(postId), []);
  }

  function savePostAcknowledgments(postId, data) {
    setData(getPostAcknowledgmentKey(postId), data);
  }

  function toggleAcknowledgePost(postId) {
    var user = getCurrentUser();
    if (!user) return false;
    var acks = getPostAcknowledgments(postId);
    var idx = acks.findIndex(function (a) {
      return a.email.toLowerCase() === user.email.toLowerCase();
    });
    if (idx === -1) {
      acks.push({ name: user.name, email: user.email, timestamp: Date.now() });
      savePostAcknowledgments(postId, acks);
      return true;
    } else {
      acks.splice(idx, 1);
      savePostAcknowledgments(postId, acks);
      return false;
    }
  }

  function hasAcknowledgedPost(postId) {
    var user = getCurrentUser();
    if (!user) return false;
    var acks = getPostAcknowledgments(postId);
    return acks.some(function (a) {
      return a.email.toLowerCase() === user.email.toLowerCase();
    });
  }

  function loadPosts(searchQuery) {
    const feed = document.getElementById("posts-feed");
    if (!feed) return;
    var posts = getPosts();

    if (searchQuery && searchQuery.trim() !== "") {
      var q = searchQuery.trim().toLowerCase();
      posts = posts.filter(function (p) {
        var matchAuthor = p.author && p.author.toLowerCase().indexOf(q) !== -1;
        var matchContent = p.content && p.content.toLowerCase().indexOf(q) !== -1;
        var matchTag = p.tag && p.tag.toLowerCase().indexOf(q) !== -1;
        var matchDate = timeAgo(p.timestamp).toLowerCase().indexOf(q) !== -1;
        return matchAuthor || matchContent || matchTag || matchDate;
      });
    }

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

    posts.forEach(function (post) {
      const card = document.createElement("div");
      card.className = "post-card";
      var imgHtml = post.image ? '<div class="post-image-wrap"><img src="' + post.image + '" alt="Post image" loading="lazy"></div>' : "";
      var tagHtml = post.tag ? '<div class="post-tag-wrap"><span class="post-tag"><i class="fas fa-tag"></i> ' + escapeHtml(post.tag) + '</span></div>' : "";

      var canDel = canDeletePost(post.id);
      var canEdt = canEditPost(post.id);
      var hasAck = hasAcknowledgedPost(post.id);
      var acks = getPostAcknowledgments(post.id);
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

      card.innerHTML =
        tagHtml +
        '<div class="post-header">' +
          '<div class="avatar-circle post-avatar" style="background:' + stringToColor(post.author) + '">' +
            escapeHtml(initials(post.author)) +
          '</div>' +
          '<div class="post-author-info">' +
            '<span class="post-author-name">' + escapeHtml(post.author) + '</span>' +
            '<span class="post-timestamp"><i class="fas fa-clock"></i> ' + timeAgo(post.timestamp) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="post-content">' + post.content + imgHtml + '</div>' +
        actionsHtml;
      feed.appendChild(card);
    });

    feed.querySelectorAll(".btn-delete-post").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showConfirm("Delete this post?", function () {
          deletePost(btn.getAttribute("data-id"));
          loadPosts(document.getElementById("dashboard-search-input") ? document.getElementById("dashboard-search-input").value : "");
          showToast("Post deleted.", "info");
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
        toggleAcknowledgePost(postId);
        loadPosts(document.getElementById("dashboard-search-input") ? document.getElementById("dashboard-search-input").value : "");
      });
    });

    feed.querySelectorAll(".acknowledge-count").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var postId = btn.getAttribute("data-id");
        showAcknowledgmentsPopup(postId);
      });
    });
  }

  function showAcknowledgmentsPopup(postId) {
    var acks = getPostAcknowledgments(postId);
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
  }

  function openEditPostModal(postId) {
    var posts = getPosts();
    var found = posts.find(function (p) { return p.id === postId; });
    if (!found) { showToast("Post not found.", "error"); return; }
    var editor = document.getElementById("edit-post-content-editable");
    var idField = document.getElementById("edit-post-id");
    if (editor) editor.innerHTML = found.content;
    if (idField) idField.value = postId;
    openModal("edit-post-modal-overlay");
    setTimeout(function () { if (editor) editor.focus(); }, 300);
  }

  /* ===== SUBJECTS ===== */
  function getSubjects() { return getData(userKey(KEYS.SUBJECTS), []); }
  function saveSubjects(subjects) { setData(userKey(KEYS.SUBJECTS), subjects); }

  var SUBJECT_COLORS = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

  function addSubject(name, professor, schedule) {
    const subjects = getSubjects();
    const subject = {
      id: cryptoId(),
      name: name.trim(),
      professor: professor.trim(),
      schedule: schedule.trim(),
      tasks: [],
      color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length],
    };
    subjects.push(subject);
    saveSubjects(subjects);
    return subject;
  }

  function updateSubject(id, data) {
    const subjects = getSubjects();
    const idx = subjects.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return null;
    subjects[idx] = Object.assign({}, subjects[idx], data);
    saveSubjects(subjects);
    return subjects[idx];
  }

  function deleteSubject(id) {
    saveSubjects(getSubjects().filter(function (s) { return s.id !== id; }));
  }

  function addSubjectTask(subjectId, text) {
    const subjects = getSubjects();
    const idx = subjects.findIndex(function (s) { return s.id === subjectId; });
    if (idx === -1) return null;
    if (!subjects[idx].tasks) subjects[idx].tasks = [];
    const task = { id: cryptoId(), text: text.trim(), completed: false };
    subjects[idx].tasks.push(task);
    saveSubjects(subjects);
    return task;
  }

  function toggleSubjectTask(subjectId, taskId) {
    const subjects = getSubjects();
    const idx = subjects.findIndex(function (s) { return s.id === subjectId; });
    if (idx === -1) return;
    const tIdx = (subjects[idx].tasks || []).findIndex(function (t) { return t.id === taskId; });
    if (tIdx === -1) return;
    subjects[idx].tasks[tIdx].completed = !subjects[idx].tasks[tIdx].completed;
    saveSubjects(subjects);
  }

  function deleteSubjectTask(subjectId, taskId) {
    const subjects = getSubjects();
    const idx = subjects.findIndex(function (s) { return s.id === subjectId; });
    if (idx === -1) return;
    subjects[idx].tasks = (subjects[idx].tasks || []).filter(function (t) { return t.id !== taskId; });
    saveSubjects(subjects);
  }

  function loadSubjects() {
    const list = document.getElementById("subjects-list");
    if (!list) return;
    const subjects = getSubjects();
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
    subjects.forEach(function (subject) {
      const card = document.createElement("div");
      card.className = "subject-card";
      card.style.borderLeftColor = subject.color || "#2563EB";
      const tasks = subject.tasks || [];
      const done = tasks.filter(function (t) { return t.completed; }).length;
      const total = tasks.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
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
    });
    list.querySelectorAll(".btn-edit-subject").forEach(function (btn) {
      btn.addEventListener("click", function () { editSubject(btn.getAttribute("data-id")); });
    });
    list.querySelectorAll(".btn-delete-subject").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showConfirm("Delete this subject and all its tasks?", function () {
          deleteSubject(btn.getAttribute("data-id"));
          loadSubjects();
          showToast("Subject deleted.", "info");
        });
      });
    });
    list.querySelectorAll(".task-checkbox").forEach(function (cb) {
      cb.addEventListener("change", function () {
        toggleSubjectTask(cb.getAttribute("data-subject-id"), cb.getAttribute("data-task-id"));
        loadSubjects();
      });
    });
    list.querySelectorAll(".btn-task-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showConfirm("Delete this task?", function () {
          deleteSubjectTask(btn.getAttribute("data-subject-id"), btn.getAttribute("data-task-id"));
          loadSubjects();
          showToast("Task deleted.", "info");
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
  }

  function editSubject(id) {
    const subject = getSubjects().find(function (s) { return s.id === id; });
    if (!subject) return;
    document.getElementById("subject-edit-id").value = id;
    document.getElementById("subject-name").value = subject.name;
    document.getElementById("subject-professor").value = subject.professor || "";
    document.getElementById("subject-schedule").value = subject.schedule || "";
    document.getElementById("subject-modal-title").textContent = "Edit Subject";
    openModal("subject-modal-overlay");
  }

  /* ===== SCHEDULE ===== */
  function getSchedule() { return getData(userKey(KEYS.SCHEDULE), []); }
  function saveSchedule(schedule) { setData(userKey(KEYS.SCHEDULE), schedule); }

  function addScheduleItem(subject, day, startTime, endTime, room) {
    const schedule = getSchedule();
    const item = {
      id: cryptoId(),
      subject: subject.trim(),
      day: day.trim(),
      startTime: startTime,
      endTime: endTime,
      room: room.trim(),
    };
    schedule.push(item);
    saveSchedule(schedule);
    return item;
  }

  function updateScheduleItem(id, data) {
    const schedule = getSchedule();
    const idx = schedule.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return null;
    schedule[idx] = Object.assign({}, schedule[idx], data);
    saveSchedule(schedule);
    return schedule[idx];
  }

  function deleteScheduleItem(id) {
    saveSchedule(getSchedule().filter(function (s) { return s.id !== id; }));
  }

  function loadSchedule() {
    const list = document.getElementById("schedule-list");
    if (!list) return;
    const schedule = getSchedule();
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
    const sorted = schedule.slice().sort(function (a, b) {
      var da = a.day ? a.day.substring(0, 3) : "";
      var db = b.day ? b.day.substring(0, 3) : "";
      var od = (dayOrder[da] !== undefined ? dayOrder[da] : 99) - (dayOrder[db] !== undefined ? dayOrder[db] : 99);
      return od !== 0 ? od : (a.startTime || "").localeCompare(b.startTime || "");
    });
    const badgeColors = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];
    sorted.forEach(function (item) {
      const card = document.createElement("div");
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
            formatTime12h(item.startTime) + ' &ndash; ' + formatTime12h(item.endTime) +
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
          deleteScheduleItem(btn.getAttribute("data-id"));
          loadSchedule();
          showToast("Schedule entry deleted.", "info");
        });
      });
    });
  }

  function editScheduleItem(id) {
    const item = getSchedule().find(function (s) { return s.id === id; });
    if (!item) return;
    document.getElementById("schedule-edit-id").value = id;
    document.getElementById("schedule-subject").value = item.subject;
    document.getElementById("schedule-day").value = item.day || "";
    document.getElementById("schedule-start-time").value = item.startTime || "";
    document.getElementById("schedule-end-time").value = item.endTime || "";
    document.getElementById("schedule-room").value = item.room || "";
    document.getElementById("schedule-modal-title").textContent = "Edit Schedule";
    openModal("schedule-modal-overlay");
  }

  /* ===== ASSIGNMENTS ===== */
  function getAssignments() { return getData(userKey(KEYS.ASSIGNMENTS), []); }
  function saveAssignments(assignments) { setData(userKey(KEYS.ASSIGNMENTS), assignments); }

  function addAssignment(text, subject, dueDate) {
    const assignments = getAssignments();
    const item = {
      id: cryptoId(),
      text: text.trim(),
      subject: subject.trim(),
      dueDate: dueDate || "",
      completed: false,
      createdAt: Date.now(),
    };
    assignments.unshift(item);
    saveAssignments(assignments);
    return item;
  }

  function toggleAssignment(id) {
    const assignments = getAssignments();
    const idx = assignments.findIndex(function (a) { return a.id === id; });
    if (idx === -1) return;
    assignments[idx].completed = !assignments[idx].completed;
    saveAssignments(assignments);
  }

  function deleteAssignment(id) {
    saveAssignments(getAssignments().filter(function (a) { return a.id !== id; }));
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

  function loadAssignments() {
    const list = document.getElementById("assignments-list");
    if (!list) return;
    const assignments = getAssignments();
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
    const sorted = assignments.slice().sort(function (a, b) {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return 0;
    });
    sorted.forEach(function (item) {
      const div = document.createElement("div");
      div.className = "assignment-item" + (item.completed ? " assignment-done" : "");
      var dueCls = "";
      var dueLabel = "Due";
      if (item.dueDate && !item.completed) {
        if (isOverdue(item.dueDate)) { dueCls = "due-overdue"; dueLabel = "Overdue"; }
        else if (isDueSoon(item.dueDate)) { dueCls = "due-soon"; }
      }
      var dueHtml = item.dueDate
        ? '<span class="assignment-due ' + dueCls + '"><i class="fas fa-calendar-day"></i> ' + dueLabel + ': ' + escapeHtml(item.dueDate) + '</span>'
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
        toggleAssignment(cb.getAttribute("data-id"));
        loadAssignments();
      });
    });
    list.querySelectorAll(".btn-assignment-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showConfirm("Delete this task?", function () {
          deleteAssignment(btn.getAttribute("data-id"));
          loadAssignments();
          showToast("Task deleted.", "info");
        });
      });
    });
  }

  /* ===== GRADES (FIXED RE-STRUCTURED NO OVERLAP LAYOUT) ===== */
  function getGrades() { return getData(userKey(KEYS.GRADES), []); }
  function saveGrades(grades) { setData(userKey(KEYS.GRADES), grades); }

  function seedDemoGrades() {
    if (getGrades().length > 0) return;
    saveGrades([
      {
        id: cryptoId(),
        subject: "Web Systems and Technologies",
        grade: 1.25,
        units: 3,
        year: "3rd Year",
        semester: "1st Semester",
        exclude: false,
      },
      {
        id: cryptoId(),
        subject: "Data Structures & Algorithms",
        grade: 1.50,
        units: 3,
        year: "3rd Year",
        semester: "1st Semester",
        exclude: false,
      },
      {
        id: cryptoId(),
        subject: "PE 3 - Physical Fitness",
        grade: 1.00,
        units: 2,
        year: "3rd Year",
        semester: "1st Semester",
        exclude: true,
      },
      {
        id: cryptoId(),
        subject: "Database Management Systems",
        grade: 1.75,
        units: 3,
        year: "3rd Year",
        semester: "1st Semester",
        exclude: false,
      },
    ]);
  }

  function addGrade(subject, gradeValue, units, year, semester, exclude) {
    const grades = getGrades();
    const item = {
      id: cryptoId(),
      subject: subject.trim(),
      grade: parseFloat(gradeValue),
      units: parseFloat(units) || 3,
      year: year || "1st Year",
      semester: semester || "1st Semester",
      exclude: !!exclude,
    };
    grades.push(item);
    saveGrades(grades);
    return item;
  }

  function updateGrade(id, data) {
    const grades = getGrades();
    const idx = grades.findIndex(function (g) { return g.id === id; });
    if (idx === -1) return null;
    grades[idx] = Object.assign({}, grades[idx], data);
    saveGrades(grades);
    return grades[idx];
  }

  function deleteGrade(id) {
    saveGrades(getGrades().filter(function (g) { return g.id !== id; }));
  }

  function toggleGradeExclude(id) {
    const grades = getGrades();
    const idx = grades.findIndex(function (g) { return g.id === id; });
    if (idx === -1) return;
    grades[idx].exclude = !grades[idx].exclude;
    saveGrades(grades);
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
    const eligible = grades.filter(function (g) {
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

  function loadGrades() {
    const list = document.getElementById("grades-list");
    const gwaDisplay = document.getElementById("gwa-value");
    if (!list) return;
    const yearEl = document.getElementById("grade-year-filter");
    const semEl = document.getElementById("grade-semester-filter");
    const year = yearEl ? yearEl.value : "all";
    const semester = semEl ? semEl.value : "all";
    const grades = getGrades();

    const filtered = grades.filter(function (g) {
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

    /* RE-STRUCTURED CLEAN VERTICAL BLOCK LAYOUT FOR GRADES */
    filtered.forEach(function (item) {
      const div = document.createElement("div");
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

    list.querySelectorAll(".btn-toggle-exclude").forEach(function (btn) {
      btn.addEventListener("click", function () {
        toggleGradeExclude(btn.getAttribute("data-id"));
        loadGrades();
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
          deleteGrade(btn.getAttribute("data-id"));
          loadGrades();
          showToast("Grade deleted.", "info");
        });
      });
    });

    const gwa = calculateGWA(grades, year, semester);
    if (gwaDisplay) {
      gwaDisplay.textContent = gwa > 0 ? gwa.toFixed(4).replace(/00$/, '') : "0.00";
      gwaDisplay.style.color = gwa > 0 ? gradeColor(gwa) : "";
    }
  }

  function editGradeItem(id) {
    const item = getGrades().find(function (g) { return g.id === id; });
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
  }

  /* ===== CLASSMATES & CLASSMATE PROFILE VIEW ===== */
  function getClassmates() { return getData(KEYS.CLASSMATES, []); }
  function saveClassmates(classmates) { setData(KEYS.CLASSMATES, classmates); }

  function seedDemoClassmates() {
    if (getClassmates().length > 0) return;
    saveClassmates(DEMO_CLASSMATES);
  }

  function getSectionClassmates() {
    var userProf = getProfile();
    var currentUser = getCurrentUser();
    var mySection = userProf.section ? normalizeSection(userProf.section) : "BSIT 3-A";

    var result = [];

    // 1. Registered users matching section
    var users = getUsers();
    var profileAll = getData(KEYS.PROFILE + "_all", {});
    users.forEach(function (u) {
      if (currentUser && u.email.toLowerCase() === currentUser.email.toLowerCase()) return;
      var prof = profileAll[u.email.toLowerCase()] || {};
      var uSec = prof.section ? normalizeSection(prof.section) : "BSIT 3-A";
      if (uSec === mySection || mySection === "ALL") {
        result.push({
          id: u.id || cryptoId(),
          name: prof.name || u.name,
          email: u.email,
          course: prof.course || "BSIT",
          year: prof.year || "3rd Year",
          section: uSec,
          bio: prof.bio || "Classmate in " + uSec,
          studentId: prof.studentId || "2023-CTU-" + Math.floor(1000 + Math.random() * 9000),
          contact: prof.contact || "0912-345-6789",
          photo: prof.photo || null
        });
      }
    });

    // 2. Demo classmates matching section
    var demo = getClassmates();
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

  function loadClassmates() {
    const list = document.getElementById("classmates-list");
    const mySectionBadge = document.getElementById("my-section-display");
    if (!list) return;

    var userProf = getProfile();
    var mySec = userProf.section ? normalizeSection(userProf.section) : "BSIT 3-A";
    if (mySectionBadge) {
      mySectionBadge.textContent = "Your Section: " + mySec;
    }

    const classmates = getSectionClassmates();
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
      const card = document.createElement("div");
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
  }

  /* ===== FAQS ===== */
  function loadFaqs() {
    const list = document.getElementById("faqs-list");
    if (!list) return;
    list.innerHTML = "";
    DEMO_FAQS.forEach(function (faq) {
      const div = document.createElement("div");
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

  /* ===== CURRICULUM WITH SEMESTER SELECTOR ===== */
  function getCurriculumSubjects() {
    return getData(userKey(KEYS.CURRICULUM_SUBJECTS), []);
  }
  function saveCurriculumSubjects(subjects) {
    setData(userKey(KEYS.CURRICULUM_SUBJECTS), subjects);
  }

  function getCurriculumPDF() {
    return getData(userKey(KEYS.CURRICULUM_PDF), null);
  }
  function saveCurriculumPDF(data) {
    setData(userKey(KEYS.CURRICULUM_PDF), data);
  }
  function removeCurriculumPDF() {
    localStorage.removeItem(userKey(KEYS.CURRICULUM_PDF));
  }

  function getCORPDF() {
    return getData(userKey(KEYS.COR_PDF), null);
  }
  function saveCORPDF(data) {
    setData(userKey(KEYS.COR_PDF), data);
  }
  function removeCORPDF() {
    localStorage.removeItem(userKey(KEYS.COR_PDF));
  }

  function downloadPDF(pdfData, defaultName) {
    var a = document.createElement("a");
    a.href = pdfData.data;
    a.download = pdfData.name || defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function seedDemoCurriculum() {
    if (getCurriculumSubjects().length > 0) return;
    saveCurriculumSubjects([
      {
        id: cryptoId(),
        code: "IT 301",
        name: "Web Systems and Technologies",
        schedule: "MWF 10:00-11:30 AM",
        year: "3rd Year",
        semester: "1st Semester"
      },
      {
        id: cryptoId(),
        code: "IT 302",
        name: "Database Management Systems II",
        schedule: "TTH 1:00-2:30 PM",
        year: "3rd Year",
        semester: "1st Semester"
      },
      {
        id: cryptoId(),
        code: "IT 303",
        name: "Mobile Application Development",
        schedule: "MWF 2:30-4:00 PM",
        year: "3rd Year",
        semester: "2nd Semester"
      },
      {
        id: cryptoId(),
        code: "IT 201",
        name: "Data Structures & Algorithms",
        schedule: "MWF 1:00-2:30 PM",
        year: "2nd Year",
        semester: "1st Semester"
      },
      {
        id: cryptoId(),
        code: "IT 101",
        name: "Introduction to Computing",
        schedule: "MWF 8:30-10:00 AM",
        year: "1st Year",
        semester: "1st Semester"
      },
    ]);
  }

  function addCurriculumSubject(name, code, schedule, year, semester) {
    const subjects = getCurriculumSubjects();
    const item = {
      id: cryptoId(),
      name: name.trim(),
      code: code.trim(),
      schedule: schedule.trim(),
      year: year.trim(),
      semester: (semester || "1st Semester").trim(),
    };
    subjects.push(item);
    saveCurriculumSubjects(subjects);
    return item;
  }

  function updateCurriculumSubject(id, data) {
    const subjects = getCurriculumSubjects();
    const idx = subjects.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return null;
    subjects[idx] = Object.assign({}, subjects[idx], data);
    saveCurriculumSubjects(subjects);
    return subjects[idx];
  }

  function deleteCurriculumSubject(id) {
    saveCurriculumSubjects(getCurriculumSubjects().filter(function (s) { return s.id !== id; }));
  }

  function loadCurriculum() {
    var list = document.getElementById("curriculum-subjects-list");
    var pdfSection = document.getElementById("curriculum-pdf-section");
    if (!list) return;

    // Load PDF section
    if (pdfSection) {
      var pdfData = getCurriculumPDF();
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
              removeCurriculumPDF();
              loadCurriculum();
              showToast("PDF removed.", "info");
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
              saveCurriculumPDF({ name: file.name, data: base64 });
              loadCurriculum();
              showToast("Curriculum PDF uploaded successfully.", "success");
              fileInput.value = "";
            };
            reader.readAsDataURL(file);
          });
        }
      }
    }

    // Load COR (Certificate of Registration) section
    var corSection = document.getElementById("cor-pdf-section");
    if (corSection) {
      var corData = getCORPDF();
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
              removeCORPDF();
              loadCurriculum();
              showToast("Certificate of Registration removed.", "info");
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
              saveCORPDF({ name: file.name, data: base64 });
              loadCurriculum();
              showToast("Certificate of Registration uploaded successfully.", "success");
              corFileInput.value = "";
            };
            reader.readAsDataURL(file);
          });
        }
      }
    }

    // Load subjects with filters
    var subjects = getCurriculumSubjects();
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
          deleteCurriculumSubject(btn.getAttribute("data-id"));
          loadCurriculum();
          showToast("Subject deleted.", "info");
        });
      });
    });
  }

  function editCurriculumSubject(id) {
    var subjects = getCurriculumSubjects();
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
  }

  function setupCurriculumFilters() {
    var filters = document.querySelectorAll(".curriculum-year-filter");
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filters.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        loadCurriculum();
      });
    });

    var semFilterSelect = document.getElementById("curriculum-semester-filter");
    if (semFilterSelect) {
      semFilterSelect.addEventListener("change", function () {
        loadCurriculum();
      });
    }
  }

  /* ===== SETTINGS ===== */
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

  /* ===== UI HELPERS ===== */
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

  /* ===== LOAD DASHBOARD ===== */
  function loadDashboard() {
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
    seedDemoPosts();
    seedDemoGrades();
    seedDemoClassmates();
    seedDemoCurriculum();
    loadProfileForm();
    loadPosts();
    loadSubjects();
    loadSchedule();
    loadAssignments();
    loadGrades();
    loadClassmates();
    loadFaqs();
    loadSettings();
    switchView("view-home");
  }

  /* ===== PROFILE FORM ===== */
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

  /* ===== POST TOOLBAR ===== */
  var currentPostImage = null;

  function setupPostToolbar() {
    var editor = document.getElementById("post-content-editable");
    if (!editor) return;
    document.querySelectorAll(".toolbar-btn[data-command]").forEach(function (btn) {
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
      imageInput.addEventListener("change", function () {
        var file = imageInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          showToast("Image must be smaller than 5 MB.", "error");
          imageInput.value = "";
          return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
          currentPostImage = e.target.result;
          var preview = document.getElementById("post-image-preview");
          var img = document.getElementById("post-preview-img");
          if (preview && img) { img.src = currentPostImage; preview.hidden = false; }
          imageInput.value = "";
        };
        reader.readAsDataURL(file);
      });
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

  function exportData() {
    var user = getCurrentUser();
    var data = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      exportedBy: user ? user.email : "unknown",
      posts: getPosts(),
      subjects: getSubjects(),
      schedule: getSchedule(),
      assignments: getAssignments(),
      grades: getGrades(),
      profile: getProfile(),
      settings: getSettings(),
      classmates: getClassmates(),
      curriculumSubjects: getCurriculumSubjects(),
      curriculumPDF: getCurriculumPDF(),
      corPDF: getCORPDF(),
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
    showToast("Data exported successfully.", "success");
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.version) { showToast("Invalid backup file.", "error"); return; }
        showConfirm("This will replace all your current data. Continue?", function () {
          if (data.posts) savePosts(data.posts);
          if (data.subjects) saveSubjects(data.subjects);
          if (data.schedule) saveSchedule(data.schedule);
          if (data.assignments) saveAssignments(data.assignments);
          if (data.grades) saveGrades(data.grades);
          if (data.profile) saveProfile(data.profile);
          if (data.settings) saveSettings(data.settings);
          if (data.classmates) saveClassmates(data.classmates);
          if (data.curriculumSubjects) saveCurriculumSubjects(data.curriculumSubjects);
          if (data.curriculumPDF) saveCurriculumPDF(data.curriculumPDF);
          if (data.corPDF) saveCORPDF(data.corPDF);
          showToast("Data imported. Reloading...", "success");
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
          var scope = "_" + user.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
          Object.keys(localStorage).forEach(function (key) {
            if (key.indexOf(scope) !== -1) localStorage.removeItem(key);
          });
          localStorage.removeItem(KEYS.POSTS);
          localStorage.removeItem(KEYS.SUBJECTS);
          localStorage.removeItem(KEYS.SCHEDULE);
          localStorage.removeItem(KEYS.ASSIGNMENTS);
          localStorage.removeItem(KEYS.GRADES);
        }
        showToast("All data cleared. Reloading...", "info");
        setTimeout(function () { location.reload(); }, 1500);
      });
    });
  }

  function changePassword(currentPwd, newPwd, confirmPwd) {
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
    var users = getUsers();
    var idx = users.findIndex(function (u) {
      return u.email.toLowerCase() === user.email.toLowerCase();
    });
    if (idx === -1) return { success: false, message: "User account not found." };
    if (users[idx].password !== currentPwd) {
      return { success: false, message: "Current password is incorrect." };
    }
    users[idx].password = newPwd;
    saveUsers(users);
    return { success: true, message: "Password updated successfully." };
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
      var isLandscape = window.innerWidth > window.innerHeight;
      lock.hidden = !isLandscape;
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

  /* ===== EVENT LISTENERS ===== */
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
          var result = await login(email, password);
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
        var confirm = confirmInput ? confirmInput.value || "" : "";
        if (name.length < 2) { showError("signup-error", "Please enter your full name."); return; }
        if (!isValidEmail(email)) { showError("signup-error", "Please enter a valid email address."); return; }
        if (password.length < 6) { showError("signup-error", "Password must be at least 6 characters."); return; }
        if (password !== confirm) { showError("signup-error", "Passwords do not match."); return; }
        var btn = document.getElementById("signup-submit-btn");
        setButtonLoading(btn, true);
        try {
          var result = await signup(name, email, password);
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

    /* SEARCH INPUT LISTENER FOR DASHBOARD */
    var dashboardSearchInput = document.getElementById("dashboard-search-input");
    if (dashboardSearchInput) {
      dashboardSearchInput.addEventListener("input", function (e) {
        loadPosts(e.target.value);
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
        var resetPromise = Promise.resolve(null);
        if (isSupabaseReady() && client.auth && typeof client.auth.resetPasswordForEmail === "function") {
          console.log("[ClassConnect] Sending Supabase password reset email.");
          resetPromise = withTimeout(
            client.auth.resetPasswordForEmail(email, { redirectTo: window.location.href }),
            8000,
            "Supabase password reset"
          );
        } else {
          console.warn("[ClassConnect] Supabase unavailable; using local password-reset fallback.");
        }
        resetPromise.then(function (response) {
          setButtonLoading(btn, false);
          if (response && response.error) {
            console.error("[ClassConnect] Supabase password reset failed:", response.error);
            if (!isTransientSupabaseError(response.error)) {
              showError("forgot-error", response.error.message || "Unable to send reset instructions.");
              return;
            }
          }
          if (!response) {
            var users = getUsers();
            var exists = users.some(function (u) {
              return u.email && u.email.toLowerCase() === email.toLowerCase();
            });
            if (!exists) {
              showError("forgot-error", "No account found with this email address.");
              return;
            }
          }
          if (successEl) {
            successEl.textContent = "Password reset instructions have been sent to " + email + ".";
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
        createPost(content, currentPostImage);
        closeModal("post-modal-overlay");
        clearPostContent();
        loadPosts(dashboardSearchInput ? dashboardSearchInput.value : "");
        switchView("view-home");
        showToast("Post shared successfully.", "success");
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
        var result = updatePost(id, content);
        if (result) {
          closeModal("edit-post-modal-overlay");
          loadPosts(dashboardSearchInput ? dashboardSearchInput.value : "");
          showToast("Post updated successfully.", "success");
        } else {
          showToast("Failed to update post.", "error");
        }
      });
    }

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
        if (id) { updateSubject(id, { name: name, professor: professor, schedule: schedule }); showToast("Subject updated.", "success"); }
        else { addSubject(name, professor, schedule); showToast("Subject added.", "success"); }
        closeModal("subject-modal-overlay");
        subjectForm.reset();
        loadSubjects();
      });
    }

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
        addSubjectTask(subjectId, text);
        closeModal("subject-task-modal-overlay");
        subjectTaskForm.reset();
        loadSubjects();
        showToast("Task added.", "success");
      });
    }

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
        if (id) { updateScheduleItem(id, { subject: subject, day: day, startTime: startTime, endTime: endTime, room: room }); showToast("Schedule updated.", "success"); }
        else { addScheduleItem(subject, day, startTime, endTime, room); showToast("Schedule added.", "success"); }
        closeModal("schedule-modal-overlay");
        scheduleForm.reset();
        loadSchedule();
      });
    }

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
        addAssignment(text, subject, due);
        closeModal("assignment-modal-overlay");
        assignmentForm.reset();
        loadAssignments();
        showToast("Assignment added.", "success");
      });
    }

    /* GRADES EVENT LISTENERS */
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
          updateGrade(id, { subject: subject, grade: gradeVal, units: unitsVal, year: year, semester: semester, exclude: exclude });
          showToast("Grade updated.", "success");
        } else {
          addGrade(subject, gradeVal, unitsVal, year, semester, exclude);
          showToast("Grade added to " + year + ", " + semester + ".", "success");
        }
        closeModal("grade-modal-overlay");
        gradeForm.reset();
        loadGrades();
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

    var profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", function (e) {
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
        saveProfile(data);
        loadDashboard();
        showToast("Profile saved successfully.", "success");
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
          saveProfilePhoto(e.target.result);
          loadProfileForm();
          showToast("Profile photo updated.", "success");
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
      changePwdBtn.addEventListener("click", function () {
        var current = document.getElementById("settings-current-password").value;
        var newPwd = document.getElementById("settings-new-password").value;
        var confirm = document.getElementById("settings-confirm-password").value;
        var result = changePassword(current, newPwd, confirm);
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
          updateCurriculumSubject(id, { name: name, code: code, schedule: schedule, year: year, semester: semester });
          showToast("Subject updated.", "success");
        } else {
          addCurriculumSubject(name, code, schedule, year, semester);
          showToast("Subject added to " + year + ", " + semester + ".", "success");
        }
        closeModal("curriculum-subject-modal-overlay");
        curriculumForm.reset();
        loadCurriculum();
      });
    }

    var uploadPdfBtn = document.getElementById("upload-curriculum-pdf-btn");
    if (uploadPdfBtn) {
      uploadPdfBtn.addEventListener("click", function () {
        var fileInput = document.getElementById("pdf-file-input");
        if (fileInput) fileInput.click();
      });
    }
  }

  /* ===== INIT ===== */
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
        var remoteUser = saveRemoteUserSession(remote.session.user);
        if (remoteUser) {
          showPage("dashboard-page");
          loadDashboard();
          return;
        }
      }

      if (isLoggedIn()) {
        console.log("[ClassConnect] Restoring local session.");
        showPage("dashboard-page");
        loadDashboard();
      } else {
        console.log("[ClassConnect] No active session; login page is ready.");
        showLoginFallback(remote.error ? "Supabase session unavailable" : "no active session");
      }
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

    /*
     * Render the splash and schedule its exit before optional setup work.
     * If a non-critical feature throws, the auth route still runs.
     */
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
      seedDemoClassmates();
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
    // Handles scripts loaded with async/defer or inserted after DOMContentLoaded.
    init();
  }

})();
