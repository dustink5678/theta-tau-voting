# Theta Tau Voting

A real-time voting application built for Theta Tau fraternity, allowing administrators to create questions and members to vote.

## Features

- **User Authentication**: Google Authentication for users
- **Role-Based Access**: Admin and regular user roles
- **Real-Time Updates**: Live updates using Firebase Firestore
- **Admin Features**:
  - Create and manage questions
  - View voting results in real-time
  - Verify and manage users
  - Delete user accounts
- **User Features**:
  - Vote on active questions
  - See waiting status between questions

## Technologies Used

- React
- TypeScript
- Firebase (Authentication, Firestore)
- Chakra UI for styling
- Vite for development and building

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/theta-tau-voting.git
   cd theta-tau-voting
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Deployment

The application is automatically deployed to GitHub Pages when pushing to the main branch.

Visit the application at: https://yourusername.github.io/theta-tau-voting/

## License

MIT
