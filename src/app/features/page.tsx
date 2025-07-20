import { createClient } from '@/utils/supabase/server';
import { ExternalLink, FileText, Palette, User, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Feature {
  id: number;
  'drive-link': string;
  'v0-link': string;
  user: string;
  shipped: boolean;
  created_at?: string;
}

export default async function FeaturesPage() {
  const supabase = await createClient();

  const { data: features } = await supabase
    .from('prds')
    .select('*')
    .order('created_at', { ascending: false });

  const shippedFeatures = features?.filter(f => f.shipped) || [];
  const inProgressFeatures = features?.filter(f => !f.shipped) || [];

  return (
    <div className="min-h-screen bg-neutral/80">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-4">Product Features</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your central hub for product collaboration. Track features from concept to launch, 
              share with stakeholders, and gather feedback to drive product excellence.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-sprout mr-3" />
              <div>
                <p className="text-2xl font-bold text-primary">{shippedFeatures.length}</p>
                <p className="text-gray-600">Shipped Features</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-poppy mr-3" />
              <div>
                <p className="text-2xl font-bold text-primary">{inProgressFeatures.length}</p>
                <p className="text-gray-600">In Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <User className="w-8 h-8 text-primary mr-3" />
              <div>
                <p className="text-2xl font-bold text-primary">
                  {new Set(features?.map(f => f.user)).size || 0}
                </p>
                <p className="text-gray-600">Contributors</p>
              </div>
            </div>
          </div>
        </div>

        {/* In Progress Features */}
        {inProgressFeatures.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
              <Clock className="w-6 h-6 text-poppy mr-2" />
              In Progress Features
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {inProgressFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        )}

        {/* Shipped Features */}
        {shippedFeatures.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center">
              <CheckCircle className="w-6 h-6 text-sprout mr-2" />
              Shipped Features
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {shippedFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!features || features.length === 0) && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No features yet</h3>
            <p className="text-gray-500">Features will appear here once they&apos;re added to the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const extractDocTitle = (url: string) => {
    // Extract Google Doc ID and create a readable title
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      return `Doc-${match[1].slice(0, 8)}`;
    }
    return 'Document';
  };

  const extractDesignTitle = (url: string) => {
    // Extract v0 or Figma identifier
    if (url.includes('v0.dev')) {
      const match = url.match(/\/chat\/([a-zA-Z0-9-_]+)/);
      return match ? `Design-${match[1].slice(0, 8)}` : 'Design';
    }
    return 'Design';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Clickable Header - goes to detail view */}
      <Link href={`/features/${feature.id}`} className="block">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-poppy to-poppy/80 rounded-lg flex items-center justify-center mr-3">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-primary text-lg hover:text-poppy transition-colors">
                Feature by {feature.user.split('@')[0]}
              </h3>
              <p className="text-sm text-gray-500">{feature.user}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            feature.shipped 
              ? 'bg-sprout/10 text-sprout border border-sprout/20' 
              : 'bg-poppy/10 text-poppy border border-poppy/20'
          }`}>
            {feature.shipped ? 'Shipped' : 'In Progress'}
          </div>
        </div>
      </Link>

      <div className="space-y-3">
        {/* Document Link */}
        <Link 
          href={feature['drive-link']} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
        >
          <FileText className="w-5 h-5 text-primary mr-3" />
          <div className="flex-1">
            <p className="font-medium text-primary">Product Document</p>
            <p className="text-sm text-gray-600">{extractDocTitle(feature['drive-link'])}</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-poppy transition-colors" />
        </Link>

        {/* Design Link */}
        <Link 
          href={feature['v0-link']} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
        >
          <Palette className="w-5 h-5 text-primary mr-3" />
          <div className="flex-1">
            <p className="font-medium text-primary">Design Mockup</p>
            <p className="text-sm text-gray-600">{extractDesignTitle(feature['v0-link'])}</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-poppy transition-colors" />
        </Link>
      </div>

      {/* View Details Button */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <Link 
          href={`/features/${feature.id}`}
          className="block w-full text-center py-2 px-4 bg-poppy/10 text-poppy hover:bg-poppy hover:text-white rounded-lg transition-colors font-medium text-sm"
        >
          View Details & Comments
        </Link>
      </div>
    </div>
  );
}