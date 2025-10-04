'use client';

import React, { useState } from 'react';
import { FeatureInput, ProductArea } from '@/types/knowledge';
import StatusIcon from './icons/StatusIcon';

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
    <div className="max-w-4xl mx-auto px-6">
      <div className="mb-8 text-center">
        <h2 className="font-display text-3xl text-batch-charcoal mb-2">Define Your Features</h2>
        <p className="text-batch-charcoal-light">
          Plant your seeds—add feature names, their Jobs to be Done, and product areas
        </p>
      </div>

      <div className="space-y-4">
        {features.map((feature, index) => (
          <div key={feature.id} className="p-6 border border-warmGray-200 rounded-xl bg-white shadow-sm hover:shadow-md hover:border-batch-terracotta/30 transition-all duration-200">
            <div className="flex items-start gap-3 mb-4">
              <StatusIcon status="seed" className="text-batch-terracotta mt-1" size={20} />
              <div className="flex-1 flex items-start justify-between">
                <h3 className="font-semibold text-batch-charcoal">Seed {index + 1}</h3>
                {features.length > 1 && (
                  <button
                    onClick={() => removeFeature(feature.id)}
                    className="text-poppy-500 hover:text-poppy-700 text-sm font-medium transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-batch-charcoal mb-2">
                  Feature Name <span className="text-poppy-500">*</span>
                </label>
                <input
                  type="text"
                  value={feature.name}
                  onChange={(e) => updateFeature(feature.id, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-warmGray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-batch-terracotta focus:border-transparent transition-all"
                  placeholder="e.g., Ticket Assignment System"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-batch-charcoal mb-2">
                  Product Area
                </label>
                <select
                  value={feature.productArea}
                  onChange={(e) => updateFeature(feature.id, 'productArea', e.target.value as ProductArea)}
                  className="w-full px-3 py-2 border border-warmGray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-batch-terracotta focus:border-transparent transition-all"
                >
                  <option value="customerFacing">Customer Facing (e.g., segment builder)</option>
                  <option value="customerImpacting">Customer Impacting (e.g., campaign sender)</option>
                  <option value="infrastructure">Infrastructure (e.g., internal databases)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-batch-charcoal mb-2">
                  Job to be Done (JTBD) <span className="text-poppy-500">*</span>
                </label>
                <textarea
                  value={feature.jtbd}
                  onChange={(e) => updateFeature(feature.id, 'jtbd', e.target.value)}
                  className="w-full px-3 py-2 border border-warmGray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-batch-terracotta focus:border-transparent transition-all"
                  rows={4}
                  placeholder="When [situation], I want to [action], so that [outcome]"
                />
                <p className="text-xs text-batch-charcoal-light mt-1">
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
        className="mt-6 px-6 py-3 text-batch-terracotta hover:text-batch-terracotta-hover font-semibold flex items-center gap-2 mx-auto border border-batch-terracotta/20 hover:border-batch-terracotta/40 rounded-xl transition-all hover:shadow-md"
      >
        <StatusIcon status="seed" className="text-current" size={16} />
        Add Another Seed
      </button>

      <div className="flex gap-3 mt-12 pt-8 border-t border-warmGray-200">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 text-batch-charcoal-light hover:text-batch-charcoal font-medium transition-colors rounded-xl hover:bg-warmGray-50"
          >
            ← Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`flex-1 px-8 py-3 rounded-full font-semibold transition-all duration-200 ${
            isValid
              ? 'bg-gradient-to-r from-batch-terracotta to-batch-terracotta-hover text-white hover:shadow-lg hover:scale-[1.02] active:scale-100'
              : 'bg-warmGray-200 text-warmGray-400 cursor-not-allowed'
          }`}
        >
          Cultivate Content → ({features.filter(f => f.name.trim() && f.jtbd.trim()).length} seeds ready)
        </button>
      </div>
    </div>
  );
}
