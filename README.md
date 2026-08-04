# Gym Membership (local)

This workspace adds a minimal Node/Express backend with a SQLite database and basic CRUD endpoints for members, plus client-side calls from `index.html`.

Quick start:

1. Install dependencies:

```bash
cd d:/PSIntern/GymMemberShip
npm install
```

2. Start server:

```bash
npm start
```

3. Open the app in your browser:

http://localhost:3000/index.html

Notes:

- Database file `gym.db` will be created in the project root.
- API endpoints are under `/api/members` (GET, POST, PUT, DELETE).
- The UI uses simple prompt() dialogs for add/edit to keep changes minimal.
  Additional API features:

- POST `/api/renewals/:id/process` — process a renewal and extend member expiry.
- POST `/api/approvals/:id/approve` — approve a pending approval and create the member.
- POST `/api/promotions/:id/apply` — apply a promotion to a member (body: `{ "member_id": <id> }`).

From the UI you can now:

- Add/Edit/Delete members from the Members page.
- Create and process renewals directly using the "Renew" action on member rows.
- Apply promotions using the "Promo" action on member rows.

Start the server and open `http://localhost:3000/index.html` to try the features.
