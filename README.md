# Pennywise — Expense Tracker

A responsive, front-end-only expense tracker built with **HTML, CSS and JavaScript**. It includes local demo registration/sign-in, transaction management, budgets, CSV/JSON export, and chart-based analytics.

## Features
- Registration and sign-in screens
- Add, edit and delete income/expense transactions
- Indian rupee formatting (INR)
- Dashboard: balance, income, expenses, savings rate
- Income-vs-expense chart and category doughnut chart
- Analytics: expense trend, category comparison and insights
- Monthly category budgets with progress indicators
- Search, filter and sort transactions
- Export transactions to CSV and all local data to JSON
- Responsive desktop, tablet and mobile layout
- Browser-local persistence with `localStorage`

## Run locally (Windows)
1. Extract `ExpenseTracker.zip`.
2. Open the extracted `ExpenseTracker` folder.
3. Double-click `index.html` to open it in Chrome, Edge or Firefox.
4. Select **Create account**, enter your name, email and a password of at least 6 characters.
5. Sign in and add your first transaction.

No Node.js or build tools are required. The charts use Chart.js from a CDN, so an internet connection is needed for graphs. The Google Fonts are also loaded online; the site still has fallback fonts if they cannot load.

## Important security note
This is a **front-end demo**, not a production-secure authentication system. Because the project is restricted to HTML/CSS/JavaScript in the browser, demo account details and app data are stored in that browser's `localStorage`. Passwords are not protected like they would be on a server. Do not use a real/reused password or enter sensitive financial information. Accounts/data do not sync to another device or browser, and clearing browser storage can erase them.

For a real public deployment with secure authentication, password hashing, recovery, and multi-device sync, add a backend/API and database (for example Node.js + Express + MongoDB or a managed auth service). Chart.js is loaded from jsDelivr via CDN.
