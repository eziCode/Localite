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

/app
/tabs
/explore → Event discovery screen
/groups → Group management screens
/components → Shared React Native components
/lib
supabase.ts → Supabase client setup
/types → TypeScript models (UserEvent, Group, etc.)
/supabase
/functions
rank_events → Edge function for event ranking

yaml
Copy
Edit

---

## ⚙️ Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/yourname/localite.git
cd localite
2. Install Dependencies
bash
Copy
Edit
npm install
3. Start the App
bash
Copy
Edit
npx expo start
4. Environment Configuration
Create a .env file (or configure directly in your code) with:

env
Copy
Edit
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
5. Deploy Edge Function
From /supabase/functions:

bash
Copy
Edit
supabase functions deploy rank_events
📸 Screenshots
Add screenshots here of the Explore screen, Group UI, and event posting modal.

📌 Todo / Roadmap
 Interest-based recommendation engine

 In-app chat for event discussions

 Event RSVP system

 Push notifications for nearby events

👨‍💻 Author
Developed by Ezra Akresh
Special thanks to the open-source and Supabase community

📄 License
MIT License