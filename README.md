# AI Recruiter Assignment

This project is a full-stack prototype for the "AI-Powered Recruitment Experience" assignment. It intentionally removes resume upload from the candidate journey and replaces it with structured, AI-assisted profile creation.

## What this solves

Resume-led hiring breaks because the core candidate signal is trapped inside inconsistent PDFs. Recruiters compare formatting as much as substance, parsing is unreliable, and early-career candidates are punished for not knowing how to package experience. This product instead captures:

- guided onboarding
- free-form experience storytelling
- AI-assisted structuring
- normalized skills, project, and experience sections
- recruiter comparison and shortlist actions

## AI interaction design

The key AI moments in this prototype are:

- candidates answer a prompt like "Tell me about your experience"
- the system turns that into a structured summary
- the system suggests skills based on the narrative
- the system recommends role directions
- recruiter review is based on structured evidence rather than a parsed PDF

This implementation uses a deterministic local rules engine so the app runs without external APIs. In a production version, the same interaction points would connect to an LLM service with moderation, audit logs, prompt versioning, and recruiter-facing explanation states.

## Included screens

The app covers the assignment's required flow:

- landing page
- onboarding
- AI profile builder
- skills and experience input
- profile preview
- recruiter candidate list
- recruiter candidate profile view
- shortlist/action screen

## Tech stack

- Frontend: vanilla HTML, CSS, and JavaScript SPA in `/frontend`
- Backend: Node.js HTTP server with no external dependencies in `/backend`
- Data: seeded in-memory demo data for fast review

## Project structure

```text
/frontend   Frontend code
/backend    Backend code
/README.md  Setup instructions + product thinking
```

## Demo credentials

Credentials are now loaded from a local `.env` file so company email/password values are not committed to GitHub.

1. Copy `.env.example` to `.env`
2. Replace the placeholder values with your private credentials
3. Start the backend normally

The UI includes demo buttons for candidate and recruiter access, so the browser no longer needs the raw passwords baked into frontend code.

## How to run

1. Open a terminal in the project root.
2. Run:

```bash
cd backend
node server.js
```

3. Visit `http://localhost:3000`

## Notes for reviewers

- No resume upload flow exists by design.
- Candidate progress auto-saves through the profile API.
- Export is implemented as a generated downloadable profile document.
- Share is implemented as a profile link surfaced in the review screen.
- Recruiter mode supports structured comparison and shortlist management.

## Future improvements

- replace the local rules engine with a real LLM orchestration layer
- persist data in a database
- add recruiter filters, search, and team collaboration
- introduce explainable AI confidence notes and bias checks
