# BulkMailer 📧

BulkMailer is a full-stack bulk email management web application built with **React, Node.js, Express.js, and MongoDB**. It includes user authentication, a dashboard for sending bulk emails, and an email history section to view previously sent emails.

##  Features

*  User Login & Authentication
*  Main Dashboard
*  Send Bulk Emails
*  Email Sent History
*  Navigation between pages
*  Store email history in MongoDB
*  Backend API for authentication and email management

## 🛠️ Technologies Used

### Frontend

* React.js
* React Router
* HTML
* CSS
* JavaScript

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication


##  Project Purpose

This project was developed to practice **full-stack web development**, including:

* React frontend development
* Node.js and Express.js backend development
* REST API creation
* MongoDB database integration
* User authentication
* Frontend-backend communication
* CRUD operations

##  Author

**Prem Kumar**

## Deployment environment variables

Do not commit a real `.env` file or place backend secrets in frontend code.

For the backend deployment, set these variables in the hosting provider's environment settings:

* `MONGO_URI`
* `CLIENT_ORIGIN` (the exact deployed frontend URL, such as your GitHub Pages URL)
* `ADMIN_EMAIL`
* `ADMIN_PASSWORD`
* `SMTP_HOST=smtp.gmail.com`
* `SMTP_PORT=465`
* `SMTP_SECURE=true`
* `SMTP_USER`
* `SMTP_PASS` (a Gmail App Password)

For the frontend build, set `REACT_APP_API_URL` to the deployed backend URL without `/api`, for example `https://your-backend.example.com`. This variable is required; the frontend does not use a localhost fallback.

### Vercel frontend

Create a Vercel project from this repository with:

* Framework: Create React App
* Build command: `npm run build --prefix frontend`
* Output directory: `frontend/build`
* Environment variable: `REACT_APP_API_URL=https://your-backend.onrender.com`

### Render backend

Create a Render Web Service from this repository with:

* Root directory: `backend`
* Build command: `npm install`
* Start command: `npm start`

Set `MONGO_URI`, `CLIENT_ORIGIN`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in Render. Set `CLIENT_ORIGIN` to the exact Vercel URL. SMTP can remain in MongoDB's `bulkmail` collection, or be supplied with `SMTP_USER` and `SMTP_PASS`.
