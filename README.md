# Food at Home

A mobile-first web application that helps users discover delicious recipes using ingredients they already have at home.

## Features

- 🔐 **Secure Authentication**: Google OAuth integration via Supabase
- 💰 **One-time Payment**: $5 fee for lifetime access using Stripe
- 📸 **Image Upload**: Upload up to 10 photos of your fridge and pantry
- 🍜 **Food Genres**: Select from 20+ cuisine types or add custom ones
- 🥗 **Dietary Preferences**: Specify dietary restrictions and preferences
- 📱 **Mobile-First**: Responsive design optimized for mobile devices
- 🎨 **Modern UI**: Clean, intuitive interface with CSS animations

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Custom CSS (no Tailwind)
- **Backend**: Supabase (Database, Authentication, Storage)
- **Payment**: Stripe integration
- **Authentication**: Google OAuth via Supabase
- **Image Storage**: Supabase Storage

## Prerequisites

Before running this application, you'll need:

1. **Node.js** (v16 or higher)
2. **Supabase Account** and project
3. **Google OAuth App** (for authentication)
4. **Stripe Account** (for payments)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd food-at-home
npm install
```

### 2. Environment Variables

Copy the environment file and add your keys:

```bash
cp .env.example .env
```

Update `.env` with your actual values:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 3. Supabase Setup

#### Database Tables

Create these tables in your Supabase SQL editor:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  has_paid BOOLEAN DEFAULT FALSE,
  food_genres TEXT[] DEFAULT '{}',
  dietary_preferences TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User images table
CREATE TABLE user_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_images ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for user_images
CREATE POLICY "Users can view own images" ON user_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON user_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON user_images
  FOR DELETE USING (auth.uid() = user_id);
```

#### Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `user-images`
3. Set it to **Public** for easy image access
4. Add this policy for the bucket:

```sql
-- Storage policy for user-images bucket
CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own images" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-images');

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Authentication

1. Go to Authentication → Providers in Supabase
2. Enable Google provider
3. Add your Google OAuth credentials
4. Set redirect URL to: `http://localhost:3000/dashboard` (for development)

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000/dashboard` (for development)

### 5. Stripe Setup

1. Create a [Stripe account](https://stripe.com)
2. Get your publishable key from the dashboard
3. Add it to your `.env` file

**Note**: The current implementation uses a simulated payment. To integrate real Stripe payments, you'll need to:
- Set up Stripe webhooks
- Create a backend endpoint for payment processing
- Update the PaymentForm component

## Running the Application

```bash
npm start
```

The app will open at `http://localhost:3000`

## Project Structure

```
src/
├── components/           # React components
│   ├── HomePage.tsx     # Landing page
│   ├── Dashboard.tsx    # Main app dashboard
│   ├── PaymentForm.tsx  # Stripe payment integration
│   ├── ImageUpload.tsx  # File upload component
│   ├── FoodGenreSelector.tsx  # Cuisine selection
│   └── DietaryPreferences.tsx # Diet preferences
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication context
├── hooks/               # Custom React hooks
│   └── useProfile.ts    # User profile management
├── lib/                 # Utility libraries
│   ├── supabase.ts     # Supabase configuration
│   └── stripe.ts       # Stripe configuration
└── App.tsx             # Main app component
```

## Features in Detail

### Authentication Flow
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. Upon success, redirected back to dashboard
4. User profile created automatically in Supabase

### Payment Flow
1. After authentication, user sees payment form
2. Pays $5 (currently simulated)
3. User profile updated with `has_paid: true`
4. Access granted to main features

### Image Upload
- Drag & drop or click to upload
- Up to 10 images per user
- Images stored in Supabase Storage
- Automatic compression and optimization

### Preferences Management
- Select from 20+ predefined cuisines
- Add custom cuisine types
- Free-form dietary preferences text
- All preferences saved to user profile

## Future Features

- 🔍 **AI Recipe Discovery**: Use uploaded images and preferences for recipe suggestions
- 🍽️ **Meal Planning**: Weekly meal planning with suggested recipes
- 🛒 **Shopping Lists**: Generate shopping lists for missing ingredients
- 📊 **Analytics**: Track cooking habits and preferences
- 🤝 **Social Features**: Share recipes with friends

## Available Scripts

### `npm start`

Runs the app in the development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
