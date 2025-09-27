import { FirestoreService } from '../services/FirestoreService'

export interface UsageRecord {
  id?: string
  user_id: string
  action_type: 'recipe_generation' | 'ingredient_analysis'
  recipes_generated: number
  created_at?: string
}

export interface UsageLimits {
  recipesPerGeneration: number
  maxGenerationsPerWeek: number
  currentWeekUsage: number
  remainingGenerations: number
  isBasicTier: boolean
}

export class UsageTrackingService {
  static async trackRecipeGeneration(userId: string, recipesGenerated: number): Promise<void> {
    try {
      await FirestoreService.trackUsage({
        user_id: userId,
        action_type: 'recipe_generation',
        recipes_generated: recipesGenerated
      })
    } catch (error) {
      console.error('Error tracking recipe generation:', error)
    }
  }

  static async getUserUsageLimits(userId: string, userProfile?: any): Promise<UsageLimits> {
    const isBasicTier = !userProfile?.subscription_tier || userProfile.subscription_tier === 'basic'

    // Premium users get unlimited
    if (!isBasicTier) {
      return {
        recipesPerGeneration: 10,
        maxGenerationsPerWeek: 999,
        currentWeekUsage: 0,
        remainingGenerations: 999,
        isBasicTier: false
      }
    }

    // Basic tier limits
    const basicLimits = {
      recipesPerGeneration: 3,
      maxGenerationsPerWeek: 5,
      currentWeekUsage: 0,
      remainingGenerations: 5,
      isBasicTier: true
    }

    try {
      // Get usage from the last 7 days
      const usageData = await FirestoreService.getUserUsageRecords(userId, 'recipe_generation', 7)

      const currentWeekUsage = usageData?.length || 0
      const remainingGenerations = Math.max(0, basicLimits.maxGenerationsPerWeek - currentWeekUsage)

      return {
        ...basicLimits,
        currentWeekUsage,
        remainingGenerations
      }
    } catch (error) {
      console.error('Error calculating usage limits:', error)
      return basicLimits
    }
  }

  static async canGenerateRecipes(userId: string, userProfile?: any): Promise<{ canGenerate: boolean; reason?: string; limits: UsageLimits }> {
    const limits = await this.getUserUsageLimits(userId, userProfile)

    if (!limits.isBasicTier) {
      return { canGenerate: true, limits }
    }

    if (limits.remainingGenerations <= 0) {
      return {
        canGenerate: false,
        reason: `You've reached your weekly limit of ${limits.maxGenerationsPerWeek} recipe generations. Upgrade to Premium for unlimited access!`,
        limits
      }
    }

    return { canGenerate: true, limits }
  }

  static async resetWeeklyUsage(userId: string): Promise<void> {
    // This would typically be called by a scheduled job
    // For now, it's just a placeholder for future implementation
    console.log(`Would reset weekly usage for user ${userId}`)
  }
}