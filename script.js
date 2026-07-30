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
    if (!feed) return;
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
    if (!list) return;
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
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add("active-page");
    }
    if (pageId === "login-page" || pageId === "dashboard-page") {
      document.body.classList.remove("splash-active");
    }
  }

  function showLoginForm() {
    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");
    if (signupForm) signupForm.classList.remove("active-form");
    if (loginForm) loginForm.classList.add("active-form");
    hideError("login-error");
  }

  function showSignupForm() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    if (loginForm) loginForm.classList.remove("active-form");
    if (signupForm) signupForm.classList.add("active-form");
    hideError("signup-error");
  }

  function showError(elId, message) {
    const el = document.getElementById(elId);
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  }

  function hideError(elId) {
    const el = document.getElementById(elId);
    if (el) el.hidden = true;
  }

  function setButtonLoading(btn, loading) {
    const text = btn.querySelector(".btn-text");
    const spinner = btn.querySelector(".btn-spinner");
    btn.disabled = loading;
    if (loading) {
      if (text) text.style.visibility = "hidden";
      if (spinner) spinner.hidden = false;
    } else {
      if (text) text.style.visibility = "visible";
      if (spinner) spinner.hidden = true;
    }
  }

  function loadDashboard() {
    const user = getCurrentUser();
    const name = user ? user.name : "Student";
    
    const dashName = document.getElementById("dash-user-name");
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const composerAvatar = document.getElementById("composer-avatar");
    const profileAvatar = document.getElementById("profile-avatar");

    if (dashName) dashName.textContent = name;
    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = user ? user.email : "";
    if (composerAvatar) composerAvatar.textContent = initials(name);
    if (profileAvatar) profileAvatar.textContent = initials(name);

    loadPosts();
    loadClasses();
    switchView("view-home");
  }

  function switchView(viewId) {
    document.querySelectorAll(".dashboard-view").forEach((v) => v.classList.remove("active-view"));
    const target = document.getElementById(viewId);
    if (target) target.classList.add("active-view");
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active-nav", btn.getAttribute("data-view") === viewId);
    });
  }

  function openModal() {
    const overlay = document.getElementById("post-modal-overlay");
    const input = document.getElementById("post-content-input");
    if (overlay) overlay.classList.add("active-modal");
    if (input) input.focus();
  }

  function closeModal() {
    const overlay = document.getElementById("post-modal-overlay");
    const input = document.getElementById("post-content-input");
    if (overlay) overlay.classList.remove("active-modal");
    if (input) input.value = "";
  }

  /* ---------------------------------------------------------
     OFFLINE BANNER HANDLING
  --------------------------------------------------------- */
  function handleOffline(isOffline) {
    const banner = document.getElementById("offline-banner");
    if (banner) {
      if (typeof isOffline === "boolean") {
        banner.hidden = !isOffline;
      } else {
        banner.hidden = navigator.onLine;
      }
    }
  }

  /* ---------------------------------------------------------
     EVENT WIRING
  --------------------------------------------------------- */
  function initEventListeners() {
    // Switch between login/signup forms
    const showSignupLink = document.getElementById("show-signup");
    const showLoginLink = document.getElementById("show-login");
    if (showSignupLink) {
      showSignupLink.addEventListener("click", (e) => {
        e.preventDefault();
        showSignupForm();
      });
    }
    if (showLoginLink) {
      showLoginLink.addEventListener("click", (e) => {
        e.preventDefault();
        showLoginForm();
      });
    }

    // Password show/hide toggles
    document.querySelectorAll(".toggle-password").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        const icon = btn.querySelector("i");
        if (input && icon) {
          if (input.type === "password") {
            input.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
          } else {
            input.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
          }
        }
      });
    });

    // Login form submit
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        hideError("login-error");

        const email = document.getElementById("login-email");
        const password = document.getElementById("login-password");
        const emailVal = email ? email.value.trim() : "";
        const passwordVal = password ? password.value : "";

        if (!isValidEmail(emailVal)) {
          showError("login-error", "Please enter a valid email address.");
          return;
        }
        if (!passwordVal) {
          showError("login-error", "Please enter your password.");
          return;
        }

        const btn = document.getElementById("login-submit-btn");
        setButtonLoading(btn, true);

        setTimeout(() => {
          const result = login(emailVal, passwordVal);
          setButtonLoading(btn, false);
          if (!result.success) {
            showError("login-error", result.message);
            return;
          }
          loginForm.reset();
          showPage("dashboard-page");
          loadDashboard();
        }, 500);
      });
    }

    // Signup form submit
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        hideError("signup-error");

        const nameInput = document.getElementById("signup-name");
        const emailInput = document.getElementById("signup-email");
        const passwordInput = document.getElementById("signup-password");
        const confirmInput = document.getElementById("signup-confirm");

        const name = nameInput ? nameInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";
        const confirm = confirmInput ? confirmInput.value : "";

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
          signupForm.reset();
          showPage("dashboard-page");
          loadDashboard();
        }, 500);
      });
    }

    // Logout
    const logoutBtn1 = document.getElementById("logout-btn");
    const logoutBtn2 = document.getElementById("logout-btn-2");
    if (logoutBtn1) logoutBtn1.addEventListener("click", logout);
    if (logoutBtn2) logoutBtn2.addEventListener("click", logout);

    // Bottom nav
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.getAttribute("data-view")));
    });

    // Create post modal
    const composerBtn1 = document.getElementById("open-composer-btn");
    const composerBtn2 = document.getElementById("open-composer-btn-2");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const overlay = document.getElementById("post-modal-overlay");
    const submitBtn = document.getElementById("submit-post-btn");

    if (composerBtn1) composerBtn1.addEventListener("click", openModal);
    if (composerBtn2) composerBtn2.addEventListener("click", openModal);
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target.id === "post-modal-overlay") closeModal();
      });
    }
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const input = document.getElementById("post-content-input");
        const content = input ? input.value.trim() : "";
        if (!content) {
          if (input) input.focus();
          return;
        }
        createPost(content);
        closeModal();
        loadPosts();
        switchView("view-home");
      });
    }

    // Offline / online detection
    window.addEventListener("offline", () => handleOffline(true));
    window.addEventListener("online", () => handleOffline(false));
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
      window.deferredInstallPrompt = e;
    });
  }

  /* ---------------------------------------------------------
     INIT / SPLASH TRANSITION (FIXED)
  --------------------------------------------------------- */
  function init() {
    try {
      seedDemoPosts();
    } catch (e) {
      console.warn("Seed posts failed:", e);
    }

    initEventListeners();
    registerServiceWorker();
    checkInstallStatus();

    // Set initial offline banner state
    handleOffline(!navigator.onLine);

    // Prevent scrolling during splash
    document.body.classList.add("splash-active");

    // Transition from splash to main app
    setTimeout(function () {
      try {
        // HIDE SPLASH FIRST - always remove the splash class regardless of errors
        document.body.classList.remove("splash-active");

        // Also explicitly hide the splash page
        const splashPage = document.getElementById("splash-page");
        if (splashPage) {
          splashPage.classList.remove("active-page");
          splashPage.style.display = "none";
        }

        // Then show the appropriate page
        if (isLoggedIn()) {
          showPage("dashboard-page");
          loadDashboard();
        } else {
          showPage("login-page");
          showLoginForm();
        }
      } catch (err) {
        // If anything fails, force show login page as fallback
        console.error("Splash transition error:", err);
        document.body.classList.remove("splash-active");
        const splashPage = document.getElementById("splash-page");
        if (splashPage) {
          splashPage.classList.remove("active-page");
          splashPage.style.display = "none";
        }
        showPage("login-page");
        showLoginForm();
      }
    }, 2200);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
