"use client"

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Settings, RefreshCw, BookOpen, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [{
      href: "/setup",
      label: "Tune Poppy",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      href: "/sync",
      label: "Sync Documents",
      icon: <RefreshCw className="w-4 h-4" />,
    },
    {
      href: "/key-terms",
      label: "Key Terms",
      icon: <BookOpen className="w-4 h-4" />,
    }
  ];

  return (
    <div className="fixed left-0 top-0 w-64 h-screen bg-neutral/80 backdrop-blur-sm pt-16 z-10">
      <nav className="p-4 h-full flex flex-col">
        <ul className="space-y-2 flex flex-col h-full">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block">
                <motion.div
                  whileHover={{ scale: 1.03, x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-xl transition-colors",
                    pathname === item.href
                      ? "text-poppy bg-white/90"
                      : "text-gray-700 hover:bg-white/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center",
                      pathname === item.href ? "text-poppy" : "text-poppy/80",
                    )}
                  >
                    {item.icon}
                  </div>
                  <span className="ml-3 whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            </li>
          ))}
          <li className="mt-auto pt-8">
            <Link href="/" onClick={() => signOut({ callbackUrl: "/" })}>
              <motion.div
                whileHover={{ scale: 1.03, x: 3 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center px-3 py-2 rounded-xl text-gray-700 hover:bg-white/50 transition-colors"
              >
                <div className="flex items-center justify-center text-poppy/80">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="ml-3 whitespace-nowrap overflow-hidden">
                  Sign Out
                </span>
              </motion.div>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
