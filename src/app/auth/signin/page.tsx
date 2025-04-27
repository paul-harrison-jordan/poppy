'use client';

import { signIn } from 'next-auth/react';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFAF3]">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-[#E9DCC6]">
        <div>
          <h2 className="text-center text-2xl font-bold text-[#232426]">
            Sign in to ChatPRD
          </h2>
          <p className="mt-2 text-center text-sm text-[#BBC7B6]">
            Access your PRDs and start drafting
          </p>
        </div>
        <div className="mt-8">
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex justify-center py-2 px-4 rounded-lg text-sm font-medium text-white bg-[#232426] hover:bg-opacity-90 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
} 