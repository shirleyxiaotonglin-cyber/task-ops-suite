(function () {
  "use strict";

  var STORAGE_KEY = "taskops_static_v1";

  var STATUSES = ["todo", "doing", "blocked", "review", "done"];
  var STATUS_LABEL = {
    todo: "Todo",
    doing: "Doing",
    blocked: "Blocked",
    review: "Review",
    done: "Done",
  };

  function uid() {
    return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function seedState() {
    var u1 = { id: "u1", name: "管理员", email: "admin@demo.com", password: "demo123" };
    var u2 = { id: "u2", name: "项目经理", email: "manager@demo.com", password: "demo123" };
    var u3 = { id: "u3", name: "成员", email: "member@demo.com", password: "demo123" };
    var p1 = { id: "p1", name: "产品迭代 2026 Q2", description: "离线演示项目" };
    var now = new Date();
    var d7 = new Date(now.getTime() + 7 * 86400000);
    var t1 = {
      id: "task1",
      title: "任务系统 MVP",
      description: "多视图 + 协作演示",
      projectId: "p1",
      parentId: null,
      status: "doing",
      priority: "P0",
      assigneeId: "u2",
      createdById: "u1",
      startTime: now.toISOString(),
      deadline: d7.toISOString(),
      tags: ["milestone"],
      collaborators: [
        { userId: "u3", responsibility: "看板与表格" },
        { userId: "u2", responsibility: "验收" },
      ],
    };
    var t2 = {
      id: "task2",
      title: "子任务：数据持久化",
      description: "使用 localStorage",
      projectId: "p1",
      parentId: "task1",
      status: "done",
      priority: "P1",
      assigneeId: "u3",
      createdById: "u2",
      startTime: null,
      deadline: null,
      tags: [],
      collaborators: [],
    };
    return {
      users: [u1, u2, u3],
      projects: [p1],
      projectMembers: [
        { projectId: "p1", userId: "u1", role: "ADMIN" },
        { projectId: "p1", userId: "u2", role: "MANAGER" },
        { projectId: "p1", userId: "u3", role: "MEMBER" },
      ],
      tasks: [t1, t2],
      comments: [
        {
          id: "c1",
          taskId: "task1",
          userId: "u2",
          body: "进度正常。@member@demo.com 请关注看板。",
          at: new Date().toISOString(),
        },
      ],
      history: [],
    };
  }

  function getState() {
    var s = loadState();
    if (!s) {
      s = seedState();
      saveState(s);
    }
    return s;
  }

  function getUser(state, id) {
    for (var i = 0; i < state.users.length; i++) {
      if (state.users[i].id === id) return state.users[i];
    }
    return null;
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem("taskops_session");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function setSession(userId) {
    sessionStorage.setItem("taskops_session", JSON.stringify({ userId: userId }));
  }

  function clearSession() {
    sessionStorage.removeItem("taskops_session");
  }

  function badgeClass(status) {
    return "badge badge-" + status;
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseHash() {
    var raw = window.location.hash.slice(1);
    if (!raw) raw = "/";
    if (raw[0] !== "/") raw = "/" + raw;
    var parts = raw.split("/").filter(Boolean);
    return { path: parts };
  }

  function setHash(route) {
    if (!route || route[0] !== "/") route = "/" + (route || "");
    window.location.hash = "#" + route;
  }

  var app = document.getElementById("app");

  function render(html) {
    app.innerHTML = html;
    bindGlobal();
  }

  function bindGlobal() {
    var els = app.querySelectorAll("[data-nav]");
    for (var i = 0; i < els.length; i++) {
      els[i].onclick = function (e) {
        e.preventDefault();
        setHash(this.getAttribute("data-nav"));
      };
    }
  }

  function renderLogin() {
    render(
      '<div class="login-page">' +
        '<div class="card login-card">' +
        '<div class="card-title">Task Ops（离线版）</div>' +
        '<p class="muted">无需安装 Node，数据保存在本机浏览器。</p>' +
        '<form id="login-form" class="mt-1">' +
        '<div class="mb-1"><label>邮箱</label><input class="input mt-1" name="email" type="email" value="admin@demo.com" /></div>' +
        '<div class="mb-1"><label>密码</label><input class="input mt-1" name="password" type="password" value="demo123" /></div>' +
        '<button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem">登录</button>' +
        '</form>' +
        '<p class="login-hint">演示账号：admin@demo.com / demo123（与 manager@demo.com、member@demo.com 相同密码）</p>' +
        '</div></div>'
    );
    document.getElementById("login-form").onsubmit = function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var email = String(fd.get("email") || "")
        .trim()
        .toLowerCase();
      var password = String(fd.get("password") || "");
      var state = getState();
      var user = null;
      for (var i = 0; i < state.users.length; i++) {
        if (state.users[i].email === email && state.users[i].password === password) {
          user = state.users[i];
          break;
        }
      }
      if (!user) {
        alert("邮箱或密码错误");
        return;
      }
      setSession(user.id);
      setHash("/dashboard");
    };
  }

  function shell(state, user, innerHtml, title) {
    var projects = state.projects;
    var navProjects = "";
    for (var p = 0; p < projects.length; p++) {
      navProjects +=
        '<button type="button" data-nav="/project/' +
        projects[p].id +
        '" class="' +
        (title === projects[p].name ? "active" : "") +
        '">📁 ' +
        escapeHtml(projects[p].name) +
        "</button>";
    }
    return (
      '<div class="app-shell">' +
      '<aside class="sidebar">' +
      '<div class="sidebar-brand"><div class="sidebar-brand-icon">📋</div><div><div class="sidebar-brand-title">Task Ops</div><div class="sidebar-brand-sub">离线版</div></div></div>' +
      '<nav class="nav">' +
      '<button type="button" data-nav="/dashboard" class="' +
      (title === "总览" ? "active" : "") +
      '">🏠 总览</button>' +
      '<button type="button" data-nav="/my" class="' +
      (title === "我的任务" ? "active" : "") +
      '">👤 我的任务</button>' +
      '<button type="button" data-nav="/ai" class="' +
      (title === "AI 中心" ? "active" : "") +
      '">✨ AI 分析</button>' +
      '</nav>' +
      '<div class="nav-label">项目</div>' +
      '<nav class="nav">' +
      navProjects +
      "</nav>" +
      "</aside>" +
      '<div class="main-wrap">' +
      '<header class="header">' +
      '<span class="header-title">' +
      escapeHtml(title) +
      "</span>" +
      '<div class="header-spacer"></div>' +
      '<span class="header-user">' +
      escapeHtml(user.name) +
      " · " +
      escapeHtml(user.email) +
      "</span> " +
      '<button type="button" class="btn btn-sm" id="btn-logout">退出</button>' +
      "</header>" +
      '<main class="content">' +
      innerHtml +
      "</main>" +
      "</div></div>"
    );
  }

  function renderDashboard() {
    var sess = getSession();
    if (!sess) {
      setHash("/login");
      return;
    }
    var state = getState();
    var user = getUser(state, sess.userId);
    if (!user) {
      clearSession();
      setHash("/login");
      return;
    }

    var cards = "";
    for (var i = 0; i < state.projects.length; i++) {
      var pid = state.projects[i].id;
      var tasks = state.tasks.filter(function (t) {
        return t.projectId === pid;
      });
      var done = tasks.filter(function (t) {
        return t.status === "done";
      }).length;
      var blocked = tasks.filter(function (t) {
        return t.status === "blocked";
      }).length;
      var rate = tasks.length ? Math.round((done / tasks.length) * 1000) / 10 : 0;
      cards +=
        '<div class="card">' +
        '<div class="card-title">' +
        escapeHtml(state.projects[i].name) +
        "</div>" +
        "<p class=\"muted\">任务 " +
        tasks.length +
        " · 完成 " +
        done +
        " · 阻塞 " +
        blocked +
        "</p>" +
        '<div class="mb-1" style="height:8px;background:#252a36;border-radius:4px;overflow:hidden">' +
        '<div style="height:100%;width:' +
        rate +
        "%;background:#22c55e\"></div></div>" +
        '<button type="button" class="btn btn-primary btn-sm" data-nav="/project/' +
        pid +
        '">进入项目</button>' +
        "</div>";
    }

    var body =
      "<div>" +
      '<h1 class="h1">总览</h1>' +
      '<p class="sub">项目进度一览（数据仅保存在本机浏览器）</p>' +
      '<div class="grid grid-3">' +
      cards +
      "</div>" +
      "</div>";

    render(shell(state, user, body, "总览"));
    document.getElementById("btn-logout").onclick = function () {
      clearSession();
      setHash("/login");
    };
  }

  function tasksForUser(state, userId) {
    return state.tasks.filter(function (t) {
      if (t.createdById === userId || t.assigneeId === userId) return true;
      for (var i = 0; i < t.collaborators.length; i++) {
        if (t.collaborators[i].userId === userId) return true;
      }
      return false;
    });
  }

  function renderMy() {
    var sess = getSession();
    if (!sess) {
      setHash("/login");
      return;
    }
    var state = getState();
    var user = getUser(state, sess.userId);
    if (!user) {
      clearSession();
      setHash("/login");
      return;
    }
    var uid = user.id;
    var created = state.tasks.filter(function (t) {
      return t.createdById === uid;
    });
    var assigned = state.tasks.filter(function (t) {
      return t.assigneeId === uid;
    });
    var part = state.tasks.filter(function (t) {
      for (var i = 0; i < t.collaborators.length; i++) {
        if (t.collaborators[i].userId === uid) return true;
      }
      return false;
    });

    function listSection(title, arr) {
      var rows = "";
      for (var i = 0; i < arr.length; i++) {
        var pr = state.projects.find(function (p) {
          return p.id === arr[i].projectId;
        });
        rows +=
          '<tr><td><button type="button" class="btn btn-sm" style="border:none;padding:0;background:none;color:inherit;cursor:pointer;text-align:left" data-open-task="' +
          arr[i].id +
          '">' +
          escapeHtml(arr[i].title) +
          "</button></td><td>" +
          escapeHtml(pr ? pr.name : "") +
          "</td><td><span class=\"" +
          badgeClass(arr[i].status) +
          '">' +
          arr[i].status +
          "</span></td></tr>";
      }
      if (!arr.length) rows = '<tr><td colspan="3" class="muted">暂无</td></tr>';
      return (
        '<div class="card" style="margin-bottom:1rem">' +
        '<div class="card-title">' +
        title +
        "</div>" +
        '<div class="table-wrap"><table><thead><tr><th>标题</th><th>项目</th><th>状态</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div></div>"
      );
    }

    var body =
      "<div>" +
      '<h1 class="h1">我的任务</h1>' +
      '<p class="sub">创建 / 负责 / 协作</p>' +
      listSection("我创建的", created) +
      listSection("我负责的", assigned) +
      listSection("我协作的", part) +
      "</div>";

    render(shell(state, user, body, "我的任务"));
    document.getElementById("btn-logout").onclick = function () {
      clearSession();
      setHash("/login");
    };
    bindTaskOpens(state);
  }

  function bindTaskOpens(state) {
    var btns = app.querySelectorAll("[data-open-task]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function () {
        var tid = this.getAttribute("data-open-task");
        var t = state.tasks.find(function (x) {
          return x.id === tid;
        });
        if (t) openDrawer(state, t);
      };
    }
  }

  function openDrawer(state, task) {
    var assignee = getUser(state, task.assigneeId);
    var comments = state.comments.filter(function (c) {
      return c.taskId === task.id;
    });
    var hist = "";
    for (var i = 0; i < comments.length; i++) {
      var u = getUser(state, comments[i].userId);
      hist +=
        '<div class="mb-1" style="border:1px solid var(--border);border-radius:6px;padding:0.5rem;font-size:12px">' +
        "<strong>" +
        escapeHtml(u ? u.name : "") +
        "</strong>" +
        '<p style="margin:0.35rem 0 0">' +
        escapeHtml(comments[i].body) +
        "</p></div>";
    }
    var collab = "";
    for (var j = 0; j < task.collaborators.length; j++) {
      var cu = getUser(state, task.collaborators[j].userId);
      collab +=
        "<li>" +
        escapeHtml(cu ? cu.name : "") +
        " — " +
        escapeHtml(task.collaborators[j].responsibility) +
        "</li>";
    }
    var children = state.tasks.filter(function (x) {
      return x.parentId === task.id;
    });
    var ch = "";
    for (var k = 0; k < children.length; k++) {
      ch += "<li>" + escapeHtml(children[k].title) + " (" + children[k].status + ")</li>";
    }

    var overlay = document.createElement("div");
    overlay.className = "drawer-overlay";
    overlay.innerHTML =
      '<div class="drawer drawer-inner">' +
      '<button type="button" class="drawer-close" id="drawer-x">×</button>' +
      "<h2>" +
      escapeHtml(task.title) +
      "</h2>" +
      '<p class="muted"><span class="' +
      badgeClass(task.status) +
      '">' +
      task.status +
      "</span> · " +
      task.priority +
      "</p>" +
      "<p>" +
      escapeHtml(task.description || "") +
      "</p>" +
      "<h4 class=\"mt-1\">负责人</h4><p>" +
      escapeHtml(assignee ? assignee.name : "未分配") +
      "</p>" +
      "<h4 class=\"mt-1\">协作</h4><ul>" +
      (collab || "<li class=\"muted\">无</li>") +
      "</ul>" +
      "<h4 class=\"mt-1\">子任务</h4><ul>" +
      (ch || "<li class=\"muted\">无</li>") +
      "</ul>" +
      "<h4 class=\"mt-1\">评论</h4>" +
      (hist || '<p class="muted">无</p>') +
      '<div class="mt-1"><input class="input" id="new-comment" placeholder="写评论…" /></div>' +
      '<button type="button" class="btn btn-primary btn-sm mt-1" id="send-c">发送</button>' +
      "</div>";

    function close() {
      document.body.removeChild(overlay);
    }
    overlay.onclick = function (e) {
      if (e.target === overlay) close();
    };
    document.body.appendChild(overlay);
    document.getElementById("drawer-x").onclick = close;
    document.getElementById("send-c").onclick = function () {
      var inp = document.getElementById("new-comment");
      var text = (inp.value || "").trim();
      if (!text) return;
      state.comments.push({
        id: uid(),
        taskId: task.id,
        userId: getSession().userId,
        body: text,
        at: new Date().toISOString(),
      });
      saveState(state);
      close();
      route();
    };
  }

  function renderAi() {
    var sess = getSession();
    if (!sess) {
      setHash("/login");
      return;
    }
    var state = getState();
    var user = getUser(state, sess.userId);
    var pid = state.projects[0] ? state.projects[0].id : "";
    var tasks = state.tasks.filter(function (t) {
      return t.projectId === pid;
    });
    var done = tasks.filter(function (t) {
      return t.status === "done";
    }).length;
    var blocked = tasks.filter(function (t) {
      return t.status === "blocked";
    }).length;
    var report =
      "【每日简报 · 模拟】\n" +
      "项目任务数: " +
      tasks.length +
      "\n" +
      "已完成: " +
      done +
      "\n" +
      "阻塞: " +
      blocked +
      "\n" +
      "建议: 优先处理阻塞项，保持每日同步。";

    var body =
      "<div>" +
      '<h1 class="h1">AI 分析（离线模拟）</h1>' +
      '<p class="sub">不联网，根据当前数据生成简单报告</p>' +
      '<div class="card"><div class="card-title">一键日报</div><div class="pre-block">' +
      escapeHtml(report) +
      "</div></div></div>";

    render(shell(state, user, body, "AI 中心"));
    document.getElementById("btn-logout").onclick = function () {
      clearSession();
      setHash("/login");
    };
  }

  function renderProject(projectId) {
    var sess = getSession();
    if (!sess) {
      setHash("/login");
      return;
    }
    var state = getState();
    var user = getUser(state, sess.userId);
    var proj = state.projects.find(function (p) {
      return p.id === projectId;
    });
    if (!proj) {
      render('<div class="content"><p class="muted">项目不存在</p></div>');
      return;
    }

    var view = sessionStorage.getItem("taskops_view") || "kanban";
    var tasks = state.tasks.filter(function (t) {
      return t.projectId === projectId;
    });

    var tabs =
      '<div class="tabs">' +
      ['kanban', 'tree', 'timeline', 'calendar', 'table']
        .map(function (v) {
          return (
            '<button type="button" class="btn btn-sm ' +
            (view === v ? "btn-primary" : "") +
            '" data-view="' +
            v +
            '">' +
            ({ kanban: "看板", tree: "树", timeline: "时间线", calendar: "周历", table: "表格" }[v] || v) +
            "</button>"
          );
        })
        .join("") +
      "</div>";

    var panel = "";
    if (view === "kanban") panel = renderKanban(state, tasks, projectId);
    else if (view === "tree") panel = renderTree(state, tasks);
    else if (view === "timeline") panel = renderTimeline(state, tasks);
    else if (view === "calendar") panel = renderCalendar(state, tasks);
    else panel = renderTable(state, tasks, projectId);

    var body =
      "<div>" +
      '<p class="muted mb-1"><a href="#" data-nav="/dashboard">总览</a> / ' +
      escapeHtml(proj.name) +
      "</p>" +
      '<h1 class="h1">' +
      escapeHtml(proj.name) +
      "</h1>" +
      '<p class="sub">切换视图 · 拖拽看板可改状态 · 点击任务可看详情</p>' +
      '<div class="flex mb-1"><button type="button" class="btn btn-primary btn-sm" id="btn-new-task">新建任务</button></div>' +
      tabs +
      panel +
      "</div>";

    render(shell(state, user, body, proj.name));
    document.getElementById("btn-logout").onclick = function () {
      clearSession();
      setHash("/login");
    };

    var vbtns = app.querySelectorAll("[data-view]");
    for (var i = 0; i < vbtns.length; i++) {
      vbtns[i].onclick = function () {
        sessionStorage.setItem("taskops_view", this.getAttribute("data-view"));
        setHash("/project/" + projectId);
      };
    }

    document.getElementById("btn-new-task").onclick = function () {
      var title = prompt("任务标题");
      if (!title) return;
      var t = {
        id: uid(),
        title: title,
        description: "",
        projectId: projectId,
        parentId: null,
        status: "todo",
        priority: "P2",
        assigneeId: user.id,
        createdById: user.id,
        startTime: null,
        deadline: null,
        tags: [],
        collaborators: [],
      };
      state.tasks.push(t);
      saveState(state);
      setHash("/project/" + projectId);
    };

    bindKanbanDnD(state, projectId);
    bindTaskOpens(state);
  }

  function renderKanban(state, tasks, projectId) {
    var cols = {};
    STATUSES.forEach(function (s) {
      cols[s] = [];
    });
    tasks.forEach(function (t) {
      if (cols[t.status]) cols[t.status].push(t);
    });
    var html =
      '<div class="kanban" id="kanban-root" data-pid="' +
      escapeHtml(projectId) +
      '">';
    STATUSES.forEach(function (st) {
      html +=
        '<div class="kanban-col" data-status="' +
        st +
        '">' +
        '<div class="kanban-col-head">' +
        STATUS_LABEL[st] +
        " · " +
        cols[st].length +
        "</div>" +
        '<div class="kanban-col-body" data-drop="' +
        st +
        '">';
      for (var i = 0; i < cols[st].length; i++) {
        var t = cols[st][i];
        var as = getUser(state, t.assigneeId);
        html +=
          '<button type="button" class="task-card" draggable="true" data-task-id="' +
          t.id +
          '">' +
          '<div class="task-card-title">' +
          escapeHtml(t.title) +
          "</div>" +
          '<div class="task-card-meta"><span class="badge-p muted">' +
          t.priority +
          "</span>" +
          (as ? '<span class="muted">' + escapeHtml(as.name) + "</span>" : "") +
          "</div></button>";
      }
      html += "</div></div>";
    });
    html += "</div>";
    return html;
  }

  function bindKanbanDnD(state, projectId) {
    var dragId = null;
    var cards = app.querySelectorAll(".task-card[draggable]");
    var drops = app.querySelectorAll("[data-drop]");
    for (var i = 0; i < cards.length; i++) {
      cards[i].ondragstart = function (e) {
        dragId = this.getAttribute("data-task-id");
        e.dataTransfer.effectAllowed = "move";
      };
      cards[i].ondragend = function () {
        dragId = null;
      };
      cards[i].onclick = function (e) {
        e.preventDefault();
        var tid = this.getAttribute("data-task-id");
        var t = state.tasks.find(function (x) {
          return x.id === tid;
        });
        if (t) openDrawer(state, t);
      };
    }
    for (var j = 0; j < drops.length; j++) {
      drops[j].ondragover = function (e) {
        e.preventDefault();
        this.classList.add("drag-over");
      };
      drops[j].ondragleave = function () {
        this.classList.remove("drag-over");
      };
      drops[j].ondrop = function (e) {
        e.preventDefault();
        this.classList.remove("drag-over");
        if (!dragId) return;
        var newStatus = this.getAttribute("data-drop");
        var t = state.tasks.find(function (x) {
          return x.id === dragId;
        });
        if (t && newStatus && t.status !== newStatus) {
          t.status = newStatus;
          saveState(state);
        }
        setHash("/project/" + projectId);
      };
    }
  }

  function buildTree(tasks) {
    var map = {};
    var roots = [];
    tasks.forEach(function (t) {
      map[t.id] = { task: t, children: [] };
    });
    tasks.forEach(function (t) {
      if (t.parentId && map[t.parentId]) {
        map[t.parentId].children.push(map[t.id]);
      } else {
        roots.push(map[t.id]);
      }
    });
    return roots;
  }

  function renderTreeRows(nodes, depth) {
    var h = "";
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var pad = depth * 16;
      h +=
        '<div class="tree-row" style="padding-left:' +
        pad +
        'px"><button type="button" data-open-task="' +
        n.task.id +
        '" class="btn btn-sm" style="border:none;background:none;padding:0;cursor:pointer;color:inherit">' +
        escapeHtml(n.task.title) +
        '</button> <span class="' +
        badgeClass(n.task.status) +
        '">' +
        n.task.status +
        "</span></div>";
      if (n.children.length) h += renderTreeRows(n.children, depth + 1);
    }
    return h;
  }

  function renderTree(state, tasks) {
    var roots = buildTree(tasks);
    return (
      '<div class="card">' +
      '<div class="card-title">任务树</div>' +
      renderTreeRows(roots, 0) +
      "</div>"
    );
  }

  function renderTimeline(state, tasks) {
    var now = new Date();
    var minT = new Date(now.getTime() - 3 * 86400000);
    var maxT = new Date(now.getTime() + 14 * 86400000);
    var range = maxT - minT || 1;
    var rows = "";
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var start = t.startTime ? new Date(t.startTime) : t.deadline ? new Date(new Date(t.deadline).getTime() - 5 * 86400000) : minT;
      var end = t.deadline ? new Date(t.deadline) : new Date(start.getTime() + 3 * 86400000);
      var left = ((start - minT) / range) * 100;
      var w = Math.max(3, ((end - start) / range) * 100);
      var color = { done: "#22c55e", doing: "#3b82f6", todo: "#eab308", blocked: "#ef4444", review: "#a855f7" }[t.status] || "#666";
      rows +=
        '<div class="timeline-row">' +
        '<div class="timeline-label"><button type="button" data-open-task="' +
        t.id +
        '" style="border:none;background:none;color:inherit;cursor:pointer;text-align:left">' +
        escapeHtml(t.title) +
        "</button></div>" +
        '<div class="timeline-track"><div class="timeline-bar" style="left:' +
        left +
        "%;width:" +
        w +
        "%;background:" +
        color +
        '" data-open-task="' +
        t.id +
        '">' +
        escapeHtml(t.title) +
        "</div></div></div>";
    }
    if (!tasks.length) rows = '<p class="muted">暂无任务</p>';
    return '<div class="timeline">' + rows + "</div>";
  }

  function renderCalendar(state, tasks) {
    var anchor = new Date();
    var day = anchor.getDay();
    var monday = new Date(anchor);
    monday.setDate(anchor.getDate() - ((day + 6) % 7));
    var days = [];
    for (var d = 0; d < 7; d++) {
      var x = new Date(monday);
      x.setDate(monday.getDate() + d);
      days.push(x);
    }
    var cells = "";
    var dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    for (var i = 0; i < days.length; i++) {
      var di = days[i];
      var items = "";
      for (var j = 0; j < tasks.length; j++) {
        var t = tasks[j];
        var dt = t.deadline ? new Date(t.deadline) : t.startTime ? new Date(t.startTime) : null;
        if (!dt) continue;
        if (
          dt.getFullYear() === di.getFullYear() &&
          dt.getMonth() === di.getMonth() &&
          dt.getDate() === di.getDate()
        ) {
          items +=
            '<div class="mb-1"><button type="button" class="btn btn-sm" style="width:100%;text-align:left" data-open-task="' +
            t.id +
            '">' +
            escapeHtml(t.title) +
            "</button></div>";
        }
      }
      cells +=
        '<div class="cal-day"><div class="cal-day-h">' +
        dayNames[i] +
        "<br/>" +
        (di.getMonth() + 1) +
        "/" +
        di.getDate() +
        "</div>" +
        items +
        "</div>";
    }
    return '<div class="cal-week">' + cells + "</div>";
  }

  function renderTable(state, tasks, projectId) {
    var rows = "";
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var as = getUser(state, t.assigneeId);
      rows +=
        "<tr>" +
        "<td><button type=\"button\" data-open-task=\"" +
        t.id +
        '" style="border:none;background:none;cursor:pointer;color:inherit">' +
        escapeHtml(t.title) +
        "</button></td>" +
        '<td><span class="' +
        badgeClass(t.status) +
        '">' +
        t.status +
        "</span></td>" +
        "<td>" +
        t.priority +
        "</td>" +
        "<td>" +
        (t.deadline ? new Date(t.deadline).toLocaleDateString() : "—") +
        "</td>" +
        "<td>" +
        escapeHtml(as ? as.name : "—") +
        "</td>" +
        "<td>" +
        '<button type="button" class="btn btn-sm" data-quick="' +
        t.id +
        '" data-st="doing">doing</button> ' +
        '<button type="button" class="btn btn-sm" data-quick="' +
        t.id +
        '" data-st="done">done</button>' +
        "</td></tr>";
    }
    if (!tasks.length) rows = '<tr><td colspan="6" class="muted">暂无</td></tr>';
    var html =
      '<div class="table-wrap"><table><thead><tr><th>标题</th><th>状态</th><th>优先级</th><th>截止</th><th>负责人</th><th>快捷</th></tr></thead><tbody>' +
      rows +
      "</tbody></table></div>";

    setTimeout(function () {
      var q = app.querySelectorAll("[data-quick]");
      for (var k = 0; k < q.length; k++) {
        q[k].onclick = function () {
          var id = this.getAttribute("data-quick");
          var st = this.getAttribute("data-st");
          var task = state.tasks.find(function (x) {
            return x.id === id;
          });
          if (task) {
            task.status = st;
            saveState(state);
            setHash("/project/" + projectId);
          }
        };
      }
      bindTaskOpens(state);
    }, 0);

    return html;
  }

  function route() {
    var h = parseHash();
    var parts = h.path;
    if (!getSession() && parts[0] !== "login") {
      setHash("/login");
      return;
    }
    if (parts[0] === "login" || parts.length === 0) {
      if (getSession()) setHash("/dashboard");
      else renderLogin();
      return;
    }
    if (!getSession()) {
      setHash("/login");
      return;
    }
    if (parts[0] === "dashboard" || parts.length === 0) {
      renderDashboard();
      return;
    }
    if (parts[0] === "my") {
      renderMy();
      return;
    }
    if (parts[0] === "ai") {
      renderAi();
      return;
    }
    if (parts[0] === "project" && parts[1]) {
      renderProject(parts[1]);
      return;
    }
    renderDashboard();
  }

  window.addEventListener("hashchange", route);
  if (!window.location.hash) window.location.hash = "#/login";
  route();
})();
