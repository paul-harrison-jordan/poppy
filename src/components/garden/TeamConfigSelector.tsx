'use client';

import { useState, useEffect } from 'react';
import { TeamConfigurationManager } from '@/services/garden/TeamConfiguration';

interface TeamConfig {
  name: string;
  description: string;
}

export default function TeamConfigSelector() {
  const [availableConfigs, setAvailableConfigs] = useState<TeamConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load available configurations
    const configs = TeamConfigurationManager.getAvailableConfigs();
    setAvailableConfigs(configs);
    
    // Get current config
    const currentConfig = TeamConfigurationManager.getCurrentConfig();
    setSelectedConfig(currentConfig.name.toLowerCase().replace(/\s+/g, '-'));
  }, []);

  const handleConfigChange = async (configName: string) => {
    setIsLoading(true);
    try {
      TeamConfigurationManager.setTeamConfig(configName);
      setSelectedConfig(configName);
      
      // Show success message or refresh the page to apply changes
      // You might want to trigger a re-render of Garden components here
      console.log(`Switched to team configuration: ${configName}`);
      
    } catch (error) {
      console.error('Failed to switch team configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Team Configuration</h3>
          <p className="text-sm text-gray-600">
            Customize Garden agents for your specific PM team and domain
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label htmlFor="team-config" className="text-sm font-medium text-gray-700">
            Active Team:
          </label>
          <select
            id="team-config"
            value={selectedConfig}
            onChange={(e) => handleConfigChange(e.target.value)}
            disabled={isLoading}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            {availableConfigs.map((config) => (
              <option key={config.name} value={config.name}>
                {config.name.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Show description of selected config */}
      {availableConfigs.length > 0 && (
        <div className="bg-blue-50 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <strong>Current Configuration:</strong> {
              availableConfigs.find(c => c.name === selectedConfig)?.description || 
              'Custom team configuration'
            }
          </p>
        </div>
      )}

      {/* Configuration Details */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Specialized Agents</h4>
          <ul className="text-gray-600 space-y-1">
            <li>• Planning Agent (PRD focus)</li>
            <li>• Strategy Agent (frameworks)</li>
            <li>• Research Agent (market intel)</li>
            <li>• Design Agent (UX strategy)</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Domain Features</h4>
          <ul className="text-gray-600 space-y-1">
            <li>• Industry terminology</li>
            <li>• Specialized frameworks</li>
            <li>• Domain-specific metrics</li>
            <li>• Competitive context</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Customization</h4>
          <ul className="text-gray-600 space-y-1">
            <li>• Team communication style</li>
            <li>• Preferred decision frameworks</li>
            <li>• Stakeholder priorities</li>
            <li>• Success metrics focus</li>
          </ul>
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Applying configuration...</span>
        </div>
      )}
    </div>
  );
}