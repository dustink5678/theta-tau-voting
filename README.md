# Theta Tau Voting Application

A real-time voting application for Theta Tau fraternity, built with React, Node.js, and Firebase.

## Features

- Google Authentication
- User roles (Admin and Regular users)
- Real-time voting system
- Admin panel for user management and question creation
- User verification system
- Real-time vote counting and updates

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Firebase account and project
- Firebase CLI installed globally (`npm install -g firebase-tools`)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd theta-tau-voting
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication with Google sign-in
   - Create a Firestore database
   - Create a Realtime Database

4. Configure Firebase:
   - Copy your Firebase configuration from the Firebase Console
   - Create a `.env` file in the root directory with the following variables:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

5. Log in to Firebase CLI:
```bash
firebase login
```

6. Initialize Firebase in your project (if not already done):
```bash
firebase init
```

7. Start the development server:
```bash
npm run dev
```

## Deployment

To deploy the application to Firebase Hosting:

1. Build the application:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
npm run firebase:deploy
```

Or use the included deploy script:
```bash
./deploy.sh
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/      # React contexts (Auth, etc.)
├── pages/         # Page components
├── types/         # TypeScript type definitions
└── config/        # Configuration files
```

## Firebase Security Rules

Set up the following security rules in your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
    
    // Questions collection
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
