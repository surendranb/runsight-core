import React from 'react';
import { User, EnrichedRun } from '../../types';
import { InsightsTab } from './InsightsTabNavigation';

// Import existing insight components
import { ActionableInsightCard } from './ActionableInsightCard';
import { InsightSummaryCard } from './InsightSummaryCard';
import { MonthlySummaryTable } from './MonthlySummaryTable';
import { PersonalRecordsInsight } from './PersonalRecordsInsight';
import { AdvancedPerformanceInsight } from './AdvancedPerformanceInsight';
import { ConsistencyInsight } from './ConsistencyInsight';
import { PerformanceWeatherInsight } from './PerformanceWeatherInsight';
import { TimeOfDayInsight } from './TimeOfDayInsight';
import { ElevationEffortInsight } from './ElevationEffortInsight';
import { WindPerformanceInsight } from './WindPerformanceInsight';
import { LocationIntelligenceInsight } from './LocationIntelligenceInsight';
import { WorkoutTypePerformanceInsight } from './WorkoutTypePerformanceInsight';
import { PerformancePatternsInsight } from './PerformancePatternsInsight';
import { RecentRunsTable } from './RecentRunsTable';
import { TrainingRecommendations } from './TrainingRecommendations';
import { EnvironmentalSummary } from './EnvironmentalSummary';

// Import actionable insights engine
import { 
  getActionableInsights, 
  getPrioritizedInsights, 
  getMostImportantInsights,
  getInsightCategories,
  InsightFilter 
} from '../../lib/insights/actionableInsightsEngine';

// Import insight categorization utilities
import { 
  getPerformanceInsights,
  getTrainingInsights,
  getEnvironmentInsights
} from '../../lib/insights/insightCategorization';

import { Lightbulb, ChevronLeft, ChevronRight, Grid3X3, List, FileText, TrendingUp, CloudRain, Calendar, MapPin, Clock } from 'lucide-react';
import { Section, EmphasisBox, visualHierarchy } from '../common/VisualHierarchy';
import { ProgressiveHelp, HelpIcon } from '../common/ContextualHelp';

interface InsightsTabContentProps {
  activeTab: InsightsTab;
  user: User;
  runs: EnrichedRun[];
  className?: string;
}

interface OverviewTabProps {
  user: User;
  runs: EnrichedRun[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ user, runs }) => {
  const [viewMode, setViewMode] = React.useState<'most-important' | 'all' | 'filtered'>('most-important');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedPriority, setSelectedPriority] = React.useState<string>('all');
  const [onlyActionable, setOnlyActionable] = React.useState<boolean>(false);
  const [minConfidence, setMinConfidence] = React.useState<number>(0.6);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [displayMode, setDisplayMode] = React.useState<'cards' | 'summary' | 'grouped'>('summary');
  
  const INSIGHTS_PER_PAGE = 7;
  const insightCategories = React.useMemo(() => getInsightCategories(), []);
  
  const allInsights = React.useMemo(() => {
    if (viewMode === 'most-important') {
      return getMostImportantInsights(runs);
    }
    
    if (viewMode === 'all') {
      return getActionableInsights(runs);
    }
    
    const filter: InsightFilter = {
      categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
      priorities: selectedPriority !== 'all' ? [selectedPriority] : undefined,
      onlyActionable: onlyActionable || undefined,
      minConfidence: minConfidence
    };
    
    return getPrioritizedInsights(runs, filter);
  }, [runs, viewMode, selectedCategory, selectedPriority, onlyActionable, minConfidence]);

  const totalPages = Math.ceil(allInsights.length / INSIGHTS_PER_PAGE);
  const startIndex = (currentPage - 1) * INSIGHTS_PER_PAGE;
  const endIndex = startIndex + INSIGHTS_PER_PAGE;
  const displayedInsights = allInsights.slice(startIndex, endIndex);

  const groupedInsights = React.useMemo(() => {
    const groups = displayedInsights.reduce((acc, insight) => {
      if (!acc[insight.category]) {
        acc[insight.category] = [];
      }
      acc[insight.category].push(insight);
      return acc;
    }, {} as Record<string, typeof displayedInsights>);
    
    return groups;
  }, [displayedInsights]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, selectedCategory, selectedPriority, onlyActionable, minConfidence]);
  
  const handleInsightAction = (insightId: string, action: string) => {
    console.log(`Insight ${insightId} action: ${action}`);
  };

  return (
    <div className="space-y-8">
      {/* Actionable Insights Section */}
      {displayedInsights.length > 0 && (
        <Section
          title="Actionable Insights"
          subtitle="Prioritized by potential impact, confidence, and actionability to help you make the biggest improvements to your running."
          level={2}
          icon={Lightbulb}
          badge={{
            text: `${allInsights.length} total insights`,
            color: 'yellow'
          }}
          actions={
            <HelpIcon 
              content="These insights are prioritized by potential impact, confidence, and actionability to help you make the biggest improvements to your running."
              size="md"
            />
          }
          className="mb-8"
        >
          <div className={visualHierarchy.spacing.md}>
            {/* View Mode and Display Controls */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('most-important')}
                  className={`min-h-[44px] min-w-[44px] px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2 ${
                    viewMode === 'most-important'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <span className="whitespace-nowrap">Most Important</span>
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`min-h-[44px] min-w-[44px] px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2 ${
                    viewMode === 'all'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <span className="whitespace-nowrap">All Insights</span>
                </button>
                <button
                  onClick={() => setViewMode('filtered')}
                  className={`min-h-[44px] min-w-[44px] px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2 ${
                    viewMode === 'filtered'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <span className="whitespace-nowrap">Custom Filter</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Display:</span>
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setDisplayMode('summary')}
                    className={`min-h-[44px] min-w-[44px] p-3 rounded-md transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:p-2 ${
                      displayMode === 'summary'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    title="Summary cards with progressive disclosure"
                  >
                    <FileText className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={() => setDisplayMode('cards')}
                    className={`min-h-[44px] min-w-[44px] p-3 rounded-md transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:p-2 ${
                      displayMode === 'cards'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    title="Full card view"
                  >
                    <Grid3X3 className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={() => setDisplayMode('grouped')}
                    className={`min-h-[44px] min-w-[44px] p-3 rounded-md transition-all duration-200 select-none md:min-h-[36px] md:min-w-[36px] md:p-2 ${
                      displayMode === 'grouped'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 active:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    title="Grouped by category"
                  >
                    <List className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filtering Options */}
            {viewMode === 'filtered' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full min-h-[44px] text-sm border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 cursor-pointer select-none md:min-h-[36px] md:px-3 md:py-2"
                    >
                      <option value="all">All Categories</option>
                      {insightCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                      className="w-full min-h-[44px] text-sm border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all duration-200 cursor-pointer select-none md:min-h-[36px] md:px-3 md:py-2"
                    >
                      <option value="all">All Priorities</option>
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Confidence: {(minConfidence * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.1"
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                      className="w-full h-6 cursor-pointer appearance-none bg-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={onlyActionable}
                        onChange={(e) => setOnlyActionable(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span>Only Actionable</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode Descriptions */}
            <div className="mb-6">
              {viewMode === 'most-important' && (
                <ProgressiveHelp
                  title="Most Important Insights"
                  basicExplanation="These are your top 4 insights, automatically prioritized by potential impact on your running performance."
                  detailedExplanation="Our algorithm considers impact potential, data confidence, actionability, and urgency to surface the insights that matter most for your training. Use summary view for quick scanning or expand individual insights for details."
                  examples={[
                    "High-impact performance improvements you can make immediately",
                    "Health insights that could prevent injury",
                    "Training adjustments with the biggest potential benefit"
                  ]}
                  className="mb-4"
                />
              )}
              
              {viewMode === 'all' && (
                <ProgressiveHelp
                  title="All Available Insights"
                  basicExplanation="Complete list of insights from your running data, automatically prioritized by importance. Maximum 7 insights per page to reduce cognitive load."
                  detailedExplanation="All insights that meet minimum confidence and sample size requirements, sorted by their potential impact on your running. Use pagination to browse through all insights."
                  examples={[
                    "Performance trends and patterns",
                    "Training consistency analysis",
                    "Achievement celebrations and milestones"
                  ]}
                  className="mb-4"
                />
              )}
              
              {viewMode === 'filtered' && (
                <ProgressiveHelp
                  title="Custom Filtered Insights"
                  basicExplanation="Filter insights by category, priority, confidence level, and actionability to focus on what matters to you. Results are paginated to show maximum 7 insights at once."
                  detailedExplanation="Use the filters above to narrow down insights based on your current training focus and preferences. The summary view helps you quickly scan through filtered results."
                  examples={[
                    "Focus on only performance insights for race preparation",
                    "Show only high-confidence insights for reliable guidance",
                    "Filter for actionable insights you can implement immediately"
                  ]}
                  className="mb-4"
                />
              )}
            </div>

            {/* Insights Display */}
            {displayMode === 'summary' ? (
              <div className="space-y-4">
                {displayedInsights.map((insight) => (
                  <InsightSummaryCard
                    key={insight.id}
                    insight={insight}
                    onAction={handleInsightAction}
                  />
                ))}
              </div>
            ) : displayMode === 'cards' ? (
              <div className="space-y-6">
                {displayedInsights.map((insight) => (
                  <ActionableInsightCard
                    key={insight.id}
                    insight={insight}
                    onAction={handleInsightAction}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedInsights).map(([category, categoryInsights]) => {
                  const categoryInfo = insightCategories.find(c => c.value === category);
                  return (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 capitalize">
                              {categoryInfo?.label || category}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {categoryInfo?.description || `Insights related to ${category}`}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {categoryInsights.length} insight{categoryInsights.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        {categoryInsights.map((insight) => (
                          <div key={insight.id} className="p-6">
                            <ActionableInsightCard
                              insight={insight}
                              onAction={handleInsightAction}
                              className="border-0 shadow-none bg-transparent p-0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, allInsights.length)} of {allInsights.length} insights
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {allInsights.length === 0 && (
              <EmphasisBox
                variant="info"
                title="No Insights Available"
                icon={Lightbulb}
                priority="low"
              >
                <p className="mb-2">No insights match your current criteria.</p>
                <p className="text-sm">
                  {viewMode === 'filtered' 
                    ? 'Try adjusting your filters or switch to "All Insights" view.'
                    : 'More insights will appear as you add more running data.'
                  }
                </p>
              </EmphasisBox>
            )}
          </div>
        </Section>
      )}

      {/* Monthly Summary */}
      <MonthlySummaryTable runs={runs} />
    </div>
  );
};

const PerformanceTab: React.FC<{ runs: EnrichedRun[], user: User }> = ({ runs, user }) => {
  // Get performance-related insights from actionable insights
  const allInsights = React.useMemo(() => getActionableInsights(runs), [runs]);
  const performanceInsights = React.useMemo(() => 
    getPerformanceInsights(allInsights), [allInsights]
  );

  return (
    <div className="space-y-6">
      {/* Performance Insights Section */}
      {performanceInsights.length > 0 && (
        <Section
          title="Performance Insights"
          subtitle={`Key insights about your pace, speed, and running improvements from your last ${runs.length} runs`}
          level={2}
          icon={TrendingUp}
          badge={{
            text: `${performanceInsights.length} insights`,
            color: 'blue'
          }}
          className="mb-6"
        >
          <div className="space-y-4">
            {performanceInsights.map((insight) => (
              <InsightSummaryCard
                key={insight.id}
                insight={insight}
                onAction={(insightId, action) => console.log(`Performance insight ${insightId} action: ${action}`)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Personal Records with Context */}
      <PersonalRecordsInsight runs={runs} />
      
      {/* Performance Patterns - Simplified Advanced Metrics */}
      <PerformancePatternsInsight runs={runs} />
    </div>
  );
};

const TrainingTab: React.FC<{ runs: EnrichedRun[] }> = ({ runs }) => {
  // Get training-related insights from actionable insights
  const allInsights = React.useMemo(() => getActionableInsights(runs), [runs]);
  const trainingInsights = React.useMemo(() => 
    getTrainingInsights(allInsights), [allInsights]
  );

  return (
    <div className="space-y-6">
      {/* Training Insights Section */}
      {trainingInsights.length > 0 && (
        <Section
          title="Training Insights"
          subtitle="Insights about your training consistency, recovery patterns, and frequency"
          level={2}
          icon={Calendar}
          badge={{
            text: `${trainingInsights.length} insights`,
            color: 'green'
          }}
          className="mb-6"
        >
          <div className="space-y-4">
            {trainingInsights.map((insight) => (
              <InsightSummaryCard
                key={insight.id}
                insight={insight}
                onAction={(insightId, action) => console.log(`Training insight ${insightId} action: ${action}`)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Training Consistency Analysis - Enhanced existing component */}
      <ConsistencyInsight runs={runs} />
      
      {/* Recent Runs Table */}
      <RecentRunsTable runs={runs} />
      
      {/* Training Recommendations */}
      <TrainingRecommendations runs={runs} />
    </div>
  );
};

const EnvironmentTab: React.FC<{ runs: EnrichedRun[] }> = ({ runs }) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'weather' | 'location' | 'timing'>('weather');
  
  // Get environment-related insights from actionable insights
  const allInsights = React.useMemo(() => getActionableInsights(runs), [runs]);
  const environmentInsights = React.useMemo(() => 
    getEnvironmentInsights(allInsights), [allInsights]
  );

  const subTabs = [
    // HIDDEN: Overview sub-tab - insights now distributed to main Environment insights section above
    // { id: 'overview', label: 'Overview', icon: CloudRain },
    { id: 'weather', label: 'Weather', icon: CloudRain },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'timing', label: 'Timing', icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Environmental Summary - Always at top */}
      <EnvironmentalSummary runs={runs} />

      {/* Environment Insights Section */}
      {environmentInsights.length > 0 && (
        <Section
          title="Environmental Insights"
          subtitle="How weather, location, and timing affect your running performance"
          level={2}
          icon={CloudRain}
          badge={{
            text: `${environmentInsights.length} insights`,
            color: 'cyan'
          }}
          className="mb-6"
        >
          <div className="space-y-4">
            {environmentInsights.map((insight) => (
              <InsightSummaryCard
                key={insight.id}
                insight={insight}
                onAction={(insightId, action) => console.log(`Environment insight ${insightId} action: ${action}`)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Sub-tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {subTabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all duration-200 min-h-[44px] min-w-[44px] select-none ${
                  activeSubTab === tab.id
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <IconComponent className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub-tab Content */}
      <div className="mt-6">
        {/* HIDDEN: Overview sub-tab content - insights now in main Environmental Insights section */}
        {/* 
        {activeSubTab === 'overview' && (
          <div className="space-y-6">
            <PerformanceWeatherInsight runs={runs} />
            <LocationIntelligenceInsight runs={runs} />
          </div>
        )}
        */}
        
        {activeSubTab === 'weather' && (
          <div className="space-y-6">
            <PerformanceWeatherInsight runs={runs} />
            <WindPerformanceInsight runs={runs} />
          </div>
        )}
        
        {activeSubTab === 'location' && (
          <div className="space-y-6">
            <LocationIntelligenceInsight runs={runs} />
            <ElevationEffortInsight runs={runs} />
          </div>
        )}
        
        {activeSubTab === 'timing' && (
          <div className="space-y-6">
            <TimeOfDayInsight runs={runs} />
          </div>
        )}
      </div>
    </div>
  );
};

const AnalysisTab: React.FC<{ runs: EnrichedRun[] }> = ({ runs }) => (
  <div className="space-y-6">
    <WorkoutTypePerformanceInsight runs={runs} />
  </div>
);

export const InsightsTabContent: React.FC<InsightsTabContentProps> = ({
  activeTab,
  user,
  runs,
  className = ''
}) => {
  const renderTabContent = () => {
    switch (activeTab) {
      // HIDDEN: Overview tab - content redistributed to other tabs
      // case 'overview':
      //   return <OverviewTab user={user} runs={runs} />;
      case 'performance':
        return <PerformanceTab runs={runs} user={user} />;
      case 'training':
        return <TrainingTab runs={runs} />;
      case 'environment':
        return <EnvironmentTab runs={runs} />;
      // HIDDEN: Analysis tab - sparse content, not valuable
      // case 'analysis':
      //   return <AnalysisTab runs={runs} />;
      default:
        // Default to Performance tab instead of Overview
        return <PerformanceTab runs={runs} user={user} />;
    }
  };

  return (
    <div 
      className={className}
      role="tabpanel"
      id={`${activeTab}-panel`}
      aria-labelledby={`${activeTab}-tab`}
    >
      {renderTabContent()}
    </div>
  );
};