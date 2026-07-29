/* =========================================================
   ClassConnect — script.js
   Auth, UI, Posts, PWA — localStorage only, no backend
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     STORAGE KEYS
  --------------------------------------------------------- */
  const KEYS = {
    USERS: "cc_users",
    SESSION: "cc_session",
    POSTS: "cc_posts",
  };

  /* ---------------------------------------------------------
     DEMO DATA
  --------------------------------------------------------- */
  const DEMO_CLASSES = [
    { name: "Data Structures & Algorithms", section: "BSIT 3-A", icon: "fa-code", color: "#2563EB" },
    { name: "Web Systems and Technologies", section: "BSIT 3-A", icon: "fa-globe", color: "#8B5CF6" },
    { name: "Networking II", section: "BSIT 3-B", icon: "fa-network-wired", color: "#10B981" },
    { name: "Technopreneurship", section: "BSIT 3-A", icon: "fa-lightbulb", color: "#F59E0B" },
  ];

  function seedDemoPosts() {
    const existing = getPosts();
    if (existing.length > 0) return;
    const seed = [
      {
        id: cryptoId(),
        author: "Prof. Santos",
        content: "Reminder: Project proposals are due this Friday, 11:59 PM. Submit through the class portal.",
        tag: "Web Systems and Technologies",
        timestamp: Date.now() - 1000 * 60 * 60 * 3,
      },
      {
        id: cryptoId(),
        author: "Maria Delacruz",
        content: "Does anyone have notes from yesterday's lecture on binary trees? I missed the last 20 minutes.",
        tag: "Data Structures & Algorithms",
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
      },
      {
        id: cryptoId(),
        author: "Prof. Reyes",
        content: "Class is moved to Room 402 for next week due to maintenance in our usual room.",
        tag: "Networking II",
        timestamp: Date.now() - 1000 * 60 * 60 * 30,
      },
    ];
    localStorage.setItem(KEYS.POSTS, JSON.stringify(seed));
  }

  function cryptoId() {
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  }

  /* ---------------------------------------------------------
     AUTH FUNCTIONS
  --------------------------------------------------------- */
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USERS)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  function signup(name, email, password) {
    const users = getUsers();
    const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { success: false, message: "An account with this email already exists." };
    }
    const newUser = { name: name.trim(), email: email.trim(), password };
    users.push(newUser);
    saveUsers(users);
    setSession(newUser);
    return { success: true };
  }

  function login(email, password) {
    const users = getUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) {
      return { success: false, message: "Invalid email or password." };
    }
    setSession(user);
    return { success: true };
  }

  function setSession(user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify({ name: user.name, email: user.email }));
  }

  function logout() {
    localStorage.removeItem(KEYS.SESSION);
    showPage("login-page");
    showLoginForm();
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.SESSION));
    } catch (e) {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  /* ---------------------------------------------------------
     POSTS FUNCTIONS
  --------------------------------------------------------- */
  function getPosts() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.POSTS)) || [];
    } catch (e) {
      return [];
    }
  }

  function createPost(content) {
    const user = getCurrentUser();
    const posts = getPosts();
    const post = {
      id: cryptoId(),
      author: user ? user.name : "Student",
      content: content.trim(),
      tag: null,
      timestamp: Date.now(),
    };
    posts.unshift(post);
    localStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
    return post;
  }

  function deletePost(id) {
    let posts = getPosts();
    posts = posts.filter((p) => p.id !== id);
    localStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
  }

  function loadPosts() {
    const feed = document.getElementById("posts-feed");
    const posts = getPosts();
    feed.innerHTML = "";

    if (posts.length === 0) {
      feed.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No posts yet. Be the first to share something!</p>
        </div>`;
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "post-card";
      card.innerHTML = `
        ${post.tag ? `<span class="post-tag">${escapeHtml(post.tag)}</span>` : ""}
        <div class="post-header">
          <div class="avatar-circle">${escapeHtml(initials(post.author))}</div>
          <div class="post-author-info">
            <span class="post-author-name">${escapeHtml(post.author)}</span>
            <span class="post-timestamp">${timeAgo(post.timestamp)}</span>
          </div>
        </div>
        <p class="post-content">${escapeHtml(post.content)}</p>
        <div class="post-footer">
          <button class="btn-delete-post" data-id="${post.id}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      `;
      feed.appendChild(card);
    });

    feed.querySelectorAll(".btn-delete-post").forEach((btn) => {
      btn.addEventListener("click", () => {
        deletePost(btn.getAttribute("data-id"));
        loadPosts();
      });
    });
  }

  function loadClasses() {
    const list = document.getElementById("classes-list");
    list.innerHTML = "";
    DEMO_CLASSES.forEach((cls) => {
      const card = document.createElement("div");
      card.className = "class-card";
      card.style.borderLeftColor = cls.color;
      card.innerHTML = `
        <div class="class-icon" style="background:${cls.color}">
          <i class="fas ${cls.icon}"></i>
        </div>
        <div class="class-info">
          <h4>${escapeHtml(cls.name)}</h4>
          <p>${escapeHtml(cls.section)}</p>
        </div>
      `;
      list.appendChild(card);
    });
  }

  /* ---------------------------------------------------------
     UI HELPERS
  --------------------------------------------------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function initials(name) {
    if (!name) return "S";
    const parts = name.trim().split(" ");
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }

  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function showPage(pageId) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active-page"));
    document.getElementById(pageId).classList.add("active-page");
  }

  function showLoginForm() {
    document.getElementById("signup-form").classList.remove("active-form");
    document.getElementById("login-form").classList.add("active-form");
    hideError("login-error");
  }

  function showSignupForm() {
    document.getElementById("login-form").classList.remove("active-form");
    document.getElementById("signup-form").classList.add("active-form");
    hideError("signup-error");
  }

  function showError(elId, message) {
    const el = document.getElementById(elId);
    el.textContent = message;
    el.hidden = false;
  }

  function hideError(elId) {
    const el = document.getElementById(elId);
    el.hidden = true;
  }

  function setButtonLoading(btn, loading) {
    const text = btn.querySelector(".btn-text");
    const spinner = btn.querySelector(".btn-spinner");
    btn.disabled = loading;
    if (loading) {
      text.style.visibility = "hidden";
      spinner.hidden = false;
    } else {
      text.style.visibility = "visible";
      spinner.hidden = true;
    }
  }

  function loadDashboard() {
    const user = getCurrentUser();
    const name = user ? user.name : "Student";
    document.getElementById("dash-user-name").textContent = name;
    document.getElementById("profile-name").textContent = name;
    document.getElementById("profile-email").textContent = user ? user.email : "";
    document.getElementById("composer-avatar").textContent = initials(name);
    document.getElementById("profile-avatar").textContent = initials(name);

    loadPosts();
    loadClasses();
    switchView("view-home");
  }

  function switchView(viewId) {
    document.querySelectorAll(".dashboard-view").forEach((v) => v.classList.remove("active-view"));
    document.getElementById(viewId).classList.add("active-view");
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active-nav", btn.getAttribute("data-view") === viewId);
    });
  }

  function openModal() {
    document.getElementById("post-modal-overlay").classList.add("active-modal");
    document.getElementById("post-content-input").focus();
  }

  function closeModal() {
    document.getElementById("post-modal-overlay").classList.remove("active-modal");
    document.getElementById("post-content-input").value = "";
  }

  /* ---------------------------------------------------------
     EVENT WIRING
  --------------------------------------------------------- */
  function initEventListeners() {
    // Switch between login/signup forms
    document.getElementById("show-signup").addEventListener("click", (e) => {
      e.preventDefault();
      showSignupForm();
    });
    document.getElementById("show-login").addEventListener("click", (e) => {
      e.preventDefault();
      showLoginForm();
    });

    // Password show/hide toggles
    document.querySelectorAll(".toggle-password").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        const icon = btn.querySelector("i");
        if (input.type === "password") {
          input.type = "text";
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        } else {
          input.type = "password";
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        }
      });
    });

    // Login form submit
    document.getElementById("login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      hideError("login-error");

      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      if (!isValidEmail(email)) {
        showError("login-error", "Please enter a valid email address.");
        return;
      }
      if (!password) {
        showError("login-error", "Please enter your password.");
        return;
      }

      const btn = document.getElementById("login-submit-btn");
      setButtonLoading(btn, true);

      setTimeout(() => {
        const result = login(email, password);
        setButtonLoading(btn, false);
        if (!result.success) {
          showError("login-error", result.message);
          return;
        }
        e.target.reset();
        showPage("dashboard-page");
        loadDashboard();
      }, 500);
    });

    // Signup form submit
    document.getElementById("signup-form").addEventListener("submit", (e) => {
      e.preventDefault();
      hideError("signup-error");

      const name = document.getElementById("signup-name").value.trim();
      const email = document.getElementById("signup-email").value.trim();
      const password = document.getElementById("signup-password").value;
      const confirm = document.getElementById("signup-confirm").value;

      if (!name) {
        showError("signup-error", "Please enter your full name.");
        return;
      }
      if (!isValidEmail(email)) {
        showError("signup-error", "Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        showError("signup-error", "Password must be at least 6 characters.");
        return;
      }
      if (password !== confirm) {
        showError("signup-error", "Passwords do not match.");
        return;
      }

      const btn = document.getElementById("signup-submit-btn");
      setButtonLoading(btn, true);

      setTimeout(() => {
        const result = signup(name, email, password);
        setButtonLoading(btn, false);
        if (!result.success) {
          showError("signup-error", result.message);
          return;
        }
        e.target.reset();
        showPage("dashboard-page");
        loadDashboard();
      }, 500);
    });

    // Logout
    document.getElementById("logout-btn").addEventListener("click", logout);
    document.getElementById("logout-btn-2").addEventListener("click", logout);

    // Bottom nav
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.getAttribute("data-view")));
    });

    // Create post modal
    document.getElementById("open-composer-btn").addEventListener("click", openModal);
    document.getElementById("open-composer-btn-2").addEventListener("click", openModal);
    document.getElementById("close-modal-btn").addEventListener("click", closeModal);
    document.getElementById("post-modal-overlay").addEventListener("click", (e) => {
      if (e.target.id === "post-modal-overlay") closeModal();
    });

    document.getElementById("submit-post-btn").addEventListener("click", () => {
      const input = document.getElementById("post-content-input");
      const content = input.value.trim();
      if (!content) {
        input.focus();
        return;
      }
      createPost(content);
      closeModal();
      loadPosts();
      switchView("view-home");
    });

    // Offline / online detection
    window.addEventListener("offline", () => handleOffline(true));
    window.addEventListener("online", () => handleOffline(false));
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleOffline(isOffline) {
    const banner = document.getElementById("offline-banner");
    banner.hidden = !isOffline;
  }

  /* ---------------------------------------------------------
     PWA FUNCTIONS
  --------------------------------------------------------- */
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch((err) => {
          console.warn("Service worker registration failed:", err);
        });
      });
    }
  }

  function checkInstallStatus() {
    window.addEventListener("beforeinstallprompt", (e) => {
      // Available for future custom "Install App" button.
      window.deferredInstallPrompt = e;
    });
  }

  /* ---------------------------------------------------------
     INIT / SPLASH TRANSITION
  --------------------------------------------------------- */
  function init() {
    seedDemoPosts();
    initEventListeners();
    registerServiceWorker();
    checkInstallStatus();
    handleOffline(!navigator.onLine);

    setTimeout(() => {
      if (isLoggedIn()) {
        showPage("dashboard-page");
        loadDashboard();
      } else {
        showPage("login-page");
        showLoginForm();
      }
    }, 2200);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
