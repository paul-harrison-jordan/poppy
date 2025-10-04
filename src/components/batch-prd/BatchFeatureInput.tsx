'use client';

import React, { useState } from 'react';
import { FeatureInput, ProductArea } from '@/types/knowledge';

interface BatchFeatureInputProps {
  onFeaturesSubmit: (features: FeatureInput[]) => void;
  onBack?: () => void;
}

export default function BatchFeatureInput({ onFeaturesSubmit, onBack }: BatchFeatureInputProps) {
  const [features, setFeatures] = useState<FeatureInput[]>([
    {
      id: `feature-${Date.now()}`,
      name: '',
      jtbd: '',
      productArea: 'customerFacing',
      appliedPersonas: []
    }
  ]);

  const addFeature = () => {
    setFeatures([
      ...features,
      {
        id: `feature-${Date.now()}-${features.length}`,
        name: '',
        jtbd: '',
        productArea: 'customerFacing',
        appliedPersonas: []
      }
    ]);
  };

  const removeFeature = (id: string) => {
    if (features.length > 1) {
      setFeatures(features.filter(f => f.id !== id));
    }
  };

  const updateFeature = (id: string, field: keyof FeatureInput, value: string | ProductArea) => {
    setFeatures(features.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const handleSubmit = () => {
    const validFeatures = features.filter(f => f.name.trim() && f.jtbd.trim());

    if (validFeatures.length === 0) {
      alert('Please add at least one feature with a name and JTBD');
      return;
    }

    onFeaturesSubmit(validFeatures);
  };

  const isValid = features.some(f => f.name.trim() && f.jtbd.trim());

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Define Your Features</h2>
      <p className="text-gray-700 mb-6">
        Add feature names, their Jobs to be Done (JTBD), and the product area they belong to.
      </p>

      <div className="space-y-6">
        {features.map((feature, index) => (
          <div key={feature.id} className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold">Feature {index + 1}</h3>
              {features.length > 1 && (
                <button
                  onClick={() => removeFeature(feature.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Feature Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={feature.name}
                  onChange={(e) => updateFeature(feature.id, 'name', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Ticket Assignment System"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Product Area
                </label>
                <select
                  value={feature.productArea}
                  onChange={(e) => updateFeature(feature.id, 'productArea', e.target.value as ProductArea)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="customerFacing">Customer Facing (e.g., segment builder)</option>
                  <option value="customerImpacting">Customer Impacting (e.g., campaign sender)</option>
                  <option value="infrastructure">Infrastructure (e.g., internal databases)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Job to be Done (JTBD) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={feature.jtbd}
                  onChange={(e) => updateFeature(feature.id, 'jtbd', e.target.value)}
                  className="w-full p-2 border rounded-md resize-none"
                  rows={4}
                  placeholder="When [situation], I want to [action], so that [outcome]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: When I start working on resolving customer issues, I want to assign tickets to myself
                  and easily see which tickets are my responsibility to solve, so that I can take ownership of a
                  particular issue and resolve it for the customer.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addFeature}
        className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800 font-semibold"
      >
        + Add Another Feature
      </button>

      <div className="flex gap-3 mt-6 pt-6 border-t">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            isValid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Generate PRD Content ({features.filter(f => f.name.trim() && f.jtbd.trim()).length} features)
        </button>
      </div>
    </div>
  );
}
