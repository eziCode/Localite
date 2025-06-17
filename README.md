# Localite 📍🎉

**Localite** is a mobile app designed to help users discover vibrant, relevant, and nearby events—filtered intelligently based on location, age, interests, and group affiliations. Built with **React Native**, **Supabase**, and **Expo**, Localite delivers a seamless, engaging experience backed by efficient real-time backend logic.

---

## 🚀 Features

- 🌍 **Location-Based Recommendations**  
  Discover upcoming events nearby using GPS and personalized filtering.

- 🧠 **Smart Ranking Engine**  
  Edge Function ranks events by location, timing, and age demographics.

- 👥 **Group System**  
  Create, join, and manage groups. Share events publicly or restrict them to specific groups.

- 📆 **Event Creation & Calendar View**  
  Post events with timing, vibe tags, and locations. Explore via calendar UI.

- 📸 **Profile Customization**  
  Crop profile images in a circular format and store them securely with Supabase.

- 🔒 **Secure Auth & Deep Linking**  
  Supabase Auth for login, password reset, and deep link redirection.

- 🔄 **Efficient Pagination**  
  Offset-based backend pagination for smooth event loading.

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
```

---

## ⚙️ Getting Started

Follow these steps to get Localite running locally:

### 1. 🚀 Clone the Repository

```bash
git clone https://github.com/yourname/localite.git
cd localite
```

### 2. 📦 Install Dependencies

```bash
npm install
```

### 3. 📱 Start the App

```bash
npx expo start
```

### 4. 🔐 Environment Configuration

Create a `.env` file in the root of your project and add your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Alternatively, configure these directly inside `lib/supabase.ts`.

### 5. ⚡ Deploy Edge Function

Navigate to the Supabase functions directory and deploy the ranking function:

```bash
cd supabase/functions
supabase functions deploy rank_events
```

---

## 📌 Roadmap

- [ ] Interest-based recommendation engine
- [ ] In-app chat for event discussions
- [ ] RSVP system
- [ ] Push notifications for new or nearby events

---

## 👨‍💻 Authors

- **Ezra Akresh**
- **Anshdeep Singh**

Special thanks to the open-source community and the Supabase team for tools, inspiration, and support.

---

## 📄 License

This project is licensed under the MIT License.

You are free to use, copy, modify, merge, publish, and distribute this software with proper attribution.

```
MIT License

Copyright (c) 2025 Ezra Akresh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
