import React, { useMemo } from 'react';
import { Target, CheckCircle, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { Section } from '../common/VisualHierarchy';
import { analyzeConsistency } from '../../lib/insights/consistencyUtils';

interface TrainingRecommendationsProps {
  runs: EnrichedRun[];
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'frequency' | 'recovery' | 'variety' | 'progression';
  actionable: boolean;
}

export const TrainingRecommendations: React.FC<TrainingRecommendationsProps> = ({ runs }) => {
  const consistencyAnalysis = useMemo(() => analyzeConsistency(runs), [runs]);
  
  const recommendations = useMemo((): Recommendation[] => {
    if (runs.length < 3) {
      return [{
        id: 'get_started',
        title: 'Build Your Running Base',
        description: 'Start with 3 runs per week, focusing on easy pace and consistency rather than speed or distance.',
        priority: 'high',
        category: 'frequency',
        actionable: true
      }];
    }

    const recs: Recommendation[] = [];
    
    // Frequency recommendations
    if (consistencyAnalysis.frequency.runsPerWeek < 3) {
      recs.push({
        id: 'increase_frequency',
        title: 'Increase Running Frequency',
        description: 'Aim for at least 3 runs per week to build aerobic fitness and running habit. Add one short, easy run to your current schedule.',
        priority: 'high',
        category: 'frequency',
        actionable: true
      });
    } else if (consistencyAnalysis.frequency.runsPerWeek > 6) {
      recs.push({
        id: 'consider_rest',
        title: 'Consider More Rest Days',
        description: 'Running more than 6 times per week increases injury risk. Consider adding rest days or cross-training activities.',
        priority: 'medium',
        category: 'recovery',
        actionable: true
      });
    }

    // Gap analysis
    if (consistencyAnalysis.frequency.averageGapDays > 3) {
      recs.push({
        id: 'reduce_gaps',
        title: 'Reduce Long Gaps Between Runs',
        description: 'Try to avoid gaps longer than 2-3 days between runs to maintain fitness and momentum.',
        priority: 'medium',
        category: 'frequency',
        actionable: true
      });
    }

    // Consistency recommendations
    if (consistencyAnalysis.consistencyScore < 60) {
      recs.push({
        id: 'improve_consistency',
        title: 'Focus on Consistency',
        description: 'Consistent, shorter runs are better than sporadic long runs. Set a realistic weekly schedule and stick to it.',
        priority: 'high',
        category: 'frequency',
        actionable: true
      });
    }

    // Distance variety analysis
    const distances = runs.map(run => run.distance);
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const distanceVariance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    const distanceCV = Math.sqrt(distanceVariance) / avgDistance;

    if (distanceCV < 0.3) {
      recs.push({
        id: 'add_variety',
        title: 'Add Training Variety',
        description: 'Mix up your run distances. Include one long run per week, some shorter faster runs, and vary your routes.',
        priority: 'medium',
        category: 'variety',
        actionable: true
      });
    }

    // Recovery recommendations based on consecutive days
    const sortedRuns = [...runs].sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );
    
    let consecutiveDays = 0;
    for (let i = 1; i < sortedRuns.length; i++) {
      const gap = (new Date(sortedRuns[i].start_date_local).getTime() - 
                   new Date(sortedRuns[i-1].start_date_local).getTime()) / (1000 * 60 * 60 * 24);
      if (gap < 1) consecutiveDays++;
    }

    if (consecutiveDays > runs.length * 0.4) {
      recs.push({
        id: 'recovery_focus',
        title: 'Prioritize Recovery',
        description: 'You run on consecutive days frequently. Consider adding rest days or easy recovery runs between harder efforts.',
        priority: 'medium',
        category: 'recovery',
        actionable: true
      });
    }

    // Progression recommendations
    if (runs.length >= 10) {
      const recentRuns = runs.slice(-5);
      const olderRuns = runs.slice(0, Math.max(1, runs.length - 5));
      
      const recentAvgDistance = recentRuns.reduce((sum, run) => sum + run.distance, 0) / recentRuns.length;
      const olderAvgDistance = olderRuns.reduce((sum, run) => sum + run.distance, 0) / olderRuns.length;
      
      const increase = (recentAvgDistance - olderAvgDistance) / olderAvgDistance;
      
      if (increase > 0.15) {
        recs.push({
          id: 'slow_progression',
          title: 'Slow Down Distance Progression',
          description: 'You\'re increasing distance rapidly. Follow the 10% rule: increase weekly distance by no more than 10% each week.',
          priority: 'high',
          category: 'progression',
          actionable: true
        });
      } else if (Math.abs(increase) < 0.05 && runs.length >= 20) {
        recs.push({
          id: 'gradual_progression',
          title: 'Consider Gradual Progression',
          description: 'Your distances have been stable. Consider gradually increasing your long run distance to build endurance.',
          priority: 'low',
          category: 'progression',
          actionable: true
        });
      }
    }

    // General recommendations if no specific issues
    if (recs.length === 0) {
      recs.push({
        id: 'maintain_consistency',
        title: 'Maintain Your Great Consistency',
        description: 'Your training looks well-balanced! Keep up the consistent effort and consider setting a new goal to stay motivated.',
        priority: 'low',
        category: 'frequency',
        actionable: true
      });
    }

    return recs.slice(0, 5); // Limit to top 5 recommendations
  }, [runs, consistencyAnalysis]);

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Info className="w-4 h-4 text-yellow-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-green-200 bg-green-50';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'frequency': return 'Frequency';
      case 'recovery': return 'Recovery';
      case 'variety': return 'Variety';
      case 'progression': return 'Progression';
      default: return 'General';
    }
  };

  return (
    <Section
      title="Training Recommendations"
      subtitle="Personalized suggestions to improve your training based on your running patterns"
      level={2}
      icon={Target}
      badge={{
        text: `${recommendations.length} recommendations`,
        color: 'purple'
      }}
      className="mb-6"
    >
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div 
            key={rec.id} 
            className={`p-4 border rounded-lg ${getPriorityColor(rec.priority)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                {getPriorityIcon(rec.priority)}
                <h4 className="font-medium text-gray-800 ml-2">{rec.title}</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-white rounded text-gray-600">
                {getCategoryLabel(rec.category)}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {rec.description}
            </p>
            {rec.actionable && (
              <div className="mt-2 flex items-center text-xs text-gray-600">
                <Lightbulb className="w-3 h-3 mr-1" />
                <span>Actionable recommendation</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Training Philosophy */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center">
          <Target className="w-4 h-4 mr-2" />
          Training Philosophy
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Consistency beats intensity:</strong> Regular, easy runs build your aerobic base</p>
          <p>• <strong>80/20 rule:</strong> 80% of runs should be at an easy, conversational pace</p>
          <p>• <strong>Progressive overload:</strong> Gradually increase distance or intensity, not both at once</p>
          <p>• <strong>Listen to your body:</strong> Rest days are when your body adapts and gets stronger</p>
        </div>
      </div>
    </Section>
  );
};