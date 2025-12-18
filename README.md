# TicketHub - Movie Ticket Booking Application

A modern movie ticket booking platform built with Node.js, Express, MongoDB, and vanilla JavaScript.

## Features

- User authentication (Session-based)
- Browse movies and showtimes
- Select seats and book tickets
- View booking history
- Responsive design

## Tech Stack

**Backend:**
- Node.js & Express.js
- MongoDB Atlas (Database)
- Express Session (Authentication)
- Bcrypt (Password hashing)

**Frontend:**
- Vanilla JavaScript
- HTML5 & CSS3
- Responsive design

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
ADMIN_EMAIL=admin@tickethub.com
ADMIN_PASSWORD=YourAdminPassword
SEAT_LOCK_DURATION=600000
```

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Book_My_Show
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
- Create a `.env` file based on the example above
- Update MongoDB URI with your connection string

4. Start the server
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Deployment on Render

1. Push your code to GitHub

2. Create a new Web Service on Render

3. Connect your GitHub repository

4. Configure the service:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node

5. Add environment variables in Render dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`

6. Deploy!

## Project Structure

```
Book_My_Show/
├── models/           # MongoDB models
├── routes/           # API routes
├── public/           # Frontend files
│   ├── css/         # Stylesheets
│   ├── js/          # JavaScript files
│   └── images/      # Static images
├── scripts/         # Utility scripts
├── server.js        # Main server file
├── .env             # Environment variables (not in repo)
├── package.json     # Dependencies
└── README.md        # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Movies
- `GET /api/movies` - Get all movies
- `GET /api/movies/:id` - Get movie details
- `GET /api/movies/:id/shows` - Get shows for a movie

### Shows
- `GET /api/shows/movie/:movieId` - Get shows for a movie
- `GET /api/shows/:id` - Get show details

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/user/:userId` - Get user's bookings

## Default Admin Credentials

The application creates a default admin account on first startup using credentials from `.env` file.

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
