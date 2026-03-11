# Environmental Performance Profiling System

## Overview

The Environmental Performance Profiling System analyzes how weather conditions affect running performance and builds personalized environmental profiles for users. This system implements Requirements 14.1-14.5 from the advanced training metrics specification.

## Key Features

### 1. Personal Heat Tolerance and Cold Adaptation Profiles (Req 14.1)
- Analyzes performance across different temperature ranges
- Calculates heat adaptation scores (0-100)
- Determines optimal temperature ranges for each user
- Tracks improvement trends over time

### 2. Optimal Condition Identification (Req 14.2)
- Identifies optimal temperature, humidity, and wind speed ranges
- Provides confidence scores based on data quality
- Calculates performance indices for different condition ranges

### 3. Weather Performance Pattern Analysis (Req 14.3)
- Analyzes performance patterns across user's running history
- Identifies temperature, humidity, and wind sensitivity
- Provides actionable recommendations based on patterns

### 4. Acclimatization Tracking (Req 14.4)
- Tracks heat and cold acclimatization progress over time
- Monitors improvement trends and adaptation levels
- Estimates time to reach next acclimatization level

### 5. Improvement Detection (Req 14.5)
- Detects improvements in environmental adaptation
- Tracks recent changes in performance under challenging conditions
- Provides progress history and trend analysis

## Usage Examples

### Basic Profile Generation

```typescript
import { getUserEnvironmentalProfile } from '../lib/training/environmentalProfilingIntegration';

// Get comprehensive environmental profile
const result = await getUserEnvironmentalProfile(userRuns);

console.log('Heat Tolerance:', result.profile.heatTolerance.level);
console.log('Optimal Temperature:', result.profile.optimalConditions.temperatureRange);
console.log('Patterns Found:', result.patterns.length);
```

### Current Weather Recommendations

```typescript
import { getCurrentWeatherRecommendations } from '../lib/training/environmentalProfilingIntegration';

const currentConditions = {
  temperature: 28,
  humidity: 75,
  windSpeed: 15
};

const recommendations = getCurrentWeatherRecommendations(profile, currentConditions);

console.log('Overall Rating:', recommendations.overallRating);
console.log('Pace Adjustment:', recommendations.paceAdjustment);
console.log('Hydration Advice:', recommendations.hydrationAdvice);
```

### Performance Summary for Dashboard

```typescript
import { getEnvironmentalPerformanceSummary } from '../lib/training/environmentalProfilingIntegration';

const summary = getEnvironmentalPerformanceSummary(profile);

console.log('Heat Tolerance:', summary.heatTolerance.description);
console.log('Cold Adaptation:', summary.coldAdaptation.description);
console.log('Data Quality:', summary.dataQuality.description);
```

### Weather Performance Insights

```typescript
import { getWeatherPerformanceInsights } from '../lib/training/environmentalProfilingIntegration';

const tempInsights = getWeatherPerformanceInsights(profile, 'temperature');
const humidityInsights = getWeatherPerformanceInsights(profile, 'humidity');
const windInsights = getWeatherPerformanceInsights(profile, 'wind');

console.log('Best Temperature Conditions:', tempInsights.bestConditions);
console.log('Performance Range:', tempInsights.performanceRange);
```

### Data Export

```typescript
import { exportEnvironmentalData } from '../lib/training/environmentalProfilingIntegration';

const exportData = exportEnvironmentalData(profile);

// JSON data for API integration
const jsonData = JSON.parse(exportData.jsonData);

// CSV data for spreadsheet analysis
const csvData = exportData.csvData;

// Human-readable summary
const summary = exportData.summary;
```

## Data Requirements

### Minimum Data Requirements
- **Basic Analysis**: 10+ runs with weather data
- **Comprehensive Analysis**: 20+ runs with weather data
- **High Confidence Analysis**: 50+ runs with weather data

### Required Weather Data Fields
- `temperature` (Celsius)
- `humidity` (percentage)
- `wind_speed` (km/h)

### Optional Data Fields
- `wind_direction` (degrees) - for future enhancements
- Elevation data for terrain-adjusted analysis

## Profile Structure

### Heat Tolerance Profile
```typescript
{
  level: 'low' | 'medium' | 'high',
  optimalTemperature: number,
  maxComfortableTemp: number,
  heatAdaptationScore: number, // 0-100
  improvementTrend: 'improving' | 'stable' | 'declining'
}
```

### Cold Adaptation Profile
```typescript
{
  level: 'low' | 'medium' | 'high',
  minComfortableTemp: number,
  coldAdaptationScore: number, // 0-100
  improvementTrend: 'improving' | 'stable' | 'declining'
}
```

### Optimal Conditions
```typescript
{
  temperatureRange: { min: number; max: number },
  humidityRange: { min: number; max: number },
  windSpeedMax: number,
  confidenceScore: number // 0-1
}
```

### Performance Data
Each condition type (temperature, humidity, wind) includes:
- Range categorization (e.g., "15-20°C", "40-60%")
- Run count in each range
- Average original and adjusted paces
- Performance index (0-100, relative to personal best)
- Pace variability (standard deviation)
- Confidence level (0-1)

## Integration Points

### Dashboard Integration
- Display heat tolerance and cold adaptation levels
- Show optimal conditions summary
- Provide current weather recommendations
- Display acclimatization progress

### Insights Page Integration
- Add environmental performance tab
- Show detailed performance breakdowns by condition
- Display weather performance patterns
- Provide historical acclimatization trends

### Run Details Integration
- Show environmental impact on individual runs
- Display adjusted pace calculations
- Provide context for performance in specific conditions

## Performance Considerations

### Calculation Efficiency
- Profiles are calculated on-demand with caching support
- Expensive calculations (trend analysis) use memoization
- Batch processing for historical data migration

### Data Quality Management
- Graceful handling of missing weather data
- Confidence scoring for all calculations
- Data quality indicators in UI

### Memory Usage
- Progress history limited to last 10 data points
- Efficient data structures for large datasets
- Optional data compression for storage

## Testing

The system includes comprehensive test coverage:
- **Core Functions**: 30 tests covering all calculation functions
- **Integration**: 16 tests covering user-facing functions
- **Edge Cases**: Handling of invalid data, insufficient data, extreme values
- **Performance**: Validation against known benchmarks

Run tests with:
```bash
npm test -- src/lib/training/__tests__/environmentalProfiling*.test.ts
```

## Future Enhancements

### Planned Features
- Wind direction analysis (headwind/tailwind/crosswind)
- Altitude/elevation impact analysis
- Seasonal adaptation tracking
- Race condition optimization

### Data Integration Opportunities
- Sleep quality correlation with environmental adaptation
- Heart rate variability impact on heat tolerance
- Nutrition/hydration effectiveness in different conditions
- Training load interaction with environmental stress

## References

The environmental profiling system is based on established sports science research:
- Temperature impact factors from heat stress studies
- Humidity adjustments based on thermoregulation research
- Wind resistance calculations from aerodynamics studies
- Acclimatization timelines from adaptation physiology

All calculation methods are documented with academic references in the code comments.