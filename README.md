# Monthly Expense Tracker

A two-part web app for tracking monthly expenses with a Next.js frontend and a Node.js + Express + MongoDB backend.

## Structure

- `frontend/` - Next.js + TypeScript + Ant Design UI
- `backend/` - Node.js + Express + MongoDB API

## Features

- Add expense item name, category, amount, and date
- View current selected month totals by category
- Browse monthly expense history with month navigation
- View table of expenses for the selected month
- View all-time category totals in a secondary summary
- Backend stores a `userId` field for future login support, but the app currently uses a single default user

## Run locally

1. Start MongoDB locally or use a MongoDB Atlas connection string. Compass must connect to the same running MongoDB server as the app.
2. Run the backend:

```bash
cd backend
npm install
npm run dev
```

3. Run the frontend in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

4. Open `http://localhost:3000`.

## Environment variables

- `backend/.env`
  - `PORT=4000`
  - `MONGODB_URI=mongodb://127.0.0.1:27017/monthly-expenses`
  - `CORS_ORIGIN=http://localhost:3000`
- `frontend/.env.local`
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
