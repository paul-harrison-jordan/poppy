'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm w-full border-b border-[#E9DCC6]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200 ${
                  pathname === '/'
                    ? 'text-[#EF6351] border-b-2 border-[#EF6351]'
                    : 'text-[#232426] hover:text-[#EF6351] hover:border-b-2 hover:border-[#EF6351]'
                }`}
              >
                ChatPRD
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-[#232426] hover:text-[#EF6351] text-sm font-medium transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 