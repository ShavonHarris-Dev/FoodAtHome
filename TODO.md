# Food At Home - TODO List

## 🚀 Priority Tasks (Core Functionality)

### 1. Image Analysis & Ingredient Detection
- [x] **Implement AI-powered image analysis** - Replace mock `analyzeIngredients()` function with real AI service
  - ✅ Claude Vision API implemented
  - ✅ Detects ingredients from fridge/pantry photos
  - ✅ Returns accurate ingredient list for recipe matching

### 2. Recipe Detail View
- [ ] **Create full recipe view modal/page** - Currently recipes only show cards
  - Full ingredient list with quantities
  - Step-by-step cooking instructions
  - Cooking times and difficulty level
  - Shopping list for missing ingredients
  - Save/favorite functionality

### 3. Authentication & Profile System
- [x] **Fix Google OAuth setup** - Currently configured but needs testing
- [x] **Complete profile onboarding flow** - Ensure setup preferences save correctly
- [ ] **Add profile management page** - Allow users to update preferences later

### 4. Payment & Subscription System
- [ ] **Integrate Stripe payment processing** - Currently has placeholder key
  - Set up real Stripe account and webhook endpoints
  - Handle subscription creation and management
  - Implement billing portal for users

## 🔧 Core Features To Complete

### 5. Meal Planning System (Premium Feature)
- [ ] **Save recipes to meal plan** - Allow users to add recipes to weekly planner
- [ ] **Generate shopping lists** - Combine ingredients from planned meals
- [ ] **Meal plan sharing** - Share weekly plans with family members

### 6. Recipe Recommendations Engine
- [ ] **Improve ingredient matching algorithm** - Better fuzzy matching for ingredients
- [ ] **Add recipe rating/feedback system** - Learn user preferences over time
- [ ] **Implement recipe history** - Track what users have made before

### 7. Mobile Optimization
- [ ] **Improve mobile camera integration** - Better photo capture experience
- [ ] **Optimize image upload flow** - Reduce file sizes, better compression
- [x] **Test HEIC conversion on actual iPhones** - Verify the conversion works properly

## 🎯 User Experience Improvements

### 8. Onboarding & Guidance
- [ ] **Add app tutorial/walkthrough** - Guide new users through setup process
- [ ] **Improve empty states** - Better messaging when no recipes found
- [ ] **Add loading states** - Better feedback during API calls and uploads

### 9. Error Handling & Reliability
- [ ] **Improve error messages** - More helpful, actionable error text
- [ ] **Add retry mechanisms** - For failed API calls and uploads
- [ ] **Implement offline functionality** - Cache recipes for offline viewing

### 10. Performance & Optimization
- [ ] **Optimize image processing** - Faster upload and analysis
- [ ] **Implement recipe caching** - Store frequently accessed recipes locally
- [ ] **Add search functionality** - Search within user's recipe history

#### AI Cost Optimization (Priority)
- [ ] **Vision output compression** - Compress vision output to minimal JSON format (ingredients array + confidence scores)
- [ ] **Recipe length caps** - Add hard limits (5 steps max, 50 words per step) to control output tokens
- [ ] **Two-tier model architecture** - Use Haiku/4o-mini for vision, larger models only for recipe generation
- [ ] **Caching layer with hashing** - Hash ingredient sets + preferences to reuse recipes and reduce API calls
- [ ] **Ingredient normalization** - Merge duplicates ("scallion" + "green onion" → "green onion") before generation
- [ ] **Output length limits** - Implement strict prompt constraints for bounded recipe generation
- [ ] **PEFT/LoRA research** - Plan fine-tuning small model on recipe format instead of full fine-tune

## 🔒 Security & Production Readiness

### 11. Data Management
- [ ] **Implement proper data validation** - Sanitize all user inputs
- [ ] **Add data export functionality** - Allow users to download their data
- [ ] **Set up database backups** - Regular Supabase backup strategy

### 12. Monitoring & Analytics
- [ ] **Add error tracking** - Implement Sentry or similar service
- [ ] **Set up usage analytics** - Track feature usage and user behavior
- [ ] **Monitor API usage** - Track Spoonacular API consumption

### 13. Legal & Compliance
- [ ] **Add privacy policy** - Required for app store and GDPR compliance
- [ ] **Terms of service** - Legal protection for the service
- [ ] **Cookie consent** - EU compliance for web version

## 🚢 Deployment & Infrastructure

### 14. Production Deployment
- [ ] **Set up CI/CD pipeline** - Automated deployment process
- [ ] **Configure production environment** - Separate staging and production
- [ ] **Set up custom domain** - Professional domain name and SSL

### 15. App Store Preparation
- [ ] **Create app icons and screenshots** - Professional app store assets
- [ ] **Write app store descriptions** - Marketing copy for iOS/Android stores
- [ ] **Test on multiple devices** - Ensure compatibility across platforms

## 💡 Nice-to-Have Features (Future Enhancements)

### 16. Social Features
- [ ] **Recipe sharing** - Share favorite recipes with friends
- [ ] **Community ratings** - Rate recipes from other users
- [ ] **Family accounts** - Multiple users per subscription

### 17. Advanced Features
- [ ] **Voice commands** - "Add eggs to shopping list"
- [ ] **Barcode scanning** - Scan pantry items for inventory
- [ ] **Nutrition tracking** - Track daily nutrition intake
- [ ] **Recipe suggestions by season** - Seasonal ingredient recommendations

### 18. Integrations
- [ ] **Grocery delivery integration** - Order missing ingredients directly
- [ ] **Smart home integration** - Sync with Alexa/Google Home
- [ ] **Fitness app integration** - Sync nutrition data with health apps

## ⚡ Quick Wins (Can be done immediately)

- [ ] **Update app title and meta tags** - Better SEO and branding
- [ ] **Add app favicon** - Professional browser icon
- [ ] **Improve button styles** - More consistent design system
- [ ] **Add recipe difficulty indicators** - Easy/Medium/Hard labels
- [ ] **Implement recipe prep time filtering** - Filter by cooking time

## 🎨 Design & Branding

- [ ] **Create consistent color scheme** - Professional brand colors
- [ ] **Design app logo** - Memorable brand identity
- [ ] **Improve typography** - Better font choices and hierarchy
- [ ] **Add dark mode support** - Popular user request
- [ ] **Create loading animations** - Better perceived performance

## 🚀 MVP Launch Ready

**Core functionality working:**
- ✅ Photo upload with HEIC conversion
- ✅ AI ingredient detection (Claude Vision)
- ✅ Recipe generation with dietary preferences
- ✅ User authentication (Google OAuth)
- ✅ Subscription tiers (Basic/Premium)
- ✅ Adaptive recipe filtering (0-2 ingredients max)
- ✅ Mobile-responsive design

**MVP Launch Blockers (Priority 1):**
- [ ] **Recipe detail modal** - Users can't see full recipes
- [ ] **Stripe production setup** - Can't process real payments
- [ ] **Production deployment** - Not accessible to users

## 📊 Current Status

✅ **Completed:**
- Subscription tier system (Basic/Premium)
- Spoonacular API integration
- HEIC photo conversion for iPhone
- User preferences filtering
- Adaptive recipe filtering (0-2 ingredient max)
- Basic meal planning interface
- Image upload with drag & drop
- Claude Vision API integration for ingredient detection
- Google OAuth authentication
- Profile onboarding flow with preferences

🟡 **In Progress:**
- Testing preferences with API credits restored

❌ **MVP Blockers:**
- Recipe detail view (users can't see instructions)
- Stripe production setup (can't charge users)
- Deployment configuration

## 🏆 Success Metrics

Track these KPIs to measure app success:
- User sign-up conversion rate
- Premium subscription conversion rate
- Recipe discovery to cooking conversion
- User retention (7-day, 30-day)
- Average session duration
- Photos uploaded per user
- Recipes saved per user

---

**Next Immediate Steps:**
1. Test current app with restored API credits
2. Implement recipe detail view modal
3. Set up real AI image analysis service
4. Configure Stripe for production payments