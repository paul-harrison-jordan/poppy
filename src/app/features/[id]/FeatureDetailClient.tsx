'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, FileText, Palette, Send, User, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Feature {
  id: number;
  'drive-link': string;
  'v0-link': string;
  user: string;
  shipped: boolean;
  created_at?: string;
}

interface Comment {
  id: number;
  feature_id: number;
  user_email: string;
  user_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface FeatureDetailClientProps {
  feature: Feature;
  initialComments: Comment[];
}

export default function FeatureDetailClient({ 
  feature, 
  initialComments 
}: FeatureDetailClientProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<'doc' | 'design'>('doc');
  const [docContent, setDocContent] = useState<string>('');
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const extractDocId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const fetchDocContent = async () => {
    if (!session?.user || activeView !== 'doc') return;
    
    const docId = extractDocId(feature['drive-link']);
    if (!docId) return;

    setIsLoadingDoc(true);
    try {
      const response = await fetch('/api/get-google-doc-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ docId }),
      });

      if (response.ok) {
        const { content } = await response.json();
        setDocContent(content || '');
      } else {
        console.error('Failed to fetch document content');
      }
    } catch (error) {
      console.error('Error fetching document content:', error);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  useEffect(() => {
    if (activeView === 'doc' && session?.user && !docContent) {
      fetchDocContent();
    }
  }, [activeView, session?.user, docContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('feature_comments')
        .insert([
          {
            feature_id: feature.id,
            user_email: session.user.email!,
            user_name: session.user.name || session.user.email!.split('@')[0],
            content: newComment.trim(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const extractTitle = (url: string, type: 'doc' | 'design') => {
    if (type === 'doc') {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      return match ? `Doc-${match[1].slice(0, 8)}` : 'Document';
    } else {
      const match = url.match(/\/chat\/([a-zA-Z0-9-_]+)/);
      return match ? `Design-${match[1].slice(0, 8)}` : 'Design';
    }
  };

  return (
    <div className="min-h-screen bg-neutral/80">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/features"
                className="text-poppy hover:text-poppy/80 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  Feature by {feature.user.split('@')[0]}
                </h1>
                <p className="text-gray-600">{feature.user}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              feature.shipped 
                ? 'bg-sprout/10 text-sprout border border-sprout/20' 
                : 'bg-poppy/10 text-poppy border border-poppy/20'
            }`}>
              {feature.shipped ? (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Shipped</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>In Progress</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          
          {/* Chat Panel */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-primary">Comments & Feedback</h2>
              <p className="text-sm text-gray-600">{comments.length} comment{comments.length !== 1 ? 's' : ''}</p>
            </div>
            
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No comments yet</p>
                  <p className="text-sm text-gray-400">Be the first to share feedback!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-poppy rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {comment.user_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-primary">{comment.user_name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Comment Input */}
            {session?.user ? (
              <form onSubmit={handleSubmitComment} className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your feedback..."
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-poppy/20 focus:border-poppy"
                    rows={3}
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="self-end bg-poppy text-white p-2 rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500 mb-2">Sign in to leave feedback</p>
                <Link 
                  href="/auth/signin"
                  className="text-poppy hover:text-poppy/80 text-sm font-medium"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Content Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            {/* Toggle Buttons */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveView('doc')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeView === 'doc'
                    ? 'bg-poppy text-white'
                    : 'text-gray-600 hover:text-poppy hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Document</span>
              </button>
              <button
                onClick={() => setActiveView('design')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeView === 'design'
                    ? 'bg-poppy text-white'
                    : 'text-gray-600 hover:text-poppy hover:bg-gray-50'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Design</span>
              </button>
            </div>

            {/* Document/Design Content */}
            <div className="flex-1 overflow-auto">
              {activeView === 'doc' ? (
                <div className="h-full">
                  {!session?.user ? (
                    <div className="h-full bg-gray-50 p-6">
                      <div className="text-center mb-8">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">Sign in to view full document</h3>
                        <p className="text-gray-500 mb-4">Authentication required to access Google Docs content</p>
                        <div className="space-x-4">
                          <Link 
                            href="/auth/signin"
                            className="inline-block bg-poppy text-white px-6 py-2 rounded-lg hover:bg-poppy/90 transition-colors"
                          >
                            Sign In
                          </Link>
                          <Link
                            href={feature['drive-link']}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block border border-poppy text-poppy px-6 py-2 rounded-lg hover:bg-poppy/10 transition-colors"
                          >
                            Open in Google Docs
                          </Link>
                        </div>
                      </div>
                      
                      {/* Document Preview Info */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h4 className="font-semibold text-primary mb-3">Document Overview</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>📄 <strong>Type:</strong> Product Requirements Document</p>
                          <p>👤 <strong>Owner:</strong> {feature.user}</p>
                          <p>📅 <strong>Status:</strong> {feature.shipped ? 'Shipped' : 'In Progress'}</p>
                          <p>🔗 <strong>Access:</strong> View and comment in Google Docs</p>
                        </div>
                      </div>
                    </div>
                  ) : isLoadingDoc ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-poppy animate-spin mx-auto mb-2" />
                        <p className="text-gray-600">Loading document...</p>
                      </div>
                    </div>
                  ) : docContent ? (
                    <div className="p-6 max-w-none">
                      <div 
                        className="prose prose-gray prose-sm max-w-none 
                                   prose-headings:text-primary prose-headings:font-semibold
                                   prose-p:text-gray-700 prose-p:leading-relaxed
                                   prose-ul:text-gray-700 prose-ol:text-gray-700
                                   prose-li:marker:text-gray-400
                                   prose-strong:text-primary prose-strong:font-semibold
                                   prose-a:text-poppy prose-a:no-underline hover:prose-a:underline"
                        dangerouslySetInnerHTML={{ __html: docContent }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50">
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">Document not available</h3>
                        <p className="text-gray-500 mb-4">Unable to load document content</p>
                        <button 
                          onClick={fetchDocContent}
                          className="bg-poppy text-white px-6 py-2 rounded-lg hover:bg-poppy/90 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : feature['v0-link'] ? (
                <iframe
                  src={feature['v0-link']}
                  className="w-full h-full border-0"
                  title={extractTitle(feature['v0-link'], 'design')}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No design created yet</h3>
                    <p className="text-gray-500 mb-4">Create a design prototype for this feature</p>
                    <button 
                      onClick={() => window.open(`/?mode=design&prd=${encodeURIComponent(feature['drive-link'])}`, '_blank')}
                      className="bg-poppy text-white px-6 py-2 rounded-lg hover:bg-poppy/90 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Palette className="w-4 h-4" />
                      Create Design
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* External Link Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Link
                href={activeView === 'doc' ? feature['drive-link'] : feature['v0-link']}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-poppy hover:text-poppy/80 font-medium"
              >
                Open {activeView === 'doc' ? 'document' : 'design'} in new tab →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}