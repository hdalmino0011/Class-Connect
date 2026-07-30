/* =========================================================
   ClassConnect — script.js
   Auth, UI, Posts, Subjects, Schedule, Assignments, Grades,
   Profile, FAQs, About, Policy, Settings — localStorage only
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
    SUBJECTS: "cc_subjects",
    SCHEDULE: "cc_schedule",
    ASSIGNMENTS: "cc_assignments",
    GRADES: "cc_grades",
    PROFILE: "cc_profile",
    SETTINGS: "cc_settings",
    CLASSMATES: "cc_classmates",
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

  const DEMO_CLASSMATES = [
    { name: "Maria Delacruz", course: "BSIT", year: "3rd Year", section: "BSIT 3-A" },
    { name: "Juan Reyes", course: "BSIT", year: "3rd Year", section: "BSIT 3-A" },
    { name: "Anna Santos", course: "BSIT", year: "3rd Year", section: "BSIT 3-B" },
    { name: "Carlos Garcia", course: "BSIT", year: "3rd Year", section: "BSIT 3-A" },
    { name: "Lisa Tan", course: "BSIT", year: "3rd Year", section: "BSIT 3-B" },
  ];

  const DEMO_FAQS = [
    { question: "What is ClassConnect?", answer: "ClassConnect is a platform designed to help students connect with classmates, manage subjects, track assignments, and stay organized throughout their academic journey." },
    { question: "How do I create an account?", answer: "Simply click on 'Sign Up' on the login page, fill in your full name, email address, and a password (at least 6 characters), then confirm your password and submit." },
    { question: "Can I access ClassConnect on multiple devices?", answer: "Yes! ClassConnect is a Progressive Web App (PWA) that works on both mobile phones and desktop computers. You can install it as an app for the best experience." },
    { question: "How do I add a subject?", answer: "Go to the Subjects page from the menu, click the 'Add Subject' button, fill in the subject name, professor, and schedule, then click save." },
    { question: "How do I track my assignments?", answer: "Navigate to the Assignments page, click 'Add Task' to create new tasks, and check them off as you complete them using the checkbox." },
    { question: "How does the Grades page work?", answer: "Enter your grade for each subject, select your year level and semester, and the app will automatically calculate your general average. You can also exclude subjects from the calculation." },
    { question: "Is my data safe?", answer: "Your data is stored locally in your browser and is not shared with anyone. We prioritize your privacy and security. For more details, please read our Privacy Policy." },
    { question: "Can I edit my profile information?", answer: "Yes! Go to the Profile page from the menu, update any of your personal information, and click 'Save Profile' to save your changes." },
  ];

  /* ---------------------------------------------------------
     UTILITY FUNCTIONS
  --------------------------------------------------------- */
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
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }

  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.floor(hours / 24);
    return days + "d ago";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getData(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /* ---------------------------------------------------------
     AUTH FUNCTIONS
  --------------------------------------------------------- */
  function getUsers() { return getData(KEYS.USERS, []); }
  function saveUsers(users) { setData(KEYS.USERS, users); }

  function signup(name, email, password) {
    const users = getUsers();
    const exists = users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
    if (exists) {
      return { success: false, message: "An account with this email already exists." };
    }
    const newUser = { name: name.trim(), email: email.trim(), password: password };
    users.push(newUser);
    saveUsers(users);
    setSession(newUser);
    // Initialize profile for new user
    saveProfile({ name: name.trim(), email: email.trim() });
    return { success: true };
  }

  function login(email, password) {
    const users = getUsers();
    const user = users.find(function (u) {
      return u.email.toLowerCase() === email.toLowerCase() && u.password === password;
    });
    if (!user) {
      return { success: false, message: "Invalid email or password." };
    }
    setSession(user);
    return { success: true };
  }

  function setSession(user) {
    setData(KEYS.SESSION, { name: user.name, email: user.email });
  }

  function logout() {
    localStorage.removeItem(KEYS.SESSION);
    showPage("login-page");
    showLoginForm();
    closeDrawer();
  }

  function getCurrentUser() {
    return getData(KEYS.SESSION, null);
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  /* ---------------------------------------------------------
     PROFILE FUNCTIONS
  --------------------------------------------------------- */
  function getProfile() {
    const user = getCurrentUser();
    if (!user) return {};
    const profile = getData(KEYS.PROFILE, {});
    // Ensure email matches session
    if (profile.email !== user.email) {
      profile.email = user.email;
    }
    return profile;
  }

  function saveProfile(data) {
    const user = getCurrentUser();
    if (!user) return;
    const profile = getProfile();
    // Merge and ensure email is from session
    data.email = user.email;
    const merged = Object.assign({}, profile, data);
    setData(KEYS.PROFILE, merged);
    // Update session name if changed
    if (data.name && data.name !== user.name) {
      const users = getUsers();
      const found = users.find(function (u) { return u.email.toLowerCase() === user.email.toLowerCase(); });
      if (found) {
        found.name = data.name;
        saveUsers(users);
        setSession({ name: data.name, email: user.email });
      }
    }
  }

  function getProfilePhoto() {
    const profile = getProfile();
    return profile.photo || null;
  }

  function saveProfilePhoto(base64Data) {
    const profile = getProfile();
    profile.photo = base64Data;
    saveProfile(profile);
  }

  /* ---------------------------------------------------------
     POSTS FUNCTIONS
  --------------------------------------------------------- */
  function getPosts() { return getData(KEYS.POSTS, []); }
  function savePosts(posts) { setData(KEYS.POSTS, posts); }

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
        image: null,
      },
      {
        id: cryptoId(),
        author: "Maria Delacruz",
        content: "Does anyone have notes from yesterday's lecture on binary trees? I missed the last 20 minutes.",
        tag: "Data Structures & Algorithms",
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
        image: null,
      },
      {
        id: cryptoId(),
        author: "Prof. Reyes",
        content: "Class is moved to Room 402 for next week due to maintenance in our usual room.",
        tag: "Networking II",
        timestamp: Date.now() - 1000 * 60 * 60 * 30,
        image: null,
      },
    ];
    savePosts(seed);
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

  function deletePost(id) {
    let posts = getPosts();
    posts = posts.filter(function (p) { return p.id !== id; });
    savePosts(posts);
  }

  function loadPosts() {
    const feed = document.getElementById("posts-feed");
    if (!feed) return;
    const posts = getPosts();
    feed.innerHTML = "";

    if (posts.length === 0) {
      feed.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No posts yet. Be the first to share something!</p></div>';
      return;
    }

    posts.forEach(function (post) {
      const card = document.createElement("div");
      card.className = "post-card";
      var imageHtml = "";
      if (post.image) {
        imageHtml = '<img src="' + post.image + '" alt="Post image">';
      }
      card.innerHTML = `
        ${post.tag ? '<span class="post-tag">' + escapeHtml(post.tag) + '</span>' : ""}
        <div class="post-header">
          <div class="avatar-circle">${escapeHtml(initials(post.author))}</div>
          <div class="post-author-info">
            <span class="post-author-name">${escapeHtml(post.author)}</span>
            <span class="post-timestamp">${timeAgo(post.timestamp)}</span>
          </div>
        </div>
        <div class="post-content">${post.content}${imageHtml}</div>
        <div class="post-footer">
          <button class="btn-delete-post" data-id="${post.id}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      `;
      feed.appendChild(card);
    });

    feed.querySelectorAll(".btn-delete-post").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deletePost(btn.getAttribute("data-id"));
        loadPosts();
      });
    });
  }

  /* ---------------------------------------------------------
     SUBJECTS FUNCTIONS
  --------------------------------------------------------- */
  function getSubjects() { return getData(KEYS.SUBJECTS, []); }
  function saveSubjects(subjects) { setData(KEYS.SUBJECTS, subjects); }

  function addSubject(name, professor, schedule) {
    const subjects = getSubjects();
    const subject = {
      id: cryptoId(),
      name: name.trim(),
      professor: professor.trim(),
      schedule: schedule.trim(),
      tasks: [],
    };
    subjects.push(subject);
    saveSubjects(subjects);
    return subject;
  }

  function updateSubject(id, data) {
    let subjects = getSubjects();
    const index = subjects.findIndex(function (s) { return s.id === id; });
    if (index === -1) return null;
    subjects[index] = Object.assign({}, subjects[index], data);
    saveSubjects(subjects);
    return subjects[index];
  }

  function deleteSubject(id) {
    let subjects = getSubjects();
    subjects = subjects.filter(function (s) { return s.id !== id; });
    saveSubjects(subjects);
  }

  function addSubjectTask(subjectId, text) {
    let subjects = getSubjects();
    const index = subjects.findIndex(function (s) { return s.id === subjectId; });
    if (index === -1) return null;
    const task = { id: cryptoId(), text: text.trim(), completed: false };
    subjects[index].tasks.push(task);
    saveSubjects(subjects);
    return task;
  }

  function toggleSubjectTask(subjectId, taskId) {
    let subjects = getSubjects();
    const index = subjects.findIndex(function (s) { return s.id === subjectId; });
    if (index === -1) return;
    const taskIndex = subjects[index].tasks.findIndex(function (t) { return t.id === taskId; });
    if (taskIndex === -1) return;
    subjects[index].tasks[taskIndex].completed = !subjects[index].tasks[taskIndex].completed;
    saveSubjects(subjects);
  }

  function deleteSubjectTask(subjectId, taskId) {
    let subjects = getSubjects();
    const index = subjects.findIndex(function (s) { return s.id === subjectId; });
    if (index === -1) return;
    subjects[index].tasks = subjects[index].tasks.filter(function (t) { return t.id !== taskId; });
    saveSubjects(subjects);
  }

  function loadSubjects() {
    const list = document.getElementById("subjects-list");
    if (!list) return;
    const subjects = getSubjects();
    list.innerHTML = "";

    if (subjects.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-book"></i><p>No subjects yet. Click "Add Subject" to get started!</p></div>';
      return;
    }

    subjects.forEach(function (subject) {
      const card = document.createElement("div");
      card.className = "subject-card";
      var tasksHtml = "";
      if (subject.tasks && subject.tasks.length > 0) {
        tasksHtml = '<span class="subject-tasks-label"><i class="fas fa-list-check"></i> Tasks:</span>';
        subject.tasks.forEach(function (task) {
          tasksHtml += `
            <div class="subject-task-item">
              <input type="checkbox" class="task-checkbox" data-subject-id="${subject.id}" data-task-id="${task.id}" ${task.completed ? "checked" : ""}>
              <span class="task-text ${task.completed ? "completed" : ""}">${escapeHtml(task.text)}</span>
              <button class="btn-task-delete" data-subject-id="${subject.id}" data-task-id="${task.id}"><i class="fas fa-xmark"></i></button>
            </div>
          `;
        });
      }
      card.innerHTML = `
        <div class="subject-card-header">
          <h4>${escapeHtml(subject.name)}</h4>
          <div class="subject-actions">
            <button class="btn-icon btn-edit-subject" data-id="${subject.id}" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="btn-icon btn-delete" data-id="${subject.id}" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="subject-professor"><i class="fas fa-user-tie"></i> ${escapeHtml(subject.professor || "No professor assigned")}</div>
        <div class="subject-schedule"><i class="fas fa-calendar"></i> ${escapeHtml(subject.schedule || "No schedule set")}</div>
        <div class="subject-tasks">
          ${tasksHtml}
          <button class="subject-add-task-btn" data-subject-id="${subject.id}"><i class="fas fa-plus"></i> Add Task</button>
        </div>
      `;
      list.appendChild(card);
    });

    // Event listeners for subject actions
    list.querySelectorAll(".btn-edit-subject").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-id");
        editSubject(id);
      });
    });

    list.querySelectorAll(".btn-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-id");
        if (confirm("Delete this subject?")) {
          deleteSubject(id);
          loadSubjects();
        }
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
        if (confirm("Delete this task?")) {
          deleteSubjectTask(btn.getAttribute("data-subject-id"), btn.getAttribute("data-task-id"));
          loadSubjects();
        }
      });
    });

    list.querySelectorAll(".subject-add-task-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.getElementById("subject-task-subject-id").value = btn.getAttribute("data-subject-id");
        openModal("subject-task-modal-overlay");
      });
    });
  }

  function editSubject(id) {
    const subjects = getSubjects();
    const subject = subjects.find(function (s) { return s.id === id; });
    if (!subject) return;
    document.getElementById("subject-edit-id").value = id;
    document.getElementById("subject-name").value = subject.name;
    document.getElementById("subject-professor").value = subject.professor || "";
    document.getElementById("subject-schedule").value = subject.schedule || "";
    document.getElementById("subject-modal-title").textContent = "Edit Subject";
    openModal("subject-modal-overlay");
  }

  /* ---------------------------------------------------------
     SCHEDULE FUNCTIONS
  --------------------------------------------------------- */
  function getSchedule() { return getData(KEYS.SCHEDULE, []); }
  function saveSchedule(schedule) { setData(KEYS.SCHEDULE, schedule); }

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
    let schedule = getSchedule();
    const index = schedule.findIndex(function (s) { return s.id === id; });
    if (index === -1) return null;
    schedule[index] = Object.assign({}, schedule[index], data);
    saveSchedule(schedule);
    return schedule[index];
  }

  function deleteScheduleItem(id) {
    let schedule = getSchedule();
    schedule = schedule.filter(function (s) { return s.id !== id; });
    saveSchedule(schedule);
  }

  function loadSchedule() {
    const list = document.getElementById("schedule-list");
    if (!list) return;
    const schedule = getSchedule();
    list.innerHTML = "";

    if (schedule.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-calendar"></i><p>No schedule entries yet. Click "Add Schedule" to get started!</p></div>';
      return;
    }

    // Sort by day of week
    const dayOrder = { "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6 };
    schedule.sort(function (a, b) {
      var dayA = a.day ? a.day.substring(0, 3) : "";
      var dayB = b.day ? b.day.substring(0, 3) : "";
      return (dayOrder[dayA] || 0) - (dayOrder[dayB] || 0);
    });

    schedule.forEach(function (item) {
      const card = document.createElement("div");
      card.className = "schedule-card";
      card.innerHTML = `
        <div class="schedule-card-info">
          <h4>${escapeHtml(item.subject)}</h4>
          <p><i class="fas fa-calendar-day"></i> ${escapeHtml(item.day || "N/A")} &nbsp;|&nbsp; <i class="fas fa-clock"></i> ${escapeHtml(item.startTime || "")} - ${escapeHtml(item.endTime || "")}</p>
          <p><i class="fas fa-location-dot"></i> ${escapeHtml(item.room || "No room assigned")}</p>
        </div>
        <div class="schedule-card-actions">
          <button class="btn-icon btn-edit-schedule" data-id="${item.id}" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" data-id="${item.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll(".btn-edit-schedule").forEach(function (btn) {
      btn.addEventListener("click", function () {
        editScheduleItem(btn.getAttribute("data-id"));
      });
    });

    list.querySelectorAll(".btn-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (confirm("Delete this schedule entry?")) {
          deleteScheduleItem(btn.getAttribute("data-id"));
          loadSchedule();
        }
      });
    });
  }

  function editScheduleItem(id) {
    const schedule = getSchedule();
    const item = schedule.find(function (s) { return s.id === id; });
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

  /* ---------------------------------------------------------
     ASSIGNMENTS FUNCTIONS
  --------------------------------------------------------- */
  function getAssignments() { return getData(KEYS.ASSIGNMENTS, []); }
  function saveAssignments(assignments) { setData(KEYS.ASSIGNMENTS, assignments); }

  function addAssignment(text, subject, dueDate) {
    const assignments = getAssignments();
    const item = {
      id: cryptoId(),
      text: text.trim(),
      subject: subject.trim(),
      dueDate: dueDate || "",
      completed: false,
    };
    assignments.unshift(item);
    saveAssignments(assignments);
    return item;
  }

  function toggleAssignment(id) {
    let assignments = getAssignments();
    const index = assignments.findIndex(function (a) { return a.id === id; });
    if (index === -1) return;
    assignments[index].completed = !assignments[index].completed;
    saveAssignments(assignments);
  }

  function deleteAssignment(id) {
    let assignments = getAssignments();
    assignments = assignments.filter(function (a) { return a.id !== id; });
    saveAssignments(assignments);
  }

  function loadAssignments() {
    const list = document.getElementById("assignments-list");
    if (!list) return;
    const assignments = getAssignments();
    list.innerHTML = "";

    if (assignments.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>No assignments yet. Click "Add Task" to get started!</p></div>';
      return;
    }

    assignments.forEach(function (item) {
      const div = document.createElement("div");
      div.className = "assignment-item";
      var dueHtml = "";
      if (item.dueDate) {
        dueHtml = ' <i class="fas fa-calendar"></i> Due: ' + escapeHtml(item.dueDate);
      }
      if (item.subject) {
        dueHtml = ' <i class="fas fa-book"></i> ' + escapeHtml(item.subject) + dueHtml;
      }
      div.innerHTML = `
        <input type="checkbox" class="assignment-checkbox" data-id="${item.id}" ${item.completed ? "checked" : ""}>
        <div class="assignment-info">
          <span class="assignment-text ${item.completed ? "completed" : ""}">${escapeHtml(item.text)}</span>
          <div class="assignment-meta">${dueHtml}</div>
        </div>
        <button class="btn-assignment-delete" data-id="${item.id}"><i class="fas fa-trash"></i></button>
      `;
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
        if (confirm("Delete this assignment?")) {
          deleteAssignment(btn.getAttribute("data-id"));
          loadAssignments();
        }
      });
    });
  }

  /* ---------------------------------------------------------
     GRADES FUNCTIONS
  --------------------------------------------------------- */
  function getGrades() { return getData(KEYS.GRADES, []); }
  function saveGrades(grades) { setData(KEYS.GRADES, grades); }

  function addGrade(subject, gradeValue, year, semester, exclude) {
    const grades = getGrades();
    const item = {
      id: cryptoId(),
      subject: subject.trim(),
      grade: parseFloat(gradeValue),
      year: year || "1st",
      semester: semester || "1st",
      exclude: !!exclude,
    };
    grades.push(item);
    saveGrades(grades);
    return item;
  }

  function updateGrade(id, data) {
    let grades = getGrades();
    const index = grades.findIndex(function (g) { return g.id === id; });
    if (index === -1) return null;
    grades[index] = Object.assign({}, grades[index], data);
    saveGrades(grades);
    return grades[index];
  }

  function deleteGrade(id) {
    let grades = getGrades();
    grades = grades.filter(function (g) { return g.id !== id; });
    saveGrades(grades);
  }

  function toggleGradeExclude(id) {
    let grades = getGrades();
    const index = grades.findIndex(function (g) { return g.id === id; });
    if (index === -1) return;
    grades[index].exclude = !grades[index].exclude;
    saveGrades(grades);
  }

  function calculateGWA(grades, year, semester) {
    var filtered = grades.filter(function (g) {
      return g.year === year && g.semester === semester;
    });
    var eligible = filtered.filter(function (g) { return !g.exclude; });
    if (eligible.length === 0) return 0;
    var total = 0;
    eligible.forEach(function (g) { total += g.grade; });
    return total / eligible.length;
  }

  function loadGrades() {
    const list = document.getElementById("grades-list");
    const display = document.getElementById("gwa-value");
    if (!list) return;

    const year = document.getElementById("grade-year-filter") ? document.getElementById("grade-year-filter").value : "1st";
    const semester = document.getElementById("grade-semester-filter") ? document.getElementById("grade-semester-filter").value : "1st";

    const grades = getGrades();
    var filtered = grades.filter(function (g) {
      return g.year === year && g.semester === semester;
    });

    list.innerHTML = "";

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-chart-simple"></i><p>No grades entered for this semester. Add your grades!</p></div>';
      if (display) display.textContent = "0.00";
      return;
    }

    filtered.forEach(function (item) {
      const div = document.createElement("div");
      div.className = "grade-item";
      var excludeBadge = item.exclude ? '<span class="grade-exclude-badge">Excluded</span>' : "";
      div.innerHTML = `
        <div class="grade-info">
          <h4>${escapeHtml(item.subject)}</h4>
          <p>${escapeHtml(item.year)} | ${escapeHtml(item.semester)} Semester</p>
        </div>
        <div class="grade-actions">
          ${excludeBadge}
          <span class="grade-value ${item.exclude ? "excluded" : ""}">${item.grade.toFixed(2)}</span>
          <button class="btn-icon btn-toggle-exclude" data-id="${item.id}" title="Toggle Exclude"><i class="fas ${item.exclude ? "fa-circle-check" : "fa-circle-xmark"}"></i></button>
          <button class="btn-icon btn-edit-grade" data-id="${item.id}" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" data-id="${item.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      `;
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

    list.querySelectorAll(".btn-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (confirm("Delete this grade?")) {
          deleteGrade(btn.getAttribute("data-id"));
          loadGrades();
        }
      });
    });

    // Calculate GWA
    const gwa = calculateGWA(grades, year, semester);
    if (display) display.textContent = gwa.toFixed(2);
  }

  function editGradeItem(id) {
    const grades = getGrades();
    const item = grades.find(function (g) { return g.id === id; });
    if (!item) return;
    document.getElementById("grade-edit-id").value = id;
    document.getElementById("grade-subject").value = item.subject;
    document.getElementById("grade-value").value = item.grade;
    document.getElementById("grade-year").value = item.year;
    document.getElementById("grade-semester").value = item.semester;
    document.getElementById("grade-exclude").checked = item.exclude;
    document.getElementById("grade-modal-title").textContent = "Edit Grade";
    openModal("grade-modal-overlay");
  }

  /* ---------------------------------------------------------
     CLASSMATES FUNCTIONS
  --------------------------------------------------------- */
  function getClassmates() { return getData(KEYS.CLASSMATES, []); }
  function saveClassmates(classmates) { setData(KEYS.CLASSMATES, classmates); }

  function seedDemoClassmates() {
    const existing = getClassmates();
    if (existing.length > 0) return;
    saveClassmates(DEMO_CLASSMATES);
  }

  function loadClassmates() {
    const list = document.getElementById("classmates-list");
    if (!list) return;
    const classmates = getClassmates();
    list.innerHTML = "";

    if (classmates.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No classmates found.</p></div>';
      return;
    }

    classmates.forEach(function (cm) {
      const card = document.createElement("div");
      card.className = "classmate-card";
      card.innerHTML = `
        <div class="classmate-avatar">${initials(cm.name)}</div>
        <div class="classmate-info">
          <h4>${escapeHtml(cm.name)}</h4>
          <p>${escapeHtml(cm.course || "")} ${escapeHtml(cm.year || "")} ${escapeHtml(cm.section || "")}</p>
        </div>
      `;
      list.appendChild(card);
    });
  }

  /* ---------------------------------------------------------
     FAQS FUNCTIONS
  --------------------------------------------------------- */
  function loadFaqs() {
    const list = document.getElementById("faqs-list");
    if (!list) return;

    // Check if FAQs already rendered
    if (list.querySelector(".faq-item")) return;

    DEMO_FAQS.forEach(function (faq, index) {
      const div = document.createElement("div");
      div.className = "faq-item";
      div.innerHTML = `
        <div class="faq-question" data-index="${index}">
          <i class="fas fa-chevron-right"></i> ${escapeHtml(faq.question)}
        </div>
        <div class="faq-answer">${escapeHtml(faq.answer)}</div>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll(".faq-question").forEach(function (q) {
      q.addEventListener("click", function () {
        var parent = q.parentElement;
        parent.classList.toggle("open");
      });
    });
  }

  /* ---------------------------------------------------------
     SETTINGS FUNCTIONS
  --------------------------------------------------------- */
  function getSettings() { return getData(KEYS.SETTINGS, { darkMode: false, fontSize: "medium" }); }
  function saveSettings(settings) { setData(KEYS.SETTINGS, settings); }

  function applySettings(settings) {
    if (!settings) settings = getSettings();
    // Dark Mode
    if (settings.darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    // Font Size
    var size = settings.fontSize || "medium";
    if (size === "small") {
      document.body.style.fontSize = "14px";
    } else if (size === "large") {
      document.body.style.fontSize = "18px";
    } else {
      document.body.style.fontSize = "16px";
    }
  }

  function updateStorageDisplay() {
    var total = 0;
    for (var key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length;
      }
    }
    var display = document.getElementById("settings-storage");
    if (display) {
      if (total < 1024) {
        display.textContent = total + " B";
      } else if (total < 1048576) {
        display.textContent = (total / 1024).toFixed(1) + " KB";
      } else {
        display.textContent = (total / 1048576).toFixed(1) + " MB";
      }
    }
  }

  function loadSettings() {
    const settings = getSettings();
    // Dark mode toggle
    const darkToggle = document.getElementById("dark-mode-toggle");
    if (darkToggle) darkToggle.checked = settings.darkMode || false;
    // Font size select
    const fontSelect = document.getElementById("font-size-select");
    if (fontSelect) fontSelect.value = settings.fontSize || "medium";
    // Apply settings
    applySettings(settings);
    // Update storage display
    updateStorageDisplay();
  }

  /* ---------------------------------------------------------
     UI HELPERS
  --------------------------------------------------------- */
  function showPage(pageId) {
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active-page"); });
    var targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add("active-page");
    }
    if (pageId === "login-page" || pageId === "dashboard-page") {
      document.body.classList.remove("splash-active");
    }
  }

  function showLoginForm() {
    var signupForm = document.getElementById("signup-form");
    var loginForm = document.getElementById("login-form");
    if (signupForm) signupForm.classList.remove("active-form");
    if (loginForm) loginForm.classList.add("active-form");
    hideError("login-error");
  }

  function showSignupForm() {
    var loginForm = document.getElementById("login-form");
    var signupForm = document.getElementById("signup-form");
    if (loginForm) loginForm.classList.remove("active-form");
    if (signupForm) signupForm.classList.add("active-form");
    hideError("signup-error");
  }

  function showError(elId, message) {
    var el = document.getElementById(elId);
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  }

  function hideError(elId) {
    var el = document.getElementById(elId);
    if (el) el.hidden = true;
  }

  function setButtonLoading(btn, loading) {
    var text = btn.querySelector(".btn-text");
    var spinner = btn.querySelector(".btn-spinner");
    btn.disabled = loading;
    if (loading) {
      if (text) text.style.visibility = "hidden";
      if (spinner) spinner.hidden = false;
    } else {
      if (text) text.style.visibility = "visible";
      if (spinner) spinner.hidden = true;
    }
  }

  function openModal(id) {
    var overlay = document.getElementById(id);
    if (overlay) overlay.classList.add("active-modal");
  }

  function closeModal(id) {
    var overlay = document.getElementById(id);
    if (overlay) overlay.classList.remove("active-modal");
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach(function (m) {
      m.classList.remove("active-modal");
    });
  }

  function switchView(viewId) {
    document.querySelectorAll(".dashboard-view").forEach(function (v) { v.classList.remove("active-view"); });
    var target = document.getElementById(viewId);
    if (target) target.classList.add("active-view");
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.classList.toggle("active-nav", btn.getAttribute("data-view") === viewId);
    });
    document.querySelectorAll(".drawer-item").forEach(function (btn) {
      btn.classList.toggle("active-drawer-item", btn.getAttribute("data-view") === viewId);
    });
    // Close drawer on mobile after navigation
    closeDrawer();
  }

  function navigateTo(viewId) {
    switchView(viewId);
  }

  /* ---------------------------------------------------------
     DRAWER FUNCTIONS
  --------------------------------------------------------- */
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
    document.body.style.overflow = "";
  }

  function toggleDrawer() {
    var drawer = document.getElementById("side-drawer");
    if (drawer && drawer.classList.contains("open")) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  function loadDashboard() {
    var user = getCurrentUser();
    var name = user ? user.name : "Student";
    var email = user ? user.email : "";

    var dashName = document.getElementById("dash-user-name");
    var profileName = document.getElementById("profile-name");
    var profileEmail = document.getElementById("profile-email");
    var composerAvatar = document.getElementById("composer-avatar");
    var profileAvatar = document.getElementById("profile-avatar");
    var drawerAvatar = document.getElementById("drawer-avatar");
    var drawerName = document.getElementById("drawer-name");
    var drawerEmail = document.getElementById("drawer-email");

    if (dashName) dashName.textContent = name;
    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email;
    if (composerAvatar) composerAvatar.textContent = initials(name);
    if (profileAvatar) profileAvatar.textContent = initials(name);
    if (drawerAvatar) drawerAvatar.textContent = initials(name);
    if (drawerName) drawerName.textContent = name;
    if (drawerEmail) drawerEmail.textContent = email;

    // Load profile data into form
    loadProfileForm();
    // Load all data
    loadPosts();
    loadSubjects();
    loadSchedule();
    loadAssignments();
    loadGrades();
    loadClassmates();
    loadFaqs();
    loadSettings();

    // Set active view
    switchView("view-home");
  }

  /* ---------------------------------------------------------
     PROFILE FORM FUNCTIONS
  --------------------------------------------------------- */
  function loadProfileForm() {
    var profile = getProfile();
    var fields = {
      "profile-fullname": profile.name || "",
      "profile-email": profile.email || "",
      "profile-bio": profile.bio || "",
      "profile-student-id": profile.studentId || "",
      "profile-course": profile.course || "",
      "profile-year": profile.year || "",
      "profile-section": profile.section || "",
      "profile-contact": profile.contact || "",
      "profile-birthdate": profile.birthdate || "",
      "profile-gender": profile.gender || "",
      "profile-address": profile.address || "",
      "profile-emergency": profile.emergency || "",
      "profile-guardian-name": profile.guardianName || "",
      "profile-guardian-contact": profile.guardianContact || "",
    };
    for (var id in fields) {
      var el = document.getElementById(id);
      if (el) el.value = fields[id];
    }
    // Load photo
    var avatar = document.getElementById("profile-avatar");
    var photo = getProfilePhoto();
    if (photo && avatar) {
      avatar.style.backgroundImage = "url(" + photo + ")";
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
      avatar.textContent = "";
    } else if (avatar) {
      avatar.style.backgroundImage = "";
      avatar.textContent = initials(profile.name || "S");
    }
  }

  /* ---------------------------------------------------------
     OFFLINE BANNER HANDLING
  --------------------------------------------------------- */
  function handleOffline(isOffline) {
    var banner = document.getElementById("offline-banner");
    if (banner) {
      if (typeof isOffline === "boolean") {
        banner.hidden = !isOffline;
      } else {
        banner.hidden = navigator.onLine;
      }
    }
  }

  /* ---------------------------------------------------------
     POST TOOLBAR FUNCTIONS
  --------------------------------------------------------- */
  var currentPostImage = null;

  function setupPostToolbar() {
    var editor = document.getElementById("post-content-editable");
    if (!editor) return;

    // Toolbar buttons
    document.querySelectorAll(".toolbar-btn[data-command]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var command = btn.getAttribute("data-command");
        document.execCommand(command, false, null);
        editor.focus();
      });
    });

    // Font selector
    var fontSelect = document.getElementById("post-font-select");
    if (fontSelect) {
      fontSelect.addEventListener("change", function () {
        var font = fontSelect.value;
        document.execCommand("fontName", false, font);
        editor.focus();
      });
    }

    // Image upload
    var imageBtn = document.getElementById("post-image-btn");
    var imageInput = document.getElementById("post-image-input");
    if (imageBtn && imageInput) {
      imageBtn.addEventListener("click", function () {
        imageInput.click();
      });
      imageInput.addEventListener("change", function () {
        var file = imageInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          currentPostImage = e.target.result;
          var preview = document.getElementById("post-image-preview");
          var img = document.getElementById("post-preview-img");
          if (preview && img) {
            img.src = currentPostImage;
            preview.hidden = false;
          }
          imageInput.value = "";
        };
        reader.readAsDataURL(file);
      });
    }

    // Remove image button
    var removeBtn = document.getElementById("post-remove-image-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        currentPostImage = null;
        var preview = document.getElementById("post-image-preview");
        if (preview) preview.hidden = true;
        var img = document.getElementById("post-preview-img");
        if (img) img.src = "#";
        editor.focus();
      });
    }
  }

  function getPostContent() {
    var editor = document.getElementById("post-content-editable");
    if (!editor) return "";
    return editor.innerHTML;
  }

  function clearPostContent() {
    var editor = document.getElementById("post-content-editable");
    if (editor) editor.innerHTML = "";
    currentPostImage = null;
    var preview = document.getElementById("post-image-preview");
    if (preview) preview.hidden = true;
    var img = document.getElementById("post-preview-img");
    if (img) img.src = "#";
  }

  /* ---------------------------------------------------------
     SETTINGS COLLAPSIBLE
  --------------------------------------------------------- */
  function toggleSettingsGroup(groupId) {
    var group = document.getElementById(groupId);
    var parent = group ? group.parentElement : null;
    if (group) {
      if (group.style.display === "none") {
        group.style.display = "block";
        if (parent) parent.classList.add("open");
      } else {
        group.style.display = "none";
        if (parent) parent.classList.remove("open");
      }
    }
  }

  /* ---------------------------------------------------------
     DARK MODE CSS
  --------------------------------------------------------- */
  // Dark mode styles are applied via JavaScript (body class)
  // CSS handles the rest

  /* ---------------------------------------------------------
     EXPORT / IMPORT FUNCTIONS
  --------------------------------------------------------- */
  function exportData() {
    var data = {
      users: getUsers(),
      posts: getPosts(),
      subjects: getSubjects(),
      schedule: getSchedule(),
      assignments: getAssignments(),
      grades: getGrades(),
      profile: getProfile(),
      settings: getSettings(),
      classmates: getClassmates(),
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
    };
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "classconnect-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.version) {
          alert("Invalid backup file.");
          return;
        }
        if (!confirm("This will overwrite all your current data. Are you sure?")) return;
        if (data.users) saveUsers(data.users);
        if (data.posts) savePosts(data.posts);
        if (data.subjects) saveSubjects(data.subjects);
        if (data.schedule) saveSchedule(data.schedule);
        if (data.assignments) saveAssignments(data.assignments);
        if (data.grades) saveGrades(data.grades);
        if (data.profile) saveProfile(data.profile);
        if (data.settings) saveSettings(data.settings);
        if (data.classmates) saveClassmates(data.classmates);
        alert("Data imported successfully! The page will reload.");
        location.reload();
      } catch (err) {
        alert("Failed to import data. Please check the file format.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------------------------------------------------------
     CLEAR DATA
  --------------------------------------------------------- */
  function clearAllData() {
    if (!confirm("Are you sure you want to delete ALL your data? This cannot be undone!")) return;
    if (!confirm("Really? All your subjects, grades, assignments, and posts will be gone.")) return;
    var keys = Object.values(KEYS);
    keys.forEach(function (key) {
      localStorage.removeItem(key);
    });
    alert("All data cleared. The page will reload.");
    location.reload();
  }

  /* ---------------------------------------------------------
     CHANGE PASSWORD
  --------------------------------------------------------- */
  function changePassword(currentPwd, newPwd, confirmPwd) {
    var user = getCurrentUser();
    if (!user) return { success: false, message: "Not logged in." };
    if (newPwd.length < 6) {
      return { success: false, message: "New password must be at least 6 characters." };
    }
    if (newPwd !== confirmPwd) {
      return { success: false, message: "Passwords do not match." };
    }
    var users = getUsers();
    var index = users.findIndex(function (u) { return u.email.toLowerCase() === user.email.toLowerCase(); });
    if (index === -1) return { success: false, message: "User not found." };
    if (users[index].password !== currentPwd) {
      return { success: false, message: "Current password is incorrect." };
    }
    users[index].password = newPwd;
    saveUsers(users);
    return { success: true, message: "Password updated successfully!" };
  }

  /* ---------------------------------------------------------
     EVENT WIRING
  --------------------------------------------------------- */
  function initEventListeners() {
    // ---- AUTH ----
    var showSignupLink = document.getElementById("show-signup");
    var showLoginLink = document.getElementById("show-login");
    if (showSignupLink) {
      showSignupLink.addEventListener("click", function (e) {
        e.preventDefault();
        showSignupForm();
      });
    }
    if (showLoginLink) {
      showLoginLink.addEventListener("click", function (e) {
        e.preventDefault();
        showLoginForm();
      });
    }

    // Password toggles
    document.querySelectorAll(".toggle-password").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.getAttribute("data-target");
        var input = document.getElementById(targetId);
        var icon = btn.querySelector("i");
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

    // Login form
    var loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        hideError("login-error");

        var emailEl = document.getElementById("login-email");
        var passwordEl = document.getElementById("login-password");
        var email = emailEl ? emailEl.value.trim() : "";
        var password = passwordEl ? passwordEl.value : "";

        if (!isValidEmail(email)) {
          showError("login-error", "Please enter a valid email address.");
          return;
        }
        if (!password) {
          showError("login-error", "Please enter your password.");
          return;
        }

        var btn = document.getElementById("login-submit-btn");
        setButtonLoading(btn, true);

        setTimeout(function () {
          var result = login(email, password);
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

    // Signup form
    var signupForm = document.getElementById("signup-form");
    if (signupForm) {
      signupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        hideError("signup-error");

        var nameEl = document.getElementById("signup-name");
        var emailEl = document.getElementById("signup-email");
        var passwordEl = document.getElementById("signup-password");
        var confirmEl = document.getElementById("signup-confirm");

        var name = nameEl ? nameEl.value.trim() : "";
        var email = emailEl ? emailEl.value.trim() : "";
        var password = passwordEl ? passwordEl.value : "";
        var confirm = confirmEl ? confirmEl.value : "";

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

        var btn = document.getElementById("signup-submit-btn");
        setButtonLoading(btn, true);

        setTimeout(function () {
          var result = signup(name, email, password);
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

    // ---- LOGOUT ----
    var logoutBtn1 = document.getElementById("logout-btn");
    var logoutBtn2 = document.getElementById("logout-btn-2");
    var logoutBtn3 = document.getElementById("drawer-logout-btn");
    var logoutBtn4 = document.getElementById("settings-logout-btn");
    if (logoutBtn1) logoutBtn1.addEventListener("click", logout);
    if (logoutBtn2) logoutBtn2.addEventListener("click", logout);
    if (logoutBtn3) logoutBtn3.addEventListener("click", logout);
    if (logoutBtn4) logoutBtn4.addEventListener("click", logout);

    // ---- HAMBURGER / DRAWER ----
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

    // ---- DRAWER NAVIGATION ----
    document.querySelectorAll(".drawer-item[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var view = btn.getAttribute("data-view");
        switchView(view);
      });
    });

    // ---- BOTTOM NAV ----
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var view = btn.getAttribute("data-view");
        switchView(view);
      });
    });

    // ---- CREATE POST MODAL ----
    var composerBtn1 = document.getElementById("open-composer-btn");
    var composerBtn2 = document.getElementById("open-composer-btn-2");
    var closeModalBtn = document.getElementById("close-modal-btn");
    var postOverlay = document.getElementById("post-modal-overlay");
    var submitPostBtn = document.getElementById("submit-post-btn");

    if (composerBtn1) composerBtn1.addEventListener("click", function () { openModal("post-modal-overlay"); });
    if (composerBtn2) composerBtn2.addEventListener("click", function () { openModal("post-modal-overlay"); });
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", function () {
        closeModal("post-modal-overlay");
        clearPostContent();
      });
    }
    if (postOverlay) {
      postOverlay.addEventListener("click", function (e) {
        if (e.target === postOverlay) {
          closeModal("post-modal-overlay");
          clearPostContent();
        }
      });
    }
    if (submitPostBtn) {
      submitPostBtn.addEventListener("click", function () {
        var content = getPostContent();
        if (!content || content === "<br>" || content === "<div><br></div>") {
          alert("Please enter some content for your post.");
          return;
        }
        createPost(content, currentPostImage);
        closeModal("post-modal-overlay");
        clearPostContent();
        loadPosts();
        switchView("view-home");
      });
    }

    // ---- SUBJECT MODAL ----
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
    if (closeSubjectModal) {
      closeSubjectModal.addEventListener("click", function () { closeModal("subject-modal-overlay"); });
    }
    if (subjectOverlay) {
      subjectOverlay.addEventListener("click", function (e) {
        if (e.target === subjectOverlay) closeModal("subject-modal-overlay");
      });
    }
    if (subjectForm) {
      subjectForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var id = document.getElementById("subject-edit-id").value;
        var name = document.getElementById("subject-name").value.trim();
        var professor = document.getElementById("subject-professor").value.trim();
        var schedule = document.getElementById("subject-schedule").value.trim();

        if (!name) {
          alert("Please enter a subject name.");
          return;
        }

        if (id) {
          updateSubject(id, { name: name, professor: professor, schedule: schedule });
        } else {
          addSubject(name, professor, schedule);
        }
        closeModal("subject-modal-overlay");
        subjectForm.reset();
        loadSubjects();
      });
    }

    // ---- SUBJECT TASK MODAL ----
    var closeSubjectTaskModal = document.getElementById("close-subject-task-modal-btn");
    var subjectTaskOverlay = document.getElementById("subject-task-modal-overlay");
    var subjectTaskForm = document.getElementById("subject-task-form");

    if (closeSubjectTaskModal) {
      closeSubjectTaskModal.addEventListener("click", function () { closeModal("subject-task-modal-overlay"); });
    }
    if (subjectTaskOverlay) {
      subjectTaskOverlay.addEventListener("click", function (e) {
        if (e.target === subjectTaskOverlay) closeModal("subject-task-modal-overlay");
      });
    }
    if (subjectTaskForm) {
      subjectTaskForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var subjectId = document.getElementById("subject-task-subject-id").value;
        var text = document.getElementById("subject-task-text").value.trim();
        if (!text) {
          alert("Please enter a task description.");
          return;
        }
        addSubjectTask(subjectId, text);
        closeModal("subject-task-modal-overlay");
        subjectTaskForm.reset();
        loadSubjects();
      });
    }

    // ---- SCHEDULE MODAL ----
    var addScheduleBtn = document.getElementById("add-schedule-btn");
    var closeScheduleModal = document.getElementById("close-schedule-modal-btn");
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
    if (closeScheduleModal) {
      closeScheduleModal.addEventListener("click", function () { closeModal("schedule-modal-overlay"); });
    }
    if (scheduleOverlay) {
      scheduleOverlay.addEventListener("click", function (e) {
        if (e.target === scheduleOverlay) closeModal("schedule-modal-overlay");
      });
    }
    if (scheduleForm) {
      scheduleForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var id = document.getElementById("schedule-edit-id").value;
        var subject = document.getElementById("schedule-subject").value.trim();
        var day = document.getElementById("schedule-day").value.trim();
        var startTime = document.getElementById("schedule-start-time").value;
        var endTime = document.getElementById("schedule-end-time").value;
        var room = document.getElementById("schedule-room").value.trim();

        if (!subject || !day || !startTime || !endTime) {
          alert("Please fill in all required fields.");
          return;
        }

        if (id) {
          updateScheduleItem(id, { subject: subject, day: day, startTime: startTime, endTime: endTime, room: room });
        } else {
          addScheduleItem(subject, day, startTime, endTime, room);
        }
        closeModal("schedule-modal-overlay");
        scheduleForm.reset();
        loadSchedule();
      });
    }

    // ---- ASSIGNMENT MODAL ----
    var addAssignmentBtn = document.getElementById("add-assignment-btn");
    var closeAssignmentModal = document.getElementById("close-assignment-modal-btn");
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
    if (closeAssignmentModal) {
      closeAssignmentModal.addEventListener("click", function () { closeModal("assignment-modal-overlay"); });
    }
    if (assignmentOverlay) {
      assignmentOverlay.addEventListener("click", function (e) {
        if (e.target === assignmentOverlay) closeModal("assignment-modal-overlay");
      });
    }
    if (assignmentForm) {
      assignmentForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = document.getElementById("assignment-text").value.trim();
        var subject = document.getElementById("assignment-subject").value.trim();
        var dueDate = document.getElementById("assignment-due-date").value;

        if (!text) {
          alert("Please enter a task description.");
          return;
        }

        addAssignment(text, subject, dueDate);
        closeModal("assignment-modal-overlay");
        assignmentForm.reset();
        loadAssignments();
      });
    }

    // ---- GRADE MODAL ----
    var addGradeBtn = document.getElementById("add-grade-btn");
    var closeGradeModal = document.getElementById("close-grade-modal-btn");
    var gradeOverlay = document.getElementById("grade-modal-overlay");
    var gradeForm = document.getElementById("grade-form");

    // Add grade button doesn't exist in HTML, we'll use a different approach
    // We'll create a floating add button or use the view header
    // For now, let's add a grade button dynamically
    var gradesViewHeader = document.querySelector("#view-grades .view-header");
    if (gradesViewHeader && !document.getElementById("add-grade-btn")) {
      var addGradeBtn2 = document.createElement("button");
      addGradeBtn2.id = "add-grade-btn";
      addGradeBtn2.className = "btn-add";
      addGradeBtn2.innerHTML = '<i class="fas fa-plus"></i> Add Grade';
      gradesViewHeader.appendChild(addGradeBtn2);
      addGradeBtn2.addEventListener("click", function () {
        document.getElementById("grade-edit-id").value = "";
        document.getElementById("grade-subject").value = "";
        document.getElementById("grade-value").value = "";
        document.getElementById("grade-year").value = "1st";
        document.getElementById("grade-semester").value = "1st";
        document.getElementById("grade-exclude").checked = false;
        document.getElementById("grade-modal-title").textContent = "Add Grade";
        openModal("grade-modal-overlay");
      });
    }

    if (closeGradeModal) {
      closeGradeModal.addEventListener("click", function () { closeModal("grade-modal-overlay"); });
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
        var subject = document.getElementById("grade-subject").value.trim();
        var gradeVal = parseFloat(document.getElementById("grade-value").value);
        var year = document.getElementById("grade-year").value;
        var semester = document.getElementById("grade-semester").value;
        var exclude = document.getElementById("grade-exclude").checked;

        if (!subject) {
          alert("Please enter a subject name.");
          return;
        }
        if (isNaN(gradeVal) || gradeVal < 0 || gradeVal > 100) {
          alert("Please enter a valid grade between 0 and 100.");
          return;
        }

        if (id) {
          updateGrade(id, { subject: subject, grade: gradeVal, year: year, semester: semester, exclude: exclude });
        } else {
          addGrade(subject, gradeVal, year, semester, exclude);
        }
        closeModal("grade-modal-overlay");
        gradeForm.reset();
        loadGrades();
      });
    }

    // ---- GRADE FILTERS ----
    var yearFilter = document.getElementById("grade-year-filter");
    var semesterFilter = document.getElementById("grade-semester-filter");
    if (yearFilter) yearFilter.addEventListener("change", loadGrades);
    if (semesterFilter) semesterFilter.addEventListener("change", loadGrades);

    // ---- PROFILE FORM ----
    var profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = {
          name: document.getElementById("profile-fullname").value.trim(),
          bio: document.getElementById("profile-bio").value.trim(),
          studentId: document.getElementById("profile-student-id").value.trim(),
          course: document.getElementById("profile-course").value.trim(),
          year: document.getElementById("profile-year").value,
          section: document.getElementById("profile-section").value.trim(),
          contact: document.getElementById("profile-contact").value.trim(),
          birthdate: document.getElementById("profile-birthdate").value,
          gender: document.getElementById("profile-gender").value,
          address: document.getElementById("profile-address").value.trim(),
          emergency: document.getElementById("profile-emergency").value.trim(),
          guardianName: document.getElementById("profile-guardian-name").value.trim(),
          guardianContact: document.getElementById("profile-guardian-contact").value.trim(),
        };
        saveProfile(data);
        alert("Profile saved successfully!");
        loadDashboard();
      });
    }

    // ---- PROFILE PHOTO UPLOAD ----
    var photoUploadBtn = document.getElementById("upload-photo-btn");
    var photoInput = document.getElementById("profile-photo-input");
    if (photoUploadBtn && photoInput) {
      photoUploadBtn.addEventListener("click", function () {
        photoInput.click();
      });
      photoInput.addEventListener("change", function () {
        var file = photoInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var base64 = e.target.result;
          saveProfilePhoto(base64);
          loadProfileForm();
          // Update avatar in dashboard
          var avatar = document.getElementById("profile-avatar");
          if (avatar) {
            avatar.style.backgroundImage = "url(" + base64 + ")";
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";
            avatar.textContent = "";
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // ---- SETTINGS ----
    var darkToggle = document.getElementById("dark-mode-toggle");
    if (darkToggle) {
      darkToggle.addEventListener("change", function () {
        var settings = getSettings();
        settings.darkMode = darkToggle.checked;
        saveSettings(settings);
        applySettings(settings);
      });
    }

    var fontSelect = document.getElementById("font-size-select");
    if (fontSelect) {
      fontSelect.addEventListener("change", function () {
        var settings = getSettings();
        settings.fontSize = fontSelect.value;
        saveSettings(settings);
        applySettings(settings);
      });
    }

    // Change Password
    var changePwdBtn = document.getElementById("settings-change-password-btn");
    if (changePwdBtn) {
      changePwdBtn.addEventListener("click", function () {
        var current = document.getElementById("settings-current-password").value;
        var newPwd = document.getElementById("settings-new-password").value;
        var confirm = document.getElementById("settings-confirm-password").value;
        var result = changePassword(current, newPwd, confirm);
        if (result.success) {
          alert(result.message);
          document.getElementById("settings-current-password").value = "";
          document.getElementById("settings-new-password").value = "";
          document.getElementById("settings-confirm-password").value = "";
        } else {
          alert(result.message);
        }
      });
    }

    // Clear Data
    var clearDataBtn = document.getElementById("settings-clear-data-btn");
    if (clearDataBtn) {
      clearDataBtn.addEventListener("click", clearAllData);
    }

    // Export Data
    var exportBtn = document.getElementById("settings-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportData);
    }

    // Import Data
    var importBtn = document.getElementById("settings-import-btn");
    var importInput = document.getElementById("settings-import-input");
    if (importBtn && importInput) {
      importBtn.addEventListener("click", function () {
        importInput.click();
      });
      importInput.addEventListener("change", function () {
        var file = importInput.files[0];
        if (file) {
          importData(file);
          importInput.value = "";
        }
      });
    }

    // ---- SETTINGS COLLAPSIBLE ----
    document.querySelectorAll(".settings-collapsible .settings-item-left").forEach(function (item) {
      item.addEventListener("click", function () {
        var parent = item.parentElement;
        var groupId = parent ? parent.id + "-group" : "";
        // Actually we need to find the group by the parent's next sibling
        var group = parent ? parent.nextElementSibling : null;
        if (group && group.classList.contains("settings-group")) {
          if (group.style.display === "none") {
            group.style.display = "block";
            if (parent) parent.classList.add("open");
          } else {
            group.style.display = "none";
            if (parent) parent.classList.remove("open");
          }
        }
      });
    });

    // Fix: make password change collapsible work
    var passwordSettingsItem = document.querySelector(".settings-collapsible");
    if (passwordSettingsItem) {
      var clickable = passwordSettingsItem.querySelector(".settings-item-left");
      if (clickable) {
        clickable.addEventListener("click", function () {
          var group = document.getElementById("password-group");
          var parent = passwordSettingsItem;
          if (group) {
            if (group.style.display === "none") {
              group.style.display = "block";
              parent.classList.add("open");
            } else {
              group.style.display = "none";
              parent.classList.remove("open");
            }
          }
        });
      }
    }

    // ---- SETTINGS NAVIGATION LINKS ----
    var aboutLink = document.querySelector(".settings-link[onclick*='view-about']");
    var policyLink = document.querySelector(".settings-link[onclick*='view-policy']");
    if (aboutLink) {
      aboutLink.addEventListener("click", function () { switchView("view-about"); });
    }
    if (policyLink) {
      policyLink.addEventListener("click", function () { switchView("view-policy"); });
    }

    // ---- OFFLINE ----
    window.addEventListener("offline", function () { handleOffline(true); });
    window.addEventListener("online", function () { handleOffline(false); });
  }

  /* ---------------------------------------------------------
     PWA FUNCTIONS
  --------------------------------------------------------- */
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function (err) {
          console.warn("Service worker registration failed:", err);
        });
      });
    }
  }

  function checkInstallStatus() {
    window.addEventListener("beforeinstallprompt", function (e) {
      window.deferredInstallPrompt = e;
    });
  }

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  function init() {
    try {
      seedDemoPosts();
      seedDemoClassmates();
    } catch (e) {
      console.warn("Seed data failed:", e);
    }

    initEventListeners();
    registerServiceWorker();
    checkInstallStatus();

    // Setup post toolbar
    setupPostToolbar();

    // Set initial offline banner state
    handleOffline(!navigator.onLine);

    // Prevent scrolling during splash
    document.body.classList.add("splash-active");

    // Transition from splash to main app
    setTimeout(function () {
      try {
        // Hide splash
        document.body.classList.remove("splash-active");
        var splashPage = document.getElementById("splash-page");
        if (splashPage) {
          splashPage.classList.remove("active-page");
          splashPage.style.display = "none";
        }

        if (isLoggedIn()) {
          showPage("dashboard-page");
          loadDashboard();
        } else {
          showPage("login-page");
          showLoginForm();
        }
      } catch (err) {
        console.error("Splash transition error:", err);
        document.body.classList.remove("splash-active");
        var splashPage = document.getElementById("splash-page");
        if (splashPage) {
          splashPage.classList.remove("active-page");
          splashPage.style.display = "none";
        }
        showPage("login-page");
        showLoginForm();
      }
    }, 2200);
  }

  // Expose functions for inline onclick handlers
  window.navigateTo = navigateTo;
  window.toggleSettingsGroup = toggleSettingsGroup;

  document.addEventListener("DOMContentLoaded", init);
})();
