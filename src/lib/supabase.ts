import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Check if we have valid configuration (not placeholder values)
const hasValidConfig =
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your_supabase') &&
  !supabaseKey.includes('your_supabase') &&
  supabaseUrl !== 'your_supabase_project_url' &&
  supabaseKey !== 'your_supabase_anon_key'

// Only create Supabase client if environment variables are properly configured
export const supabase = hasValidConfig
  ? createClient(supabaseUrl!, supabaseKey!)
  : null

// Export a guaranteed non-null client for production use
export const supabaseClient = supabase!;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          has_paid: boolean
          food_genres: string[] | null
          dietary_preferences: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          has_paid?: boolean
          food_genres?: string[] | null
          dietary_preferences?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          has_paid?: boolean
          food_genres?: string[] | null
          dietary_preferences?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_images: {
        Row: {
          id: string
          user_id: string
          image_url: string
          image_name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          image_name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          image_name?: string
          created_at?: string
        }
      }
      saved_recipes: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          ingredients: string[]
          instructions: string[]
          prep_time: number
          cook_time: number
          servings: number
          cuisine: string[]
          dietary_tags: string[]
          difficulty: string
          tips: string[] | null
          variations: string[] | null
          is_generated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          ingredients: string[]
          instructions: string[]
          prep_time: number
          cook_time: number
          servings: number
          cuisine: string[]
          dietary_tags: string[]
          difficulty: string
          tips?: string[] | null
          variations?: string[] | null
          is_generated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          ingredients?: string[]
          instructions?: string[]
          prep_time?: number
          cook_time?: number
          servings?: number
          cuisine?: string[]
          dietary_tags?: string[]
          difficulty?: string
          tips?: string[] | null
          variations?: string[] | null
          is_generated?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}