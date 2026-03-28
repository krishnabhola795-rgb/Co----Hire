const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
const ENV_PATH = path.join(__dirname, "..", ".env");
const sessions = new Map();

loadEnvFile(ENV_PATH);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const demoUsers = [
  {
    id: "candidate-demo",
    email: process.env.CANDIDATE_DEMO_EMAIL || "candidate@example.com",
    password: process.env.CANDIDATE_DEMO_PASSWORD || "ChangeMe123!",
    role: "candidate",
    name: "Aarav Mehta",
    title: "AI Product Analyst",
  },
  {
    id: "recruiter-demo",
    email: process.env.RECRUITER_DEMO_EMAIL || "recruiter@example.com",
    password: process.env.RECRUITER_DEMO_PASSWORD || "ChangeMe123!",
    role: "recruiter",
    name: "Naina Kapoor",
    title: "Hiring Manager",
  },
];

const profileStore = {
  "candidate-demo": {
    basics: {
      fullName: "Aarav Mehta",
      headline: "AI Product Analyst",
      location: "Bengaluru, India",
      targetRole: "Associate Product Manager",
      shareSlug: "aarav-mehta-ai-profile",
    },
    onboarding: {
      careerStage: "Early professional",
      preferredRole: "Associate Product Manager",
      preferredIndustries: "HR tech, AI tooling, SaaS",
      workStyle: "Hybrid",
      intro:
        "I turn ambiguous user problems into product experiments, especially where AI can remove repetitive steps and improve candidate experience.",
    },
    builderInput:
      "I worked as a product analyst intern at TalentBridge where I mapped recruiter pain points, designed a candidate intake workflow, and improved completion by 28%. At college I led a team building an interview prep tool using structured skill assessments and role suggestions. I enjoy turning messy stories into clean systems.",
    aiDraft: {
      summary:
        "Product-minded early professional with hands-on experience improving hiring workflows, structured candidate data capture, and AI-assisted guidance.",
      parsedExperience: [
        "Product Analyst Intern at TalentBridge",
        "Led a college project for AI interview preparation",
      ],
      suggestedSkills: [
        "Product Thinking",
        "User Research",
        "Workflow Design",
        "Prompt Writing",
        "SQL",
        "Dashboarding",
      ],
      suggestedProjects: [
        "AI interview prep assistant",
        "Recruiter dashboard redesign",
      ],
      recommendedRoles: [
        "Associate Product Manager",
        "Product Analyst",
        "HR Tech Operations Analyst",
      ],
      confidence: 88,
    },
    experience: [
      {
        id: "exp-1",
        role: "Product Analyst Intern",
        company: "TalentBridge",
        duration: "Jan 2025 - Jun 2025",
        highlights:
          "Mapped recruiter workflows, redesigned candidate intake, and improved profile completion by 28%.",
      },
      {
        id: "exp-2",
        role: "Product Strategy Lead",
        company: "University Innovation Cell",
        duration: "Aug 2024 - Dec 2024",
        highlights:
          "Led a 4-person team building an AI interview prep tool with personalized question suggestions.",
      },
    ],
    skills: [
      "Product Thinking",
      "User Research",
      "Prompt Design",
      "SQL",
      "Figma",
      "Analytics",
    ],
    projects: [
      {
        id: "proj-1",
        name: "Interview Prep Copilot",
        impact:
          "Built a structured interview-prep workflow that recommended role-based practice sets and generated learning summaries.",
      },
      {
        id: "proj-2",
        name: "Candidate Funnel Diagnostics",
        impact:
          "Created a drop-off dashboard to help recruiters identify profile completion bottlenecks.",
      },
    ],
    completion: 84,
    status: "Profile saved 14 seconds ago",
    exportUrl: "/api/export/candidate-demo",
    shareUrl: "https://anshumat.demo/profile/aarav-mehta-ai-profile",
    updatedAt: new Date().toISOString(),
  },
};

const recruiterStore = {
  shortlist: ["candidate-demo"],
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, statusCode, body, type = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((acc, item) => {
    const [key, ...rest] = item.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function getSession(req) {
  const token = parseCookies(req).session;
  if (!token || !sessions.has(token)) return null;
  return sessions.get(token);
}

function setSession(res, user) {
  const token = `session-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  sessions.set(token, { userId: user.id, role: user.role, email: user.email });
  res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Lax`);
}

function clearSession(req, res) {
  const token = parseCookies(req).session;
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
}

function userById(userId) {
  return demoUsers.find((user) => user.id === userId);
}

function computeCompletion(profile) {
  let score = 0;
  if (profile.basics?.fullName) score += 15;
  if (profile.onboarding?.intro) score += 10;
  if (profile.aiDraft?.summary) score += 15;
  if (profile.experience?.length) score += 20;
  if (profile.skills?.length >= 4) score += 15;
  if (profile.projects?.length) score += 15;
  if (profile.shareUrl) score += 10;
  return Math.min(score, 100);
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAiDraft(freeText, preferredRole) {
  const text = (freeText || "").trim();
  const lowered = text.toLowerCase();
  const skillLibrary = [
    { keyword: "product", skill: "Product Thinking" },
    { keyword: "research", skill: "User Research" },
    { keyword: "dashboard", skill: "Dashboarding" },
    { keyword: "sql", skill: "SQL" },
    { keyword: "data", skill: "Data Storytelling" },
    { keyword: "design", skill: "Workflow Design" },
    { keyword: "ai", skill: "AI Collaboration" },
    { keyword: "prompt", skill: "Prompt Writing" },
    { keyword: "recruit", skill: "Hiring Operations" },
    { keyword: "team", skill: "Cross-Functional Leadership" },
  ];

  const suggestedSkills = Array.from(
    new Set(
      skillLibrary
        .filter((item) => lowered.includes(item.keyword))
        .map((item) => item.skill)
        .concat(["Communication", "Structured Problem Solving", "Candidate Experience Design"]),
    ),
  ).slice(0, 6);

  const parsedExperience = text
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((sentence) => (sentence.length > 96 ? `${sentence.slice(0, 93)}...` : sentence));

  const projectHints = [];
  if (lowered.includes("intern")) projectHints.push("Internship impact snapshot");
  if (lowered.includes("college") || lowered.includes("university")) {
    projectHints.push("Academic capstone with measurable outcome");
  }
  if (lowered.includes("ai")) projectHints.push("AI workflow improvement case study");
  if (!projectHints.length) {
    projectHints.push("Problem-to-solution project narrative");
    projectHints.push("Impact-focused case study");
  }

  const recommendedRoles = Array.from(
    new Set(
      [preferredRole, "Operations Analyst", "Associate Product Manager", "Talent Intelligence Analyst"].filter(Boolean),
    ),
  ).slice(0, 3);

  return {
    summary: text
      ? `${preferredRole || "Emerging professional"} who translates unstructured experience into measurable hiring signals, with strengths in ${suggestedSkills
          .slice(0, 3)
          .join(", ")}.`
      : `Emerging candidate profile for ${preferredRole || "an AI-ready role"}, with guided prompts ready to transform experience into structured evidence.`,
    parsedExperience,
    suggestedSkills,
    suggestedProjects: projectHints.slice(0, 2),
    recommendedRoles,
    confidence: Math.max(62, Math.min(96, 62 + parsedExperience.length * 8 + suggestedSkills.length * 2)),
  };
}

function recruiterView(profile, user) {
  return {
    id: user.id,
    name: profile.basics.fullName,
    headline: profile.basics.headline,
    targetRole: profile.basics.targetRole,
    location: profile.basics.location,
    summary: profile.aiDraft.summary,
    skills: profile.skills,
    projects: profile.projects,
    experience: profile.experience,
    completion: profile.completion,
    updatedAt: profile.updatedAt,
    shortlisted: recruiterStore.shortlist.includes(user.id),
    matchScore: Math.min(97, 65 + Math.round(profile.skills.length * 2.5) + Math.round(profile.projects.length * 4)),
    strengths: [
      "Structured profile instead of resume parsing",
      "Clear impact statements",
      "Strong AI workflow literacy",
    ],
  };
}

function exportProfile(userId) {
  const profile = profileStore[userId];
  return [
    `${profile.basics.fullName} | ${profile.basics.headline}`,
    `${profile.basics.location} | Target Role: ${profile.basics.targetRole}`,
    "",
    "Professional Summary",
    profile.aiDraft.summary,
    "",
    "Skills",
    ...profile.skills.map((skill) => `- ${skill}`),
    "",
    "Experience",
    ...profile.experience.map(
      (item) => `- ${item.role}, ${item.company} (${item.duration})\n  ${item.highlights}`,
    ),
    "",
    "Projects",
    ...profile.projects.map((project) => `- ${project.name}\n  ${project.impact}`),
    "",
    `Share Link: ${profile.shareUrl}`,
  ].join("\n");
}

function serveStatic(req, res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(FRONTEND_DIR, requestedPath));
  if (!filePath.startsWith(FRONTEND_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(FRONTEND_DIR, "index.html"), (indexError, indexContent) => {
        if (indexError) {
          sendText(res, 404, "Not found");
          return;
        }
        sendText(res, 200, indexContent, "text/html; charset=utf-8");
      });
      return;
    }

    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
    };
    sendText(res, 200, content, mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  });
}

async function handleApi(req, res, pathname) {
  const session = getSession(req);

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await parseBody(req);
    const user = demoUsers.find((item) => item.email === body.email && item.password === body.password);
    if (!user) {
      sendJson(res, 401, { error: "Invalid credentials" });
      return;
    }
    setSession(res, user);
    sendJson(res, 200, {
      user: { id: user.id, role: user.role, email: user.email, name: user.name, title: user.title },
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    clearSession(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/demo-login") {
    const body = await parseBody(req);
    const user = demoUsers.find((item) => item.role === body.role);
    if (!user) {
      sendJson(res, 404, { error: "Demo user not found" });
      return;
    }
    setSession(res, user);
    sendJson(res, 200, {
      user: { id: user.id, role: user.role, email: user.email, name: user.name, title: user.title },
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/session") {
    if (!session) {
      sendJson(res, 200, { user: null });
      return;
    }
    const user = userById(session.userId);
    sendJson(res, 200, {
      user: { id: user.id, role: user.role, email: user.email, name: user.name, title: user.title },
    });
    return;
  }

  if (!session) {
    sendJson(res, 401, { error: "Authentication required" });
    return;
  }

  if (req.method === "GET" && pathname === "/api/candidate/profile") {
    const profile = profileStore[session.userId];
    profile.completion = computeCompletion(profile);
    sendJson(res, 200, { profile });
    return;
  }

  if (req.method === "POST" && pathname === "/api/candidate/profile/analyze") {
    const body = await parseBody(req);
    const profile = profileStore[session.userId];
    profile.builderInput = body.builderInput || "";
    profile.aiDraft = buildAiDraft(body.builderInput, body.preferredRole || profile.basics.targetRole);
    profile.status = "AI generated a structured draft just now";
    profile.updatedAt = new Date().toISOString();
    profile.completion = computeCompletion(profile);
    sendJson(res, 200, { aiDraft: profile.aiDraft, profile });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/candidate/profile") {
    const body = await parseBody(req);
    const profile = profileStore[session.userId];
    const nextProfile = {
      ...profile,
      basics: { ...profile.basics, ...(body.basics || {}) },
      onboarding: { ...profile.onboarding, ...(body.onboarding || {}) },
      aiDraft: { ...profile.aiDraft, ...(body.aiDraft || {}) },
      builderInput: body.builderInput ?? profile.builderInput,
      experience: body.experience || profile.experience,
      skills: normalizeList(body.skills || profile.skills),
      projects: body.projects || profile.projects,
      shareUrl:
        body.shareUrl ||
        `https://anshumat.demo/profile/${(body.basics?.shareSlug || profile.basics.shareSlug || "profile").toString().trim()}`,
      exportUrl: `/api/export/${session.userId}`,
      updatedAt: new Date().toISOString(),
      status: "Profile saved",
    };
    nextProfile.completion = computeCompletion(nextProfile);
    profileStore[session.userId] = nextProfile;
    sendJson(res, 200, { profile: nextProfile });
    return;
  }

  if (req.method === "GET" && pathname === "/api/recruiter/candidates") {
    sendJson(res, 200, {
      candidates: demoUsers
        .filter((user) => user.role === "candidate")
        .map((user) => recruiterView(profileStore[user.id], user)),
      shortlist: recruiterStore.shortlist,
    });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/recruiter/candidates/")) {
    const candidateId = pathname.split("/").pop();
    const user = userById(candidateId);
    if (!user || user.role !== "candidate") {
      sendJson(res, 404, { error: "Candidate not found" });
      return;
    }
    sendJson(res, 200, { candidate: recruiterView(profileStore[candidateId], user) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/recruiter/shortlist") {
    const body = await parseBody(req);
    const exists = recruiterStore.shortlist.includes(body.candidateId);
    recruiterStore.shortlist = exists
      ? recruiterStore.shortlist.filter((id) => id !== body.candidateId)
      : recruiterStore.shortlist.concat(body.candidateId);
    sendJson(res, 200, { shortlist: recruiterStore.shortlist });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/export/")) {
    const candidateId = pathname.split("/").pop();
    if (!profileStore[candidateId]) {
      sendText(res, 404, "Profile not found");
      return;
    }
    const content = exportProfile(candidateId);
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="candidate-profile.txt"',
    });
    res.end(content);
    return;
  }

  sendJson(res, 404, { error: "Route not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApi(req, res, requestUrl.pathname);
      return;
    }
    serveStatic(req, res, requestUrl.pathname);
  } catch (error) {
    sendJson(res, 500, { error: "Server error", detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`AI Recruiter app running at http://localhost:${PORT}`);
});
