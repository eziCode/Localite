# Localite 📍🎉

**Localite** is a mobile app designed to help users discover vibrant, relevant, and nearby events—filtered intelligently based on location, age, interests, and group affiliations. Built with React Native, Supabase, and Expo, Localite combines a beautiful user experience with efficient, real-time backend logic.

---

## 🚀 Features

- 🌍 **Location-Based Recommendations**  
  Suggests upcoming events nearby using GPS and personalized filtering.

- 🧠 **Smart Ranking Engine**  
  Edge function ranks events by location, timing, and user demographic (e.g., age).

- 👥 **Group System**  
  Users can create, join, and manage groups. Events can be shared publicly or restricted to groups.

- 📆 **Event Posting & Calendar Integration**  
  Users can post events with start/end times, vibe tags, and custom locations.

- 📸 **Profile Customization**  
  Circular profile image cropping and secure uploads with Supabase storage.

- 🔒 **Secure Auth & Deep Linking**  
  Supabase Auth integration with email/password login and password reset flows.

- 🔄 **Efficient Pagination**  
  Optimized frontend/backend pagination via offset-based loading.

---

## 🛠️ Tech Stack

- **Frontend:** React Native + Expo  
- **Backend:** Supabase (Postgres, Auth, Edge Functions)  
- **Maps & Location:** Google Places API, Expo Location  
- **Image Upload:** `react-native-image-crop-picker`, Supabase Storage  

---

## 🧱 Project Structure

```txt
localite/
├── app/
│   ├── tabs/
│   │   ├── explore/           # Event discovery screen
│   │   └── groups/            # Group management screens
│   ├── components/            # Shared UI components
│   └── lib/
│       └── supabase.ts        # Supabase client setup
├── types/                     # TypeScript models (UserEvent, Group, etc.)
├── supabase/
│   └── functions/
│       └── rank_events/       # Edge function for event ranking

## ⚙️ Getting Started
Follow these steps to get Localite running locally:

1. 🚀 Clone the Repository
git clone https://github.com/yourname/localite.git
cd localite

2. 📦 Install Dependencies
npm install

3. 📱 Start the App
npx expo start

4. ⚡ Deploy Edge Functions
Navigate to the supabase/functions directory and deploy the event ranking function:
supabase functions deploy rank_events

👨‍💻 Authors
Ezra Akresh & Anshdeep Singh
Special thanks to the open-source community and Supabase team for tools, inspiration, and support.

📄 License
This project is licensed under the MIT License.
You are free to use, copy, modify, merge, publish, and distribute this software with attribution.

MIT License

Copyright (c) 2025 Ezra Akresh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
