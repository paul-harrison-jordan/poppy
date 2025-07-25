import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Target, 
  Users, 
  Lightbulb,
  BarChart3,
  Calendar,
  Star
} from 'lucide-react';

interface PMDashboardProps {
  features: Array<{
    id: number;
    title?: string;
    shipped: boolean;
    created_at?: string;
    roadmap?: {
      status?: string;
      target_quarter?: string;
      weeks_to_ship?: number;
      business_value_score?: number;
    }
  }>;
}

export default function PMDashboard({ features }: PMDashboardProps) {
  // Calculate metrics
  const totalFeatures = features.length;
  const shippedFeatures = features.filter(f => f.shipped).length;
  const inProgressFeatures = features.filter(f => 
    !f.shipped && f.roadmap?.status && ['in-progress', 'development'].includes(f.roadmap.status)
  ).length;
  const plannedFeatures = features.filter(f => 
    !f.shipped && f.roadmap?.status === 'planned'
  ).length;

  const avgBusinessValue = features.reduce((acc, f) => 
    acc + (f.roadmap?.business_value_score || 0), 0
  ) / Math.max(totalFeatures, 1);

  const avgWeeksToShip = features
    .filter(f => f.roadmap?.weeks_to_ship)
    .reduce((acc, f) => acc + (f.roadmap?.weeks_to_ship || 0), 0) / 
    Math.max(features.filter(f => f.roadmap?.weeks_to_ship).length, 1);

  const shipRate = totalFeatures > 0 ? (shippedFeatures / totalFeatures) * 100 : 0;

  const metrics = [
    {
      icon: CheckCircle,
      label: 'Features Shipped',
      value: shippedFeatures,
      total: totalFeatures,
      color: 'text-sprout',
      bgColor: 'bg-sprout/10',
      description: `${shipRate.toFixed(0)}% completion rate`
    },
    {
      icon: Clock,
      label: 'In Progress',
      value: inProgressFeatures,
      color: 'text-poppy',
      bgColor: 'bg-poppy/10',
      description: 'Active development'
    },
    {
      icon: Target,
      label: 'Planned',
      value: plannedFeatures,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Ready for dev'
    },
    {
      icon: TrendingUp,
      label: 'Avg Business Value',
      value: avgBusinessValue.toFixed(1),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Out of 10'
    },
    {
      icon: Calendar,
      label: 'Avg Time to Ship',
      value: avgWeeksToShip.toFixed(1),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Weeks'
    }
  ];

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-poppy to-sprout rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">PM Portfolio Overview</h2>
          <p className="text-sm text-gray-600">Your feature development metrics at a glance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${metric.bgColor} rounded-lg p-4 border border-gray-100`}
            >
              <div className="flex items-center gap-3 mb-2">
                <IconComponent className={`w-5 h-5 ${metric.color}`} />
                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
              </div>
              <div className="mb-1">
                <span className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </span>
                {metric.total && (
                  <span className="text-sm text-gray-500 ml-1">
                    / {metric.total}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">{metric.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg p-4 border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">Performance</span>
          </div>
          <div className="text-lg font-bold text-gray-900 mb-1">
            {shipRate >= 80 ? 'Excellent' : shipRate >= 60 ? 'Good' : 'Needs Focus'}
          </div>
          <p className="text-xs text-gray-600">
            {shipRate >= 80 
              ? 'High delivery rate, great execution!' 
              : shipRate >= 60 
                ? 'Solid progress, room for improvement'
                : 'Consider reviewing roadmap priorities'
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg p-4 border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Focus Areas</span>
          </div>
          <div className="text-lg font-bold text-gray-900 mb-1">
            {inProgressFeatures > plannedFeatures ? 'Execution' : 'Planning'}
          </div>
          <p className="text-xs text-gray-600">
            {inProgressFeatures > plannedFeatures
              ? 'More features in dev than planned'
              : 'Strong pipeline of planned features'
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg p-4 border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">Impact Score</span>
          </div>
          <div className="text-lg font-bold text-gray-900 mb-1">
            {avgBusinessValue >= 8 ? 'High' : avgBusinessValue >= 6 ? 'Medium' : 'Mixed'}
          </div>
          <p className="text-xs text-gray-600">
            Average business value: {avgBusinessValue.toFixed(1)}/10
          </p>
        </motion.div>
      </div>
    </div>
  );
}