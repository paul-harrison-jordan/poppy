import React from 'react';
import { Loader2, CheckCircle, XCircle, Cpu, Search, Edit, FileText, TrendingUp } from 'lucide-react';
import type { ToolCall } from '@/types/assistant';

interface ToolCallIndicatorProps {
  toolCall: ToolCall;
}

export default function ToolCallIndicator({ toolCall }: ToolCallIndicatorProps) {
  const getToolIcon = (toolName: string) => {
    if (toolName.includes('research')) return <Search className="w-3 h-3" />;
    if (toolName.includes('generate')) return <Edit className="w-3 h-3" />;
    if (toolName.includes('analyze')) return <FileText className="w-3 h-3" />;
    if (toolName.includes('strategy')) return <TrendingUp className="w-3 h-3" />;
    return <Cpu className="w-3 h-3" />;
  };

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'calling':
        return <Loader2 className="w-3 h-3 animate-spin text-purple-500" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
      toolCall.status === 'calling' 
        ? 'bg-purple-50 border border-purple-200 animate-pulse' 
        : toolCall.status === 'completed'
        ? 'bg-green-50 border border-green-200'
        : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-center gap-1.5">
        {getStatusIcon()}
        <div className="text-gray-600">
          {getToolIcon(toolCall.tool)}
        </div>
      </div>
      
      <div className="flex-1">
        <span className="font-medium text-gray-700">{toolCall.tool}</span>
        {toolCall.description && (
          <span className="text-gray-500 ml-1">• {toolCall.description}</span>
        )}
      </div>
      
      {toolCall.status === 'completed' && (
        <span className="text-green-600 font-medium">Done</span>
      )}
    </div>
  );
}