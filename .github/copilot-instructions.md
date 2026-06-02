# Rental & Roommate Finding Website - Development Instructions

## Project Overview
Full-stack web application for finding rentals and roommates with user authentication, property listings, roommate profiles, and messaging system.

## Tech Stack
- **Frontend**: React with TypeScript
- **Backend**: Node.js/Express
- **Database**: MongoDB
- **Authentication**: JWT
- **Testing**: Jest

## Project Setup

### Backend Setup
1. Navigate to `backend/` directory
2. Run `npm install`
3. Create `.env` file with MongoDB URI, JWT secret, and port
4. Run `npm run dev` to start development server

### Frontend Setup
1. Navigate to `frontend/` directory
2. Run `npm install`
3. Run `npm start` to start React development server

## Key Features
- User registration and authentication (renters and landlords)
- Property listing creation and management
- Roommate profile creation
- Advanced search and filtering
- User-to-user messaging
- Favorites/wishlist functionality
- User ratings and reviews

## Development Guidelines
- Use TypeScript for type safety
- Follow REST API conventions
- Implement proper error handling
- Use JWT for authentication
- Sanitize user inputs
- Use environment variables for sensitive data

## File Structure
```
RentalRoommateApp/
├── backend/
│   ├── src/
│   │   ├── models/        (MongoDB schemas)
│   │   ├── routes/        (API endpoints)
│   │   ├── controllers/    (Business logic)
│   │   ├── middleware/     (Auth, validation)
│   │   └── server.ts      (Entry point)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    (Reusable components)
│   │   ├── pages/         (Page components)
│   │   ├── styles/        (CSS files)
│   │   └── App.tsx        (Main component)
│   └── package.json
└── README.md
```
