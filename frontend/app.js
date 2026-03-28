const state = {
  user: null,
  profile: null,
  candidates: [],
  selectedCandidate: null,
  view: "landing",
  activeCandidateTab: "overview",
  activeRecruiterTab: "dashboard",
};

const app = document.getElementById("app");
const loginTemplate = document.getElementById("loginTemplate");
const modeCandidate = document.getElementById("modeCandidate");
const modeRecruiter = document.getElementById("modeRecruiter");
const logoutBtn = document.getElementById("logoutBtn");

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const contentType = response.headers.get("Content-Type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) throw new Error(payload.error || payload.detail || payload || "Request failed");
  return payload;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function option(value, selectedValue) {
  return `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${value}</option>`;
}

function candidateNavItem(key, step, label) {
  return `
    <button class="nav-item ${state.activeCandidateTab === key ? "active" : ""}" data-tab="${key}">
      <span>${step}. ${label}</span>
      <span>${state.activeCandidateTab === key ? "Open" : "View"}</span>
    </button>
  `;
}

function render() {
  logoutBtn.classList.toggle("hidden", !state.user);
  if (!state.user) {
    renderLogin();
    return;
  }
  if (state.view === "recruiter") {
    renderRecruiter();
    return;
  }
  renderCandidate();
}

function renderLogin() {
  app.innerHTML = "";
  app.appendChild(loginTemplate.content.cloneNode(true));
  const loginForm = document.getElementById("loginForm");
  const candidateDemoBtn = document.getElementById("candidateDemoBtn");
  const recruiterLoginBtn = document.getElementById("recruiterLoginBtn");
  const loginError = document.getElementById("loginError");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const formData = new FormData(loginForm);
    try {
      await login({
        email: formData.get("email"),
        password: formData.get("password"),
      });
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  candidateDemoBtn.addEventListener("click", async () => {
    loginError.textContent = "";
    try {
      await loginAsDemo("candidate");
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  recruiterLoginBtn.addEventListener("click", async () => {
    loginError.textContent = "";
    try {
      await loginAsDemo("recruiter");
    } catch (error) {
      loginError.textContent = error.message;
    }
  });
}

async function login(credentials) {
  const payload = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  state.user = payload.user;
  state.view = payload.user.role === "recruiter" ? "recruiter" : "candidate";
  if (state.view === "candidate") {
    await loadProfile();
  } else {
    await loadRecruiter();
  }
  render();
}

async function loginAsDemo(role) {
  const payload = await api("/api/auth/demo-login", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  state.user = payload.user;
  state.view = payload.user.role === "recruiter" ? "recruiter" : "candidate";
  if (state.view === "candidate") {
    await loadProfile();
  } else {
    await loadRecruiter();
  }
  render();
}

async function initializeSession() {
  try {
    const payload = await api("/api/session");
    state.user = payload.user;
    if (state.user?.role === "candidate") {
      state.view = "candidate";
      await loadProfile();
    } else if (state.user?.role === "recruiter") {
      state.view = "recruiter";
      await loadRecruiter();
    }
  } catch (error) {
    console.error(error);
  } finally {
    render();
  }
}

async function loadProfile() {
  const payload = await api("/api/candidate/profile");
  state.profile = payload.profile;
}

async function loadRecruiter() {
  const payload = await api("/api/recruiter/candidates");
  state.candidates = payload.candidates;
  state.selectedCandidate = state.selectedCandidate || payload.candidates[0] || null;
}

function renderCandidateOverview(profile) {
  return `
    <section class="story-card">
      <p class="eyebrow">Problem understanding</p>
      <h3>Why resume-based hiring breaks down</h3>
      <div class="builder-grid">
        <article>
          <ul class="bullet-list">
            <li>PDF resumes hide structured evidence inside inconsistent formatting.</li>
            <li>Recruiters compare candidates through noisy documents instead of comparable fields.</li>
            <li>Candidates spend time polishing layouts rather than clarifying actual impact.</li>
          </ul>
        </article>
        <article>
          <ul class="bullet-list">
            <li>AI guidance turns open-ended stories into role-relevant, recruiter-friendly signals.</li>
            <li>Structured capture improves fairness, completion tracking, and recruiter filtering.</li>
            <li>Generated summaries, skill suggestions, and role recommendations reduce blank-page anxiety.</li>
          </ul>
        </article>
      </div>
    </section>
    <section class="stats-grid">
      <article><strong>Onboarding</strong><span>Welcome, sign in, AI introduction, first action is profile creation.</span></article>
      <article><strong>Profile Builder</strong><span>Tell your story once, let AI structure it into skills, projects, and summaries.</span></article>
      <article><strong>Review & Share</strong><span>See progress, export a generated resume, and share a clean public profile link.</span></article>
    </section>
  `;
}

function renderOnboarding(profile) {
  const onboarding = profile.onboarding;
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Welcome / Onboarding</p>
          <h3>Guide the candidate before asking for details.</h3>
        </div>
        <span class="pill">Screen 2 of 7</span>
      </div>
      <form id="onboardingForm" class="stack gap-md">
        <div class="two-col">
          <label>Career stage<select name="careerStage">${option("Student", onboarding.careerStage)}${option("Fresher", onboarding.careerStage)}${option("Early professional", onboarding.careerStage)}</select></label>
          <label>Preferred role<input name="preferredRole" value="${escapeHtml(onboarding.preferredRole)}" /></label>
        </div>
        <div class="two-col">
          <label>Preferred industries<input name="preferredIndustries" value="${escapeHtml(onboarding.preferredIndustries)}" /></label>
          <label>Work style<input name="workStyle" value="${escapeHtml(onboarding.workStyle)}" /></label>
        </div>
        <label>AI introduction note<textarea name="intro">${escapeHtml(onboarding.intro)}</textarea></label>
        <div class="split-actions">
          <button type="submit" class="primary-btn">Save Onboarding</button>
          <button type="button" id="jumpBuilderBtn" class="secondary-btn">Continue to AI Builder</button>
        </div>
      </form>
    </section>
  `;
}

function renderBuilder(profile) {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">AI Profile Builder</p>
          <h3>Replace resume upload with guided storytelling.</h3>
        </div>
        <span class="pill">Screen 3 of 7</span>
      </div>
      <div class="builder-grid">
        <form id="builderForm" class="stack gap-md">
          <label>Tell me about your experience<textarea name="builderInput">${escapeHtml(profile.builderInput)}</textarea></label>
          <label>Target role<input name="preferredRole" value="${escapeHtml(profile.basics.targetRole)}" /></label>
          <div class="split-actions">
            <button type="submit" class="primary-btn">Generate Structured Draft</button>
            <button type="button" id="seedBuilderBtn" class="ghost-btn">Use Sample Prompt</button>
          </div>
        </form>
        <div class="insight-card stack gap-md">
          <div><p class="eyebrow">AI output</p><h4>Summary</h4><p>${escapeHtml(profile.aiDraft.summary)}</p></div>
          <div><h4>Parsed experience</h4><ul class="bullet-list">${profile.aiDraft.parsedExperience.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
          <div><h4>Suggested skills</h4><ul class="tag-list">${profile.aiDraft.suggestedSkills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("")}</ul></div>
          <div class="stats-grid">
            <article><strong>${profile.aiDraft.confidence}%</strong><span>AI confidence in structured draft</span></article>
            <article><strong>${escapeHtml(profile.aiDraft.recommendedRoles[0] || "Ready")}</strong><span>Top role recommendation</span></article>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderDetails(profile) {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Skills / Experience Input</p>
          <h3>Structured data capture with recruiter-friendly fields.</h3>
        </div>
        <span class="pill">Screen 4 of 7</span>
      </div>
      <form id="detailsForm" class="stack gap-md">
        <div class="two-col">
          <label>Full name<input name="fullName" value="${escapeHtml(profile.basics.fullName)}" /></label>
          <label>Headline<input name="headline" value="${escapeHtml(profile.basics.headline)}" /></label>
        </div>
        <div class="two-col">
          <label>Location<input name="location" value="${escapeHtml(profile.basics.location)}" /></label>
          <label>Share slug<input name="shareSlug" value="${escapeHtml(profile.basics.shareSlug)}" /></label>
        </div>
        <label>Skills<textarea name="skills">${escapeHtml(profile.skills.join(", "))}</textarea></label>
        <label>Experience<textarea name="experience">${escapeHtml(profile.experience.map((item) => `${item.role} | ${item.company} | ${item.duration} | ${item.highlights}`).join("\n"))}</textarea></label>
        <label>Projects<textarea name="projects">${escapeHtml(profile.projects.map((item) => `${item.name} | ${item.impact}`).join("\n"))}</textarea></label>
        <button type="submit" class="primary-btn">Auto-save Structured Profile</button>
      </form>
    </section>
  `;
}

function renderReview(profile) {
  return `
    <section class="panel stack gap-md">
      <div class="section-head">
        <div>
          <p class="eyebrow">Profile Preview</p>
          <h3>Review what recruiters will actually compare.</h3>
        </div>
        <span class="pill">Screen 5 of 7</span>
      </div>
      <div class="detail-grid">
        <article class="comparison-card stack gap-sm">
          <header>
            <div><h4>${escapeHtml(profile.basics.fullName)}</h4><p class="muted">${escapeHtml(profile.basics.headline)} • ${escapeHtml(profile.basics.location)}</p></div>
            <span class="score"><strong>${profile.completion}%</strong>ready</span>
          </header>
          <p>${escapeHtml(profile.aiDraft.summary)}</p>
          <ul class="tag-list">${profile.skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("")}</ul>
        </article>
        <article class="comparison-card stack gap-sm">
          <h4>AI recommendations</h4>
          <ul class="bullet-list">${profile.aiDraft.recommendedRoles.map((role) => `<li>${escapeHtml(role)}</li>`).join("")}</ul>
          <p class="callout">Progress tracking and auto-save reduce abandonment during profile creation.</p>
          <div class="share-box"><span class="chip">Export ready</span><a class="ghost-btn" href="${profile.exportUrl}">Download resume</a></div>
        </article>
      </div>
      <div class="share-box"><strong>Shareable profile link</strong><code>${escapeHtml(profile.shareUrl)}</code></div>
      <div class="split-actions"><button id="goRecruiterPreview" class="secondary-btn">Open Recruiter View</button></div>
    </section>
  `;
}

function renderCandidate() {
  const profile = state.profile;
  const activeTab = state.activeCandidateTab;
  const tabContent = {
    overview: renderCandidateOverview(profile),
    onboarding: renderOnboarding(profile),
    builder: renderBuilder(profile),
    details: renderDetails(profile),
    review: renderReview(profile),
  }[activeTab];

  app.innerHTML = `
    <section class="workspace-grid">
      <aside class="nav-card">
        <p class="eyebrow">Candidate Journey</p>
        <h2>${escapeHtml(profile.basics.fullName)}</h2>
        <p class="muted">${escapeHtml(profile.basics.headline)}</p>
        <div class="progress-bar"><span style="width:${profile.completion}%"></span></div>
        <p class="kicker">${profile.completion}% complete • ${escapeHtml(profile.status)}</p>
        <div class="nav-list">
          ${candidateNavItem("overview", "1", "Welcome")}
          ${candidateNavItem("onboarding", "2", "Onboarding")}
          ${candidateNavItem("builder", "3", "AI Profile Builder")}
          ${candidateNavItem("details", "4", "Skills & Experience")}
          ${candidateNavItem("review", "5", "Profile Review")}
        </div>
      </aside>
      <section class="stack gap-lg">
        <div class="toolbar">
          <div><p class="eyebrow">Candidate workspace</p><h2>Build once, share everywhere.</h2></div>
          <div class="chip-row"><span class="pill">Auto-save enabled</span><span class="pill">Last updated ${formatDate(profile.updatedAt)}</span></div>
        </div>
        ${tabContent}
      </section>
    </section>
  `;
  attachCandidateEvents();
}

function renderRecruiterDashboard(selected) {
  return `
    <section class="recruiter-grid">
      <article class="panel stack gap-md">
        <div class="section-head">
          <div><p class="eyebrow">Candidate list</p><h3>Screen 6 of 7</h3></div>
          <span class="pill">${state.candidates.length} candidates</span>
        </div>
        <div class="card-grid">
          ${state.candidates.map((candidate) => `
            <button class="candidate-card stack gap-sm" data-candidate="${candidate.id}">
              <header>
                <div><h4>${escapeHtml(candidate.name)}</h4><p class="muted">${escapeHtml(candidate.targetRole)}</p></div>
                <span class="score"><strong>${candidate.matchScore}</strong>match</span>
              </header>
              <p>${escapeHtml(candidate.summary)}</p>
              <ul class="tag-list">${candidate.skills.slice(0, 4).map((skill) => `<li>${escapeHtml(skill)}</li>`).join("")}</ul>
            </button>
          `).join("")}
        </div>
      </article>
      <article class="panel stack gap-md">
        <div class="section-head">
          <div><p class="eyebrow">Candidate profile</p><h3>Screen 7 of 7</h3></div>
          <button class="primary-btn" id="toggleShortlistBtn">${selected.shortlisted ? "Remove from shortlist" : "Add to shortlist"}</button>
        </div>
        <div class="comparison-card stack gap-md">
          <header>
            <div><h4>${escapeHtml(selected.name)}</h4><p class="muted">${escapeHtml(selected.headline)} • ${escapeHtml(selected.location)}</p></div>
            <span class="score"><strong>${selected.matchScore}</strong>match</span>
          </header>
          <p>${escapeHtml(selected.summary)}</p>
          <div><h4>Strengths highlighted by AI</h4><ul class="bullet-list">${selected.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
          <div><h4>Experience snapshots</h4><ul class="bullet-list">${selected.experience.map((item) => `<li>${escapeHtml(item.role)} at ${escapeHtml(item.company)}: ${escapeHtml(item.highlights)}</li>`).join("")}</ul></div>
        </div>
      </article>
    </section>
  `;
}

function renderComparison() {
  return `
    <section class="panel stack gap-md">
      <div class="section-head"><div><p class="eyebrow">Compare candidates</p><h3>Structured comparison without resume parsing.</h3></div></div>
      <div class="compare-strip">
        ${state.candidates.map((candidate) => `
          <article class="comparison-card">
            <header>
              <div><h4>${escapeHtml(candidate.name)}</h4><p class="muted">${escapeHtml(candidate.targetRole)}</p></div>
              <span class="score"><strong>${candidate.matchScore}</strong>match</span>
            </header>
            <p><strong>Completion:</strong> ${candidate.completion}%</p>
            <p><strong>Top skills:</strong> ${escapeHtml(candidate.skills.slice(0, 3).join(", "))}</p>
            <p><strong>Projects:</strong> ${escapeHtml(candidate.projects.map((item) => item.name).join(", "))}</p>
            <p><strong>Updated:</strong> ${formatDate(candidate.updatedAt)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderShortlist(shortlist) {
  return `
    <section class="panel stack gap-md">
      <div class="section-head">
        <div><p class="eyebrow">Shortlist / Action Screen</p><h3>Recruiter decisions with a persistent shortlist.</h3></div>
        <span class="pill">${shortlist.length} shortlisted</span>
      </div>
      <div class="shortlist-stack">
        ${shortlist.length ? shortlist.map((candidate) => `
          <article class="shortlist-card">
            <header><div><h4>${escapeHtml(candidate.name)}</h4><p class="muted">${escapeHtml(candidate.targetRole)}</p></div><span class="chip">Ready for review</span></header>
            <p>${escapeHtml(candidate.summary)}</p>
          </article>
        `).join("") : '<p class="muted">No shortlisted candidates yet. Open Candidate List and add one.</p>'}
      </div>
    </section>
  `;
}

function renderRecruiter() {
  const selected = state.selectedCandidate || state.candidates[0];
  const shortlist = state.candidates.filter((candidate) => candidate.shortlisted);
  app.innerHTML = `
    <section class="stack gap-lg">
      <div class="toolbar">
        <div><p class="eyebrow">Recruiter workspace</p><h2>Compare structured candidates, not PDFs.</h2></div>
        <div class="tab-row">
          <button class="ghost-btn ${state.activeRecruiterTab === "dashboard" ? "active" : ""}" data-rtab="dashboard">Candidate List</button>
          <button class="ghost-btn ${state.activeRecruiterTab === "compare" ? "active" : ""}" data-rtab="compare">Compare</button>
          <button class="ghost-btn ${state.activeRecruiterTab === "shortlist" ? "active" : ""}" data-rtab="shortlist">Shortlist</button>
        </div>
      </div>
      ${state.activeRecruiterTab === "dashboard" ? renderRecruiterDashboard(selected) : state.activeRecruiterTab === "compare" ? renderComparison() : renderShortlist(shortlist)}
    </section>
  `;
  attachRecruiterEvents();
}

async function saveProfile(payload) {
  const response = await api("/api/candidate/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  state.profile = response.profile;
  render();
}

function attachCandidateEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCandidateTab = button.dataset.tab;
      render();
    });
  });

  document.getElementById("jumpBuilderBtn")?.addEventListener("click", () => {
    state.activeCandidateTab = "builder";
    render();
  });

  document.getElementById("goRecruiterPreview")?.addEventListener("click", async () => {
    state.view = "recruiter";
    await loadRecruiter();
    render();
  });

  document.getElementById("seedBuilderBtn")?.addEventListener("click", () => {
    const textarea = document.querySelector("#builderForm textarea[name='builderInput']");
    textarea.value = "I interned with a hiring platform where I redesigned candidate onboarding, improved profile completion, and worked with recruiters to surface better candidate signals. I also built a university project using AI to suggest interview questions and summarize strengths.";
  });

  document.getElementById("onboardingForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    await saveProfile({
      onboarding: {
        careerStage: form.get("careerStage"),
        preferredRole: form.get("preferredRole"),
        preferredIndustries: form.get("preferredIndustries"),
        workStyle: form.get("workStyle"),
        intro: form.get("intro"),
      },
      basics: { targetRole: form.get("preferredRole") },
    });
  });

  document.getElementById("builderForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = await api("/api/candidate/profile/analyze", {
      method: "POST",
      body: JSON.stringify({
        builderInput: form.get("builderInput"),
        preferredRole: form.get("preferredRole"),
      }),
    });
    state.profile = payload.profile;
    state.activeCandidateTab = "details";
    render();
  });

  document.getElementById("detailsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const experience = String(form.get("experience")).split("\n").map((line) => line.split("|").map((item) => item.trim())).filter((parts) => parts[0]).map((parts, index) => ({
      id: `exp-${index + 1}`,
      role: parts[0] || "",
      company: parts[1] || "",
      duration: parts[2] || "",
      highlights: parts[3] || "",
    }));
    const projects = String(form.get("projects")).split("\n").map((line) => line.split("|").map((item) => item.trim())).filter((parts) => parts[0]).map((parts, index) => ({
      id: `proj-${index + 1}`,
      name: parts[0] || "",
      impact: parts[1] || "",
    }));

    await saveProfile({
      basics: {
        fullName: form.get("fullName"),
        headline: form.get("headline"),
        location: form.get("location"),
        shareSlug: form.get("shareSlug"),
      },
      skills: form.get("skills"),
      experience,
      projects,
    });
    state.activeCandidateTab = "review";
    render();
  });
}

function attachRecruiterEvents() {
  document.querySelectorAll("[data-rtab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeRecruiterTab = button.dataset.rtab;
      render();
    });
  });

  document.querySelectorAll("[data-candidate]").forEach((button) => {
    button.addEventListener("click", async () => {
      const payload = await api(`/api/recruiter/candidates/${button.dataset.candidate}`);
      state.selectedCandidate = payload.candidate;
      render();
    });
  });

  document.getElementById("toggleShortlistBtn")?.addEventListener("click", async () => {
    await api("/api/recruiter/shortlist", {
      method: "POST",
      body: JSON.stringify({ candidateId: state.selectedCandidate.id }),
    });
    await loadRecruiter();
    const selected = state.candidates.find((candidate) => candidate.id === state.selectedCandidate.id);
    if (selected) state.selectedCandidate = selected;
    state.activeRecruiterTab = "shortlist";
    render();
  });
}

modeCandidate.addEventListener("click", async () => {
  if (!state.user) return;
  if (state.user.role !== "candidate") return;
  state.view = "candidate";
  await loadProfile();
  render();
});

modeRecruiter.addEventListener("click", async () => {
  if (!state.user) return;
  state.view = "recruiter";
  await loadRecruiter();
  render();
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  state.user = null;
  state.profile = null;
  state.candidates = [];
  state.selectedCandidate = null;
  state.view = "landing";
  state.activeCandidateTab = "overview";
  state.activeRecruiterTab = "dashboard";
  render();
});

initializeSession();
