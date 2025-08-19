# 🏗️ RunSight Web - Architecture Documentation

This document provides a comprehensive overview of RunSight Web's architecture, designed to help contributors understand the system and make informed decisions when adding features or fixing bugs.

## 🎯 Design Philosophy

RunSight Web is built with these core principles:

### Security First
- **Zero Frontend Credential Exposure:** All API keys and secrets are server-side only
- **Row Level Security (RLS):** Users can only access their own data
- **OAuth Authentication:** Secure integration with Strava
- **Input Validation:** All user inputs are validated and sanitized

### Cognitive Load Awareness
- **Progressive Disclosure:** Show essential information first, details on demand
- **Meaningful Insights:** Every visualization tells a story
- **Error Handling:** User-friendly error messages with recovery options
- **Performance:** Fast loading and responsive interactions

### Developer Experience
- **TypeScript:** Full type safety throughout the codebase
- **Modern Stack:** React 18, Vite, Tailwind CSS
- **Clear Structure:** Logical organization and naming conventions
- **Documentation:** Comprehensive guides and code comments

---

## 🏛️ System Architecture

### High-Level Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    RunSight Web                             │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)           Backend (Netlify Functions)     │
│  ┌─────────────────┐       ┌─────────────────────────────┐  │
│  │ • Dashboard     │       │ • auth-strava.js            │  │
│  │ • Insights      │  ───▶ │ • get-runs.js               │  │
│  │ • Goals         │       │ • sync-data.js              │  │
│  │ • Authentication│       │ • ai-coach.js (optional)    │  │
│  └─────────────────┘       └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                External Services                            │
├─────────────────────────────────────────────────────────────┤
│  Database              APIs                                 │
│  ┌─────────────────┐   ┌─────────────────────────────────┐  │
│  │ Supabase        │   │ • Strava API                    │  │
│  │ • PostgreSQL    │   │ • OpenWeatherMap API            │  │
│  │ • Row Level     │   │ • Google AI API (optional)      │  │
│  │   Security      │   │                                 │  │
│  │ • Real-time     │   │                                 │  │
│  └─────────────────┘   └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
```
1. User Authentication
   Browser → Netlify Function → Strava OAuth → Database

2. Data Synchronization  
   Browser → Netlify Function → Strava API → Weather API → Database

3. Data Visualization
   Browser → Netlify Function → Database → Browser (with insights)
```

---

## 📁 Project Structure

### Frontend Structure (`src/`)
```
src/
├── components/                 # React components
│   ├── common/                # Reusable UI components
│   │   ├── ErrorDisplay.tsx   # User-friendly error handling
│   │   ├── ErrorBoundary.tsx  # React error boundary
│   │   ├── ErrorToast.tsx     # Toast notifications
│   │   ├── TimePeriodSelector.tsx # Time period selection
│   │   └── VisualHierarchy.tsx # Consistent UI components
│   ├── dashboard/             # Dashboard-specific components
│   │   ├── PrimaryKPISystem.tsx # Key performance indicators
│   │   ├── PaceTrendChart.tsx  # Pace trend visualization
│   │   └── ActivityTimeline.tsx # Activity timeline
│   ├── insights/              # Insights page components
│   │   ├── InsightsTabNavigation.tsx # Tabbed navigation for insights
│   │   ├── InsightsTabContent.tsx    # Tab content organization
│   │   ├── ConsistencyInsight.tsx    # Running consistency analysis
│   │   ├── WeatherInsight.tsx        # Weather correlation analysis
│   │   └── [10+ other insights]      # Specialized insight components
│   ├── ModernDashboard.tsx    # Main dashboard component
│   ├── InsightsPage.tsx       # Insights hub
│   └── GoalsPage.tsx          # Goals tracking (future)
├── hooks/                     # Custom React hooks
│   └── useSecureAuth.ts       # Authentication state management
├── lib/                       # Utility functions and services
│   ├── debug/                 # Debugging and error analysis
│   ├── insights/              # Insight calculation utilities
│   ├── secure-api-client.ts   # API client with error handling
│   ├── production-error-handler.ts # Production error handling
│   └── [various utilities]    # Data processing, validation, etc.
├── types/                     # TypeScript type definitions
│   ├── index.ts              # Core types (User, Run, etc.)
│   └── sync.ts               # Synchronization types
└── main.tsx                  # Application entry point
```

### Backend Structure (`netlify/functions/`)
```
netlify/functions/
├── auth-strava.js            # Strava OAuth flow
│   ├── GET: Generate auth URL
│   └── POST: Exchange code for tokens
├── get-runs.js               # Fetch user runs from database
│   └── GET: Return user's runs with stats
├── sync-data.js              # Sync data from Strava
│   └── POST: Fetch and store Strava activities
└── ai-coach.js               # AI-powered insights (optional)
    └── POST: Generate coaching insights
```

### Database Structure (`supabase/migrations/`)
```
Database Tables:
├── user_tokens               # User authentication tokens
│   ├── strava_user_id (PK)
│   ├── strava_access_token
│   ├── strava_refresh_token
│   └── strava_expires_at
├── runs                      # Running activity data
│   ├── id (PK)
│   ├── strava_id (unique)
│   ├── user_id (FK)
│   ├── [activity data fields]
│   └── weather_data (JSON)
└── goals                     # User goals (future)
    ├── id (PK)
    ├── user_id (FK)
    └── [goal fields]
```

---

## 🔐 Security Architecture

### Authentication Flow
```
1. User clicks "Connect with Strava"
2. Frontend calls /auth-strava (GET)
3. Function returns Strava OAuth URL
4. User redirected to Strava for authorization
5. Strava redirects back with authorization code
6. Frontend calls /auth-strava (POST) with code
7. Function exchanges code for access/refresh tokens
8. Tokens stored in database with RLS protection
9. User session established
```

### Data Access Control
```sql
-- Row Level Security Policy Example
CREATE POLICY "Users can only access their own runs" ON runs
FOR ALL USING (auth.uid() = user_id);
```

### API Key Management
- **Frontend:** No API keys or secrets
- **Netlify Functions:** All API keys as environment variables
- **Database:** Service role key for server-side access only

---

## 📊 Data Processing Pipeline

### Sync Process
```
1. User initiates sync
2. Function fetches activities from Strava API
3. For each activity:
   a. Validate and transform data
   b. Fetch weather data (if available)
   c. Geocode location (if available)
   d. Store in database with RLS
4. Return sync results to frontend
```

### Insight Generation
```
1. Frontend requests insights
2. Function queries user's runs from database
3. Apply outlier detection and filtering
4. Calculate insights using utility functions
5. Return structured insight data
6. Frontend renders visualizations
```

### Error Handling Pipeline
```
1. Error occurs in any component
2. Production error handler categorizes error
3. User-friendly message generated
4. Recovery options provided
5. Error logged for debugging
6. User can retry or take alternative action
```

---

## 🎨 Frontend Architecture

### Component Hierarchy
```
SecureAppWrapper
├── ErrorBoundary
├── ToastProvider
└── SecureApp
    ├── NavigationBar
    ├── ModernDashboard
    │   ├── PrimaryKPISystem
    │   ├── PaceTrendChart
    │   └── ActivityTimeline
    ├── InsightsPage
    │   ├── InsightsTabNavigation
    │   ├── InsightsTabContent
    │   │   ├── OverviewTab (Actionable Insights, Monthly Summary)
    │   │   ├── PerformanceTab (Personal Records, Advanced Metrics)
    │   │   ├── TrainingTab (Consistency Analysis)
    │   │   ├── EnvironmentTab (Weather, Location, Time, Elevation, Wind)
    │   │   └── AnalysisTab (Workout Types, Advanced Analytics)
    │   └── [individual insight components]
    └── GoalsPage
```

### State Management
- **Authentication:** `useSecureAuth` hook
- **Data:** Props passed down from main components
- **UI State:** Local component state with `useState`
- **Global State:** React Context for error handling

### Styling Architecture
- **Framework:** Tailwind CSS for utility-first styling
- **Components:** Consistent design system in `VisualHierarchy.tsx`
- **Responsive:** Mobile-first design with responsive breakpoints
- **Accessibility:** WCAG-compliant color contrast and keyboard navigation

---

## 🔧 Backend Architecture

### Netlify Functions
Each function is a standalone Node.js module:

```javascript
// Function structure
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  try {
    // Function logic
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    // Error handling
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### Database Integration
- **Client:** `@supabase/supabase-js`
- **Authentication:** Service role key for server-side access
- **Queries:** Parameterized queries with RLS enforcement
- **Migrations:** Version-controlled schema changes

---

## 📈 Performance Architecture

### Frontend Optimization
- **Code Splitting:** React.lazy for route-based splitting
- **Memoization:** useMemo and useCallback for expensive calculations
- **Outlier Detection:** Filter unrealistic data points
- **Progressive Loading:** Show essential data first

### Backend Optimization
- **Chunked Processing:** Handle large datasets in batches
- **Rate Limiting:** Respect external API limits
- **Caching:** Cache weather data and geocoding results
- **Database Indexing:** Optimize queries with proper indexes

### Data Processing
- **Outlier Detection:** Statistical filtering of GPS errors
- **Data Validation:** Ensure data quality before storage
- **Efficient Queries:** Minimize database round trips
- **Pagination:** Handle large result sets efficiently

---

## 🔍 Monitoring and Debugging

### Error Tracking
- **Production Error Handler:** Categorizes and handles errors
- **Error Boundary:** Catches React component errors
- **Function Logs:** Netlify function execution logs
- **Database Logs:** Supabase query and error logs

### Performance Monitoring
- **Function Execution Time:** Monitor Netlify function performance
- **Database Query Performance:** Track slow queries in Supabase
- **Frontend Performance:** Monitor render times and user interactions

### Debugging Tools
- **Debug Console:** Built-in debugging interface (Ctrl+Shift+D)
- **Error Analysis:** Comprehensive error categorization
- **Log Correlation:** Track errors across the entire stack

---

## 🚀 Deployment Architecture

### Build Process
```
1. Environment validation (scripts/check-env.js)
2. TypeScript compilation and type checking
3. Vite build with React plugin
4. Static asset optimization
5. Netlify Functions bundling with esbuild
```

### Deployment Pipeline
```
1. Code pushed to GitHub
2. Netlify detects changes
3. Build process runs automatically
4. Functions deployed to Netlify edge
5. Static assets deployed to CDN
6. Database migrations (manual)
```

### Environment Configuration
- **Development:** Local .env file
- **Production:** Netlify environment variables
- **Database:** Supabase project configuration
- **APIs:** External service API keys

---

## 🔄 Data Models

### Core Types
```typescript
interface User {
  id: string | number;
  strava_id: number;
  name: string;
  email?: string;
}

interface EnrichedRun {
  id: string | number;
  strava_id: number;
  name: string;
  distance_meters: number;
  moving_time_seconds: number;
  start_date: string;
  weather_data?: WeatherData;
  // ... other fields
}

interface WeatherData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  weather: {
    main: string;
    description: string;
  };
}
```

### Database Schema
```sql
-- Simplified schema representation
CREATE TABLE user_tokens (
  strava_user_id BIGINT PRIMARY KEY,
  strava_access_token TEXT NOT NULL,
  strava_refresh_token TEXT NOT NULL,
  strava_expires_at BIGINT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_id BIGINT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  distance_meters REAL,
  moving_time_seconds INTEGER,
  start_date TIMESTAMPTZ,
  weather_data JSONB,
  -- ... other fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing Architecture

### Testing Strategy
- **Unit Tests:** Utility functions and data processing
- **Integration Tests:** API functions and database operations
- **End-to-End Tests:** Critical user workflows with Playwright
- **Manual Testing:** Real-world usage scenarios

### Test Structure
```
tests/
├── unit/                     # Unit tests
│   ├── lib/                 # Utility function tests
│   └── components/          # Component tests
├── integration/             # Integration tests
│   ├── api/                # API function tests
│   └── database/           # Database operation tests
└── e2e/                    # End-to-end tests
    ├── auth.test.js        # Authentication flow
    ├── sync.test.js        # Data synchronization
    └── dashboard.test.js   # Dashboard functionality
```

---

## 🔮 Future Architecture Considerations

### Scalability
- **Multi-tenant:** Support multiple users efficiently
- **Caching Layer:** Redis for frequently accessed data
- **CDN:** Global content delivery for better performance
- **Database Sharding:** Horizontal scaling for large datasets

### Feature Extensions
- **Real-time Updates:** WebSocket connections for live data
- **Mobile App:** React Native or native mobile apps
- **Advanced Analytics:** Machine learning for predictive insights
- **Social Features:** Community and sharing capabilities

### Technology Evolution
- **Framework Updates:** Keep up with React and ecosystem changes
- **Database Evolution:** Consider specialized time-series databases
- **API Evolution:** GraphQL for more flexible data fetching
- **Deployment Options:** Docker containers for self-hosting

---

## 📚 Additional Resources

### Key Dependencies
- **React 18:** Modern React with concurrent features
- **TypeScript 5.5+:** Type safety and developer experience
- **Tailwind CSS 3.4+:** Utility-first CSS framework
- **Vite 5.4+:** Fast build tool and development server
- **Supabase:** Backend-as-a-Service with PostgreSQL
- **Recharts:** React charting library for data visualization

### External APIs
- **Strava API:** Activity data and authentication
- **OpenWeatherMap API:** Historical weather data
- **Google AI API:** Optional AI-powered insights

### Development Tools
- **ESLint 9+:** Code linting and style enforcement
- **Netlify CLI:** Local development and deployment
- **Supabase CLI:** Database management and migrations

---

This architecture documentation is a living document that evolves with the project. If you have questions or suggestions for improvements, please open an issue or contribute to the documentation!