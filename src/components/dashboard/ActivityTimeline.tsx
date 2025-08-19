import React from 'react';
import { MapPin, Clock, Zap, Heart, Cloud, Sun, CloudRain, ChevronLeft, ChevronRight } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { formatRunDate } from '../../lib/dateUtils';

interface ActivityTimelineProps {
  activities: EnrichedRun[];
  limit?: number;
  showWeather?: boolean;
  colorCodeByPerformance?: boolean;
  showPagination?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  limit = 10,
  showWeather = true,
  colorCodeByPerformance = true,
  showPagination = true
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = limit;

  // Calculate pagination
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayActivities = activities.slice(startIndex, endIndex);

  // Reset to page 1 when activities change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activities.length]);



  // Calculate average pace for performance comparison
  const avgPace = React.useMemo(() => {
    if (activities.length === 0) return 0;
    const totalPaceSeconds = activities.reduce((sum, run) => {
      return sum + (run.moving_time / (run.distance / 1000));
    }, 0);
    return totalPaceSeconds / activities.length;
  }, [activities]);

  const formatDistance = (meters: number) => (meters / 1000).toFixed(2);
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatPace = (distance: number, time: number) => {
    if (distance === 0 || time === 0) return '0:00';
    const paceSeconds = time / (distance / 1000);
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };



  const getPerformanceColor = (run: EnrichedRun) => {
    if (!colorCodeByPerformance) return 'border-gray-200 bg-white';

    const runPace = run.moving_time / (run.distance / 1000);
    const performanceRatio = runPace / avgPace;

    if (performanceRatio < 0.95) return 'border-green-400 bg-green-50'; // Faster than average
    if (performanceRatio > 1.05) return 'border-red-400 bg-red-50'; // Slower than average
    return 'border-blue-400 bg-blue-50'; // Around average
  };

  const getPerformanceIndicator = (run: EnrichedRun) => {
    if (!colorCodeByPerformance) return null;

    const runPace = run.moving_time / (run.distance / 1000);
    const performanceRatio = runPace / avgPace;

    if (performanceRatio < 0.95) return { emoji: '💚', label: 'Great run!' };
    if (performanceRatio > 1.05) return { emoji: '❤️', label: 'Tough run' };
    return { emoji: '💛', label: 'Good run' };
  };

  const getWeatherIcon = (weatherData: any) => {
    if (!weatherData) return <Cloud className="w-4 h-4 text-gray-400" />;

    const condition = weatherData.weather?.main || weatherData.main || '';
    const iconCode = weatherData.weather?.icon || weatherData.icon || '';

    if (condition.toLowerCase().includes('rain') || iconCode.includes('d')) {
      return <CloudRain className="w-4 h-4 text-blue-500" />;
    }
    if (condition.toLowerCase().includes('cloud')) {
      return <Cloud className="w-4 h-4 text-gray-500" />;
    }
    return <Sun className="w-4 h-4 text-yellow-500" />;
  };

  const getWeatherTemp = (weatherData: any) => {
    if (!weatherData || weatherData.temperature === undefined) return null;
    return Math.round(weatherData.temperature);
  };

  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No recent activities to display</p>
      </div>
    );
  }

  return (
    <div>
      {showPagination && activities.length > itemsPerPage && (
        <div className="mb-4 text-center">
          <span className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, activities.length)} of {activities.length} activities
          </span>
        </div>
      )}

      <div className="space-y-3">
        {displayActivities.map((run) => {
          const weather = run.weather_data as any;
          const temp = getWeatherTemp(weather);

          return (
            <div
              key={run.id}
              className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-opacity-80 cursor-pointer group ${getPerformanceColor(run)}`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate group-hover:text-gray-700 transition-colors">{run.name}</h4>
                    {getPerformanceIndicator(run) && (
                      <div className="flex items-center space-x-1">
                        <span className="text-lg" title={getPerformanceIndicator(run)?.label}>
                          {getPerformanceIndicator(run)?.emoji}
                        </span>
                      </div>
                    )}
                    {showWeather && weather && (
                      <div className="flex items-center space-x-1">
                        {getWeatherIcon(weather)}
                        {temp !== null && (
                          <span className="text-xs text-gray-600">{temp}°C</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{formatDistance(run.distance)} km</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{formatTime(run.moving_time)}</span>
                    </div>
                    <div className="flex items-center">
                      <Zap className="w-3 h-3 mr-1" />
                      <span>{formatPace(run.distance, run.moving_time)}/km</span>
                    </div>
                    {run.average_heartrate && (
                      <div className="flex items-center">
                        <Heart className="w-3 h-3 mr-1 text-red-500" />
                        <span>{Math.round(run.average_heartrate)} bpm</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500 ml-4">
                  <span>{formatRunDate(run.start_date_local)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {showPagination && totalPages > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>

            <div className="flex items-center space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2 py-1 text-sm rounded ${page === currentPage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {colorCodeByPerformance && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center">
              <div className="w-3 h-2 bg-green-100 border border-green-400 rounded mr-2"></div>
              <span>Faster than average</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-2 bg-blue-100 border border-blue-400 rounded mr-2"></div>
              <span>Around average</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-2 bg-red-100 border border-red-400 rounded mr-2"></div>
              <span>Slower than average</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};