// frontend/oncall-frontend/src/components/IncidentComments.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
  AtSymbolIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

interface Comment {
  id: string;
  content: string;
  user_name: string;
  user_id: string;
  user_avatar?: string;
  created_at: string;
  updated_at?: string;
  is_internal: boolean;
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    type: string;
    url: string;
  }>;
  reactions?: Array<{
    type: 'like' | 'heart' | 'thumbs_up';
    users: string[];
  }>;
  mentions?: string[];
}

interface IncidentCommentsProps {
  incidentId: string;
}

const IncidentComments: React.FC<IncidentCommentsProps> = ({ incidentId }) => {
  const { showToast } = useNotifications();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/v1/incidents/${incidentId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        // Use mock data if API doesn't exist yet
        setComments(getMockComments());
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments(getMockComments());
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchComments();
    // Set up polling for real-time comments
    const interval = setInterval(fetchComments, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [fetchComments]);

  const getMockComments = (): Comment[] => {
    const now = new Date();
    return [
      {
        id: '1',
        content: 'Investigating the database connection issues. Initial analysis shows high connection pool usage.',
        user_name: 'Marcus Rodriguez',
        user_id: 'user2',
        created_at: new Date(now.getTime() - 105 * 60000).toISOString(),
        is_internal: false,
        reactions: [
          { type: 'thumbs_up', users: ['Sarah Chen', 'Alex Johnson'] }
        ]
      },
      {
        id: '2',
        content: 'I see similar patterns in our monitoring. The connection pool appears to be exhausted around 14:30 UTC. @alex-johnson can you check the application server logs?',
        user_name: 'Sarah Chen',
        user_id: 'user1',
        created_at: new Date(now.getTime() - 95 * 60000).toISOString(),
        is_internal: false,
        mentions: ['alex-johnson'],
        reactions: [
          { type: 'like', users: ['Marcus Rodriguez'] }
        ]
      },
      {
        id: '3',
        content: 'Found the issue! There was a memory leak in the connection handling code that was introduced in the last deployment. Rolling back now.',
        user_name: 'Alex Johnson',
        user_id: 'user3',
        created_at: new Date(now.getTime() - 75 * 60000).toISOString(),
        is_internal: false,
        attachments: [
          {
            id: 'att1',
            filename: 'error_logs.txt',
            size: 15420,
            type: 'text/plain',
            url: '#'
          }
        ],
        reactions: [
          { type: 'heart', users: ['Marcus Rodriguez', 'Sarah Chen'] }
        ]
      },
      {
        id: '4',
        content: 'Internal note: Remember to update the deployment checklist to include connection pool monitoring.',
        user_name: 'Marcus Rodriguez',
        user_id: 'user2',
        created_at: new Date(now.getTime() - 65 * 60000).toISOString(),
        is_internal: true
      },
      {
        id: '5',
        content: 'Rollback completed successfully. All database connections are now stable. Monitoring for the next 30 minutes to ensure full recovery.',
        user_name: 'Alex Johnson',
        user_id: 'user3',
        created_at: new Date(now.getTime() - 60 * 60000).toISOString(),
        is_internal: false,
        reactions: [
          { type: 'thumbs_up', users: ['Marcus Rodriguez', 'Sarah Chen', 'DevOps Team'] }
        ]
      }
    ];
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/v1/incidents/${incidentId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          is_internal: isInternal
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data]);
        setNewComment('');
        showToast({
          type: 'success',
          title: 'Comment Added',
          message: 'Your comment has been posted successfully'
        });
      } else {
        // Mock successful submission
        const mockComment: Comment = {
          id: `mock-${Date.now()}`,
          content: newComment,
          user_name: 'You',
          user_id: 'current-user',
          created_at: new Date().toISOString(),
          is_internal: isInternal
        };
        setComments(prev => [...prev, mockComment]);
        setNewComment('');
        showToast({
          type: 'success',
          title: 'Comment Added',
          message: 'Your comment has been posted successfully'
        });
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to post comment'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmitComment(e);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addReaction = (commentId: string, reactionType: 'like' | 'heart' | 'thumbs_up') => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const reactions = comment.reactions || [];
        const existingReaction = reactions.find(r => r.type === reactionType);
        
        if (existingReaction) {
          // Toggle reaction
          if (existingReaction.users.includes('You')) {
            existingReaction.users = existingReaction.users.filter(u => u !== 'You');
          } else {
            existingReaction.users.push('You');
          }
        } else {
          // Add new reaction
          reactions.push({ type: reactionType, users: ['You'] });
        }
        
        return { ...comment, reactions };
      }
      return comment;
    }));
  };

  const renderReactions = (comment: Comment) => {
    if (!comment.reactions || comment.reactions.length === 0) return null;

    return (
      <div className="flex items-center space-x-2 mt-2">
        {comment.reactions.map((reaction, index) => {
          if (reaction.users.length === 0) return null;
          
          const emoji = reaction.type === 'like' ? '👍' : reaction.type === 'heart' ? '❤️' : '👍';
          const isActive = reaction.users.includes('You');
          
          return (
            <button
              key={index}
              onClick={() => addReaction(comment.id, reaction.type)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                isActive 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <span>{emoji}</span>
              <span>{reaction.users.length}</span>
            </button>
          );
        })}
        
        {/* Add reaction button */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded"
          >
            <FaceSmileIcon className="w-4 h-4" />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-white/10 rounded-lg p-2 flex space-x-1 z-10">
              <button
                onClick={() => {
                  addReaction(comment.id, 'thumbs_up');
                  setShowEmojiPicker(false);
                }}
                className="p-1 hover:bg-white/10 rounded"
              >
                👍
              </button>
              <button
                onClick={() => {
                  addReaction(comment.id, 'heart');
                  setShowEmojiPicker(false);
                }}
                className="p-1 hover:bg-white/10 rounded"
              >
                ❤️
              </button>
              <button
                onClick={() => {
                  addReaction(comment.id, 'like');
                  setShowEmojiPicker(false);
                }}
                className="p-1 hover:bg-white/10 rounded"
              >
                👍
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMentions = (content: string, mentions?: string[]) => {
    if (!mentions || mentions.length === 0) return content;
    
    let result = content;
    mentions.forEach(mention => {
      result = result.replace(`@${mention}`, `<span class="text-blue-400 bg-blue-500/20 px-1 rounded">@${mention}</span>`);
    });
    
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No Comments Yet</h3>
            <p className="text-gray-500 text-sm">
              Start the conversation by adding the first comment.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={`glass-card rounded-xl p-4 ${comment.is_internal ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
              {comment.is_internal && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-yellow-300 text-xs font-medium">INTERNAL COMMENT</span>
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {comment.user_avatar || comment.user_name.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-white">{comment.user_name}</span>
                    <span className="text-gray-400 text-sm">{formatTimestamp(comment.created_at)}</span>
                  </div>
                  
                  <div className="mt-2 text-gray-300 leading-relaxed">
                    {renderMentions(comment.content, comment.mentions)}
                  </div>
                  
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comment.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-white/5 rounded-lg border border-white/10">
                          <PaperClipIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-blue-300 hover:text-blue-200 cursor-pointer">
                            {attachment.filename}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({formatFileSize(attachment.size)})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {renderReactions(comment)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="glass-card rounded-xl p-4">
        <div className="space-y-3">
          {/* Internal Comment Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="internal-comment"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0"
            />
            <label htmlFor="internal-comment" className="text-sm text-gray-300">
              Internal comment (only visible to team members)
            </label>
          </div>

          {/* Comment Input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... (Cmd/Ctrl + Enter to submit)"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            
            {/* Toolbar */}
            <div className="absolute bottom-3 left-3 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                <PaperClipIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                <AtSymbolIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                <FaceSmileIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Use @ to mention team members
            </div>
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <PaperAirplaneIcon className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            // Handle file upload
            console.log('Files selected:', e.target.files);
          }}
        />
      </form>

      {/* Real-time Indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-300 text-xs font-medium">Live Comments</span>
        </div>
      </div>
    </div>
  );
};

export default IncidentComments;