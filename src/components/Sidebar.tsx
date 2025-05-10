"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Settings, RefreshCw, BookOpen, LogOut, GraduationCap, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarCollapsed") === "true"
    }
    return false
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false")
    }
  }, [collapsed])

  const isActive = (path: string) => {
    return pathname === path
  }

  const navItems = [
    {
      href: "/draft-prd",
      label: "Draft PRD",
      icon: <FileText size={28} strokeWidth={2.2} />,
    },
    {
      href: "/brainstorm",
      label: "Brainstorm",
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
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
    },
    {
      href: "/instructions",
      label: "How to Use It",
      icon: <GraduationCap className="w-4 h-4" />,
    },
  ]

  return (
    <motion.div
      initial={false}
      animate={{
        width: collapsed ? "5rem" : "16rem",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-screen bg-white/90 backdrop-blur-sm border-r border-neutral pt-16 z-10"
    >
      <div className="flex flex-col items-center mb-6 select-none">
        <Link href="/" className="flex items-center justify-center cursor-pointer" tabIndex={0} aria-label="Go to homepage">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-poppy/10 text-poppy">
            <span className="font-bold text-lg">🌺</span>
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2 text-base font-semibold text-poppy whitespace-nowrap overflow-hidden tracking-tight"
              >
                Poppy
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
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
                    isActive(item.href)
                      ? "text-poppy bg-white"
                      : "text-gray-700 hover:bg-poppy/10"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center",
                      isActive(item.href) ? "text-poppy" : "text-poppy/80",
                    )}
                  >
                    {item.icon}
                  </div>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-3 whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            </li>
          ))}
          <li className="mt-auto pt-8">
            <Link href="/" onClick={() => signOut({ callbackUrl: "/" })}>
              <motion.div
                whileHover={{ scale: 1.03, x: 3 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center px-3 py-2 rounded-xl text-gray-700 hover:bg-poppy/10 transition-colors"
              >
                <div className="flex items-center justify-center text-poppy/80">
                  <LogOut className="w-4 h-4" />
                </div>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 whitespace-nowrap overflow-hidden"
                    >
                      Sign Out
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          </li>
        </ul>
      </nav>
    </motion.div>
  )
}
