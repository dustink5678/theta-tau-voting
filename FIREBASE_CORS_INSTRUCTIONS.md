# Firebase CORS Configuration Instructions

To fix the CORS issues with your Firebase project, follow these steps:

## 1. Firebase Storage CORS Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `thetatauvoting-8a0d0`
3. Navigate to **Storage** in the left menu
4. Click on the **Rules** tab
5. Add the following CORS configuration:

```
cors {
  origin: ["http://localhost:5174", "http://localhost:5175", "http://localhost:5176", 
           "http://localhost:5177", "http://localhost:5178", "http://localhost:5179", 
           "http://localhost:5180", "http://localhost:3000", 
           "https://thetatauvoting-8a0d0.web.app", 
           "https://thetatauvoting-8a0d0.firebaseapp.com"];
  method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"];
  maxAgeSeconds: 3600;
  responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", 
                  "x-goog-resumable", "Access-Control-Allow-Origin", 
                  "Access-Control-Allow-Methods", "Access-Control-Allow-Headers", 
                  "Access-Control-Max-Age"];
}
```

## 2. Deploy Updated Auth File

After making the changes to your Auth.js file, rebuild and deploy your application:

```bash
npm run build
firebase deploy
```

## 3. Test Authentication on Mobile

Test your application on both mobile and desktop browsers to ensure authentication works correctly. The key changes made to fix your issues:

1. Added mobile device detection to use redirect auth on mobile automatically
2. Fixed the undefined user variable in the Amplitude tracking
3. Implemented browserLocalPersistence instead of relying on the default
4. Added proper error handling for auth redirects
5. Updated CORS settings to include all required headers and domains

These changes should resolve the issues with popup authentication and mobile redirects. 