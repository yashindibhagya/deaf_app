# GestureConnect Frontend

This is the frontend application for GestureConnect, a mobile app that helps users learn and translate sign language.

## Features

- **Text to Sign Language Translation**: Convert text to sign language videos
- **Sign to Text Translation**: (Planned feature) Translate sign language gestures to text
- **Learning Modules**: Courses for learning different categories of signs
- **Multi-language Support**: Support for English, Sinhala, and Tamil

## Tech Stack

- **React Native**: Core framework for cross-platform mobile development
- **Expo**: Development toolkit and build system
- **Expo Router**: File-based routing system
- **Firebase**: Authentication and database
- **AsyncStorage**: Local data persistence
- **React Context API**: State management
- **Cloudinary**: Video storage and delivery

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project with authentication enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/gesture-connect.git
   cd gesture-connect/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up Firebase configuration:
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Email/Password authentication
   - Create a Firestore database
   - Update the Firebase config in `config/firebaseConfig.js`

4. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

5. Run on a device or emulator:
   - Scan the QR code with the Expo Go app on your phone
   - Press 'a' to run on an Android emulator
   - Press 'i' to run on an iOS simulator

## Project Structure

```
frontend/
├── app/                     # Main application screens using Expo Router
│   ├── (auth)/              # Authentication screens
│   ├── (tabs)/              # Main tab screens
│   ├── learning/            # Learning-related screens
│   ├── selectOption/        # Option screens for auth methods
│   └── _layout.jsx          # Root layout component
├── assets/                  # Static assets like images and data files
├── Components/              # Reusable UI Components
├── config/                  # Configuration files
├── context/                 # React context providers
├── services/                # API service calls
├── utils/                   # Utility functions
└── package.json             # Package dependencies
```

## Development

### Adding a New Screen

1. Create a new file in the appropriate directory inside `app/`
2. If it's a tab screen, add it to `app/(tabs)/_layout.jsx`
3. If it requires authentication, add it inside `app/(auth)/`

### Adding New Sign Language Data

1. Add new sign data to the relevant JSON file in `assets/Data/`
2. Update the Cloudinary mappings in `utils/CloudinaryUtils.js` if needed

## Deployment

### Build for Android

```bash
expo build:android
```

### Build for iOS

```bash
expo build:ios
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Special thanks to all contributors
- Sign language video resources
- Translation and transliteration services