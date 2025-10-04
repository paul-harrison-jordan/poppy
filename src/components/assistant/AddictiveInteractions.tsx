import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, TrendingUp, CheckCircle2, PartyPopper } from 'lucide-react';

interface MicroInteractionData {
  improvement?: number;
  count?: number;
  title?: string;
  message?: string;
}

interface MicroInteractionProps {
  type: 'task_approved' | 'improvement_detected' | 'milestone_reached' | 'streak';
  data?: MicroInteractionData;
  onComplete?: () => void;
}

export function MicroInteraction({ type, data, onComplete }: MicroInteractionProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, type === 'milestone_reached' ? 4000 : 2500);
    
    return () => clearTimeout(timer);
  }, [type, onComplete]);

  if (!isVisible) return null;

  switch (type) {
    case 'task_approved':
      return (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-full shadow-xl animate-bounce-in flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 animate-spin" />
            <span className="font-bold text-lg">Task Approved!</span>
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>
      );

    case 'improvement_detected':
      return (
        <div className="fixed bottom-8 right-8 z-50">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-up flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold">+{data?.improvement || 5} Quality Points!</span>
          </div>
        </div>
      );

    case 'milestone_reached':
      return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20">
          <div className="bg-white p-8 rounded-2xl shadow-2xl animate-scale-in text-center max-w-md">
            <div className="text-6xl mb-4 animate-bounce">
              <PartyPopper />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {data?.title || 'Milestone Reached!'}
            </h2>
            <p className="text-gray-600 mb-4">
              {data?.message || 'Your PRD quality has significantly improved!'}
            </p>
            <div className="flex items-center justify-center gap-2 text-purple-600">
              {[...Array(5)].map((_, i) => (
                <Sparkles key={i} className="w-5 h-5 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
        </div>
      );

    case 'streak':
      return (
        <div className="fixed top-8 right-8 z-50">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-left flex items-center gap-2">
            <Zap className="w-4 h-4 animate-pulse" />
            <span className="font-bold">{data?.count || 3} in a row! 🔥</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

interface ProgressCelebrationProps {
  progress: number; // 0-100
  previousProgress: number;
  onCelebrationComplete?: () => void;
}

export function ProgressCelebration({ progress, previousProgress, onCelebrationComplete }: ProgressCelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'quarter' | 'half' | 'three_quarters' | 'complete' | null>(null);

  useEffect(() => {
    const checkMilestones = () => {
      if (previousProgress < 25 && progress >= 25) {
        setCelebrationType('quarter');
        setShowCelebration(true);
      } else if (previousProgress < 50 && progress >= 50) {
        setCelebrationType('half');
        setShowCelebration(true);
      } else if (previousProgress < 75 && progress >= 75) {
        setCelebrationType('three_quarters');
        setShowCelebration(true);
      } else if (previousProgress < 100 && progress >= 100) {
        setCelebrationType('complete');
        setShowCelebration(true);
      }
    };

    checkMilestones();
  }, [progress, previousProgress]);

  const getMilestoneData = () => {
    switch (celebrationType) {
      case 'quarter':
        return {
          title: '25% Complete! 🎯',
          message: 'Great start! Your PRD is taking shape.',
          color: 'from-blue-500 to-purple-500'
        };
      case 'half':
        return {
          title: 'Halfway There! 🚀',
          message: 'Excellent progress! Keep up the momentum.',
          color: 'from-purple-500 to-pink-500'
        };
      case 'three_quarters':
        return {
          title: '75% Done! ⚡',
          message: 'Almost there! Your PRD is looking fantastic.',
          color: 'from-pink-500 to-red-500'
        };
      case 'complete':
        return {
          title: 'PRD Complete! 🎉',
          message: 'Amazing work! Your PRD is now world-class.',
          color: 'from-green-500 to-emerald-500'
        };
      default:
        return null;
    }
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    setCelebrationType(null);
    onCelebrationComplete?.();
  };

  if (!showCelebration || !celebrationType) return null;

  const milestoneData = getMilestoneData();
  if (!milestoneData) return null;

  return (
    <MicroInteraction
      type="milestone_reached"
      data={milestoneData}
      onComplete={handleCelebrationComplete}
    />
  );
}

interface StreakTrackerProps {
  approvalStreak: number;
  onStreakCelebration?: () => void;
}

export function StreakTracker({ approvalStreak, onStreakCelebration }: StreakTrackerProps) {
  const [lastStreak, setLastStreak] = useState(0);

  useEffect(() => {
    if (approvalStreak > lastStreak && approvalStreak >= 3 && approvalStreak % 3 === 0) {
      onStreakCelebration?.();
    }
    setLastStreak(approvalStreak);
  }, [approvalStreak, lastStreak, onStreakCelebration]);

  if (approvalStreak < 2) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
        <Zap className="w-4 h-4" />
        <span className="font-bold text-sm">
          {approvalStreak} approvals in a row! 🔥
        </span>
      </div>
    </div>
  );
}

// Animation styles to add to global CSS
export const additiveAnimations = `
@keyframes bounce-in {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1) rotate(-10deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes slide-up {
  0% {
    transform: translateY(100px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-left {
  0% {
    transform: translateX(100px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes scale-in {
  0% {
    transform: scale(0) rotate(180deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.animate-bounce-in {
  animation: bounce-in 0.6s ease-out forwards;
}

.animate-slide-up {
  animation: slide-up 0.4s ease-out forwards;
}

.animate-slide-left {
  animation: slide-left 0.4s ease-out forwards;
}

.animate-scale-in {
  animation: scale-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
`;

// Hook for managing addictive interactions
export function useAddictiveInteractions() {
  const [approvalStreak, setApprovalStreak] = useState(0);
  const [lastQualityScore, setLastQualityScore] = useState(0);
  const [interactions, setInteractions] = useState<MicroInteractionProps[]>([]);

  const triggerApproval = () => {
    setApprovalStreak(prev => prev + 1);
    setInteractions(prev => [...prev, { type: 'task_approved' }]);
  };

  const triggerRejection = () => {
    setApprovalStreak(0);
  };

  const updateQualityScore = (newScore: number) => {
    const improvement = newScore - lastQualityScore;
    if (improvement > 0) {
      setInteractions(prev => [...prev, { 
        type: 'improvement_detected', 
        data: { improvement } 
      }]);
    }
    setLastQualityScore(newScore);
  };

  const triggerStreak = () => {
    setInteractions(prev => [...prev, { 
      type: 'streak', 
      data: { count: approvalStreak } 
    }]);
  };

  const clearInteraction = (index: number) => {
    setInteractions(prev => prev.filter((_, i) => i !== index));
  };

  return {
    approvalStreak,
    interactions,
    triggerApproval,
    triggerRejection,
    updateQualityScore,
    triggerStreak,
    clearInteraction
  };
}