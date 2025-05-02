'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'framer-motion';

interface PastWorkItem {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

interface PastWorkProps {
  storageKey: string;
  title: string;
  onCountUpdate?: (count: number) => void;
}

export default function PastWork({ storageKey, title, onCountUpdate }: PastWorkProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [items, setItems] = useState<PastWorkItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const loadItems = useCallback(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsedItems = JSON.parse(stored);
        setItems(parsedItems);
        if (onCountUpdate) {
          onCountUpdate(parsedItems.length);
        }
      } catch (error) {
        console.error(`Error parsing ${storageKey}:`, error);
        setItems([]);
      }
    } else {
      setItems([]);
    }
  }, [storageKey, onCountUpdate]);

  // Load items on mount and when storageKey changes
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Listen for storage changes
  useEffect(() => {
    // Create a custom event name based on the storageKey
    const updateEventName = `${storageKey}Updated`;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        loadItems();
      }
    };

    const handleCustomEvent = () => {
      loadItems();
    };

    // Listen for both storage events and custom events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(updateEventName, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(updateEventName, handleCustomEvent);
    };
  }, [storageKey, loadItems]);

  useEffect(() => {
    if (isInView) {
      setIsVisible(true);
    }
  }, [isInView]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const updatedItems = items.filter(item => item.id !== id);
      setItems(updatedItems);
      localStorage.setItem(storageKey, JSON.stringify(updatedItems));
      
      if (onCountUpdate) {
        onCountUpdate(updatedItems.length);
      }

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent(`${storageKey}Updated`));
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Don't render anything if there are no items
  // if (items.length === 0) {
  //   return null;
  // }

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 20
      }}
      transition={{ duration: 0.5 }}
      className="mt-8"
    >
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-[#E9DCC6]/50 hover:bg-white/90 transition-all duration-300"
      >
        <span className="text-lg font-semibold text-[#232426]">{title}</span>
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-5 h-5 text-[#232426]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-[#E9DCC6]/50 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    deletingId === item.id ? 'opacity-50 bg-[#FFF5F3]' : 'hover:bg-[#FFFAF3]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#232426] truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#232426]/60">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <motion.a
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-[#EF6351] text-white hover:bg-[#d94d38] transition-colors"
                      title="View in Google Docs"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </motion.a>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-2 rounded-full text-[#E9DCC6] hover:text-[#EF6351] hover:bg-[#FFF5F3] transition-colors"
                      title="Delete"
                    >
                      <svg 
                        className="w-4 h-4"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                        />
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 