# Software Architecture for RentalHub

## 1. High-Level Overview

RentalHub is built on the **MERN** stack (MongoDB, Express, React, Node.js) configured with **TypeScript**.
It utilizes a dual-node architecture:
1.  **Frontend Node:** A React Single Page Application (SPA) communicating asynchronously via HTTP calls and WebSockets.
2.  **Backend Node:** An Express API server implementing REST routing and real-time Socket.io endpoints.

## 2. Directory Structure

-   `frontend/`: The User Interface. Bootstrapped with Create React App (CRA) or similar standard tooling.
-   `backend/`: The API Server. Includes models, routes, and controllers to keep business logic isolated.

## 3. Database Schema

The core domain relies on **MongoDB**. Essential entities:
-   **User:** Base authenticable entity (Can be *Renter*, *Landlord*, *Admin*). Data holds preferences.
-   **Property:** Contains descriptions, media arrays, geolocational data, renting fee data.
-   **Roommate:** Extended profile data meant for matchmaking (Habits, lease spans, max budgets).
-   **Message:** Direct message content linking two Users.
-   **Notification:** System-generated alerts.

## 4. Authentication Flow

Authentication is stateless via JSON Web Tokens (JWT).
1.  Client submits email/password to `/api/auth/login`.
2.  Backend verifies using `bcryptjs` and signs a JWT containing `userId` and `userType`.
3.  Client stores JWT across sessions (typically localStorage or HTTP Only Cookies) and attaches it as a `Bearer` token to the `Authorization` header.
4.  Express `auth` middleware intercepts requests to protected endpoints, parses, and hydrates the Request object (`req.userId`).

## 5. Real-time Infrastructure

Real-time interactions (specifically *Messaging* & *Live Notification Delivery*) use **Socket.io**.
1.  When a user logs in, the React client initiates a socket connection.
2.  Backend `socket.ts` maps this connection ID to `userId`.
3.  On events like `sendMessage`, the event is saved to Mongo via standard REST post to keep source of truth intact.
4.  Backend triggers a WebSocket push signal directly to the connected target client using `io.to()`.

## 6. Security

-   Input Data forms are sanitized and checked.
-   Roles and capabilities are restricted. (E.g. only Admins can access `/admin` resources).
-   Images are locally uploaded to `backend/uploads/` via Multer or sent to cloud storage (S3/Cloudinary layer could be implemented).

## 7. Adding new Features

A standard workflow for adding a new feature involves:
1.  Creating the respective Mongoose Model in `backend/src/models/`.
2.  Implementing Controller functions in `backend/src/controllers/`.
3.  Mapping the functions to `backend/src/routes/`.
4.  Consuming the API endpoints via Axios in `frontend/src/lib/api.ts`.
5.  Creating React Components mapping this state to Views.
