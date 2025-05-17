'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

type BannerStatus = 'onboarding' | 'instructions' | 'chat';

interface BannerContent {
  title: string;
  description: string;
}

interface BannerProps {
  status?: BannerStatus;
  title?: string;
  description?: string;
}

const content: { [K in BannerStatus]: BannerContent } = {
  onboarding: {
    title: "Welcome to Poppy",
    description: "Let's get you set up with your product management workspace. First, we'll tune Poppy with your team's strategy and product thinking."
  },
  instructions: {
    title: "How to Use Poppy",
    description: "Get the most out of Poppy: your all-in-one product management workspace for chatting, collaborating, and shipping PRDs with AI."
  },
  chat: {
    title: "Chat with Poppy",
    description: "Ask me anything about your product, strategy, or ideas."
  }
};

export default function Banner({ status = 'chat', title, description }: BannerProps) {
  const pathname = usePathname();
  
  // Don't render on setup page
  if (pathname === '/setup') {
    return null;
  }

  const bannerContent = title && description ? { title, description } : content[status];

  return (
    <div className="text-center bg-neutral/80 backdrop-blur-sm py-6 rounded-t-2xl">
      <h1 className="text-3xl font-semibold text-primary font-sans tracking-tight mb-2">
        {bannerContent.title.split('Poppy').map((part, index, array) => (
          <React.Fragment key={index}>
            {part}
            {index < array.length - 1 && <span className="text-poppy">Poppy</span>}
          </React.Fragment>
        ))}
      </h1>
      <p className="text-lg text-primary/80 font-sans max-w-2xl mx-auto">{bannerContent.description}</p>
    </div>
  );
} 