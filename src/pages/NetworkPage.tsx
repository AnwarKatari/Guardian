import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Check, 
  X, 
  Shield, 
  Clock, 
  MessageSquare, 
  ThumbsUp, 
  Share2, 
  MoreVertical,
  Zap,
  Radio,
  MapPin,
  TrendingUp,
  Target,
  Send,
  Loader2,
  Edit2,
  Trash2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  orderBy, 
  limit, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Post, Friendship, PostType, UserProfile, Comment as PostComment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

function CommentSection({ postId, authorName, authorPhoto }: { postId: string, authorName?: string, authorPhoto?: string }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<PostComment | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostComment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'comments');
    });
  }, [postId]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || 'User',
        authorPhoto: (profile?.photoURL && profile.photoURL.length > 5) ? profile.photoURL : (user.photoURL || ''),
        content: newComment.trim(),
        timestamp: serverTimestamp()
      });
      setNewComment('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'comments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `comments/${commentId}`);
    }
  };

  const startEditComment = (comment: PostComment) => {
    setEditingComment(comment);
    setEditCommentContent(comment.content);
  };

  const saveEditComment = async () => {
    if (!editingComment || !editCommentContent.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', editingComment.id), {
        content: editCommentContent.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingComment(null);
      setEditCommentContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${editingComment.id}`);
    }
  };

  return (
    <div className="bg-neutral-50 p-6 space-y-6">
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-200 overflow-hidden shrink-0">
               <img src={comment.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorId}`} alt={comment.authorName} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm transition-transform hover:translate-x-1 duration-300">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-neutral-900 italic tracking-tighter">{comment.authorName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-neutral-400 uppercase italic">{formatDate(comment.timestamp)}</span>
                      {comment.authorId === user?.uid && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => startEditComment(comment)}
                            className="p-1 text-neutral-300 hover:text-blue-500 transition-colors"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-neutral-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                 </div>
                 
                 {editingComment?.id === comment.id ? (
                   <div className="space-y-2">
                     <textarea 
                       value={editCommentContent}
                       onChange={(e) => setEditCommentContent(e.target.value)}
                       className="w-full p-2 text-xs font-bold italic bg-neutral-50 rounded-lg border border-neutral-100 focus:outline-none focus:border-blue-500"
                       rows={2}
                     />
                     <div className="flex justify-end gap-2">
                       <button 
                         onClick={() => setEditingComment(null)}
                         className="text-[10px] font-black uppercase text-neutral-400 italic"
                       >
                         Cancel
                       </button>
                       <button 
                         onClick={saveEditComment}
                         className="text-[10px] font-black uppercase text-blue-600 italic underline underline-offset-2"
                       >
                         Save
                       </button>
                     </div>
                   </div>
                 ) : (
                   <p className="text-xs text-neutral-600 font-bold leading-relaxed">{comment.content}</p>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={submitComment} className="flex gap-3">
        <div className="w-8 h-8 rounded-xl bg-neutral-200 overflow-hidden shrink-0 border-2 border-white shadow-md">
           <img src={profile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="Me" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 relative group">
           <input 
             type="text" 
             value={newComment}
             onChange={(e) => setNewComment(e.target.value)}
             placeholder="Write a comment..."
             className="w-full h-10 bg-white border border-neutral-100 rounded-xl px-4 text-xs font-bold italic focus:outline-none focus:ring-0 focus:border-blue-500 transition-all placeholder:text-neutral-300 shadow-sm"
           />
           <button 
             type="submit"
             disabled={isSubmitting || !newComment.trim()}
             className="absolute right-1.5 top-1.5 w-7 h-7 bg-neutral-900 text-white rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
           >
             {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} className="-rotate-12" />}
           </button>
        </div>
      </form>
    </div>
  );
}

export default function NetworkPage({ setActiveTab, setSelectedId }: { setActiveTab?: (tab: string) => void, setSelectedId?: (id: string) => void }) {
  const { user, profile } = useAuth();

  const [activeSegment, setActiveSegment] = useState<'feed' | 'followers' | 'following' | 'discover'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [globalUsers, setGlobalUsers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUpdatingPost, setIsUpdatingPost] = useState(false);

  // Load Posts
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'posts'), 
      where('type', 'in', ['UPDATE', 'STATUS', 'CHECK_IN', 'INTEL']),
      orderBy('timestamp', 'desc'), 
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
  }, [user]);

  // Load Global Users for Discovery
  useEffect(() => {
    if (!user || activeSegment !== 'discover') return;
    const q = query(collection(db, 'users'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGlobalUsers(snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== user.uid)
      );
    });
    return () => unsubscribe();
  }, [user, activeSegment]);

  // Load Followers
  useEffect(() => {
    if (!user || !profile?.followerIds || profile.followerIds.length === 0) {
      setFollowers([]);
      return;
    }
    const q = query(collection(db, 'users'), where('uid', 'in', profile.followerIds.slice(0, 10)));
    return onSnapshot(q, (snapshot) => {
      setFollowers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
  }, [user, profile?.followerIds]);

  // Load Following
  useEffect(() => {
    if (!user || !profile?.followingIds || profile.followingIds.length === 0) {
      setFollowing([]);
      return;
    }
    const q = query(collection(db, 'users'), where('uid', 'in', profile.followingIds.slice(0, 10)));
    return onSnapshot(q, (snapshot) => {
      setFollowing(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
  }, [user, profile?.followingIds]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', searchQuery.trim().toLowerCase()),
        limit(1)
      );
      const snapshot = await getDocs(q);
      setSearchResults(snapshot.docs.map(doc => doc.data() as UserProfile));
      if (snapshot.empty) {
          setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendConnectionRequest = async (targetId: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'friendships'), {
        requesterId: user.uid,
        receiverId: targetId,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      alert("Request sent. Pending approval.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'friendships');
    }
  };

  const acceptConnectionRequest = async (requestId: string, requesterId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'friendships', requestId), {
        status: 'accepted'
      });
      // Update self profile only. The requester will update their own profile 
      // when they detect the friendship is accepted or via their own UI.
      await updateDoc(doc(db, 'users', user.uid), {
        trustedContactIds: arrayUnion(requesterId)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'friendships');
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'posts');
    }
  };

  const toggleFollow = async (targetId: string, isFollowing: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        followingIds: isFollowing ? arrayRemove(targetId) : arrayUnion(targetId)
      });
      await updateDoc(doc(db, 'users', targetId), {
        followerIds: isFollowing ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const followAllUsers = async () => {
    if (!user || globalUsers.length === 0) return;
    try {
      const uids = globalUsers
        .map(u => u.uid)
        .filter(id => id !== user.uid && !profile?.followingIds?.includes(id));
      
      if (uids.length === 0) {
        alert("You are already following everyone!");
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        followingIds: arrayUnion(...uids)
      });
      
      // Batch update followed users
      const batchSize = 10;
      for (let i = 0; i < uids.length; i += batchSize) {
        const chunk = uids.slice(i, i + batchSize);
        await Promise.all(chunk.map(targetId => 
          updateDoc(doc(db, 'users', targetId), {
            followerIds: arrayUnion(user.uid)
          })
        ));
      }
      alert(`Followed ${uids.length} new users!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPostContent.trim()) return;

    setIsSubmittingPost(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || 'User',
        authorPhoto: (profile?.photoURL && profile.photoURL.length > 5) ? profile.photoURL : (user.photoURL || ''),
        content: newPostContent.trim(),
        type: PostType.STATUS,
        likes: [],
        timestamp: serverTimestamp()
      });
      setNewPostContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'posts');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("ARE YOU SURE YOU WANT TO PERMANENTLY DELETE THIS POST?")) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      console.error("Delete Post Error:", error);
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  const saveEditPost = async () => {
    if (!editingPost || !editContent.trim()) return;
    setIsUpdatingPost(true);
    try {
      await updateDoc(doc(db, 'posts', editingPost.id), {
        content: editContent,
        lastEdited: serverTimestamp()
      });
      setEditingPost(null);
      setEditContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${editingPost.id}`);
    } finally {
      setIsUpdatingPost(false);
    }
  };

  return (
    <div className="bg-neutral-50 pb-40">
      <main className="max-w-2xl mx-auto">
        {/* Header - Now Inside Main to Scroll */}
        <div className="bg-white px-6 pt-12 pb-6 border-b border-neutral-100 mb-6">
          <div className="flex items-center justify-between mb-8">
             <div className="space-y-1">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">Network</h2>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                   <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Manage your connections and followers</p>
                </div>
             </div>
             <div className="relative">
                <div className="p-3 bg-neutral-900 text-white rounded-2xl shadow-xl rotate-3 group hover:rotate-0 transition-transform">
                   <Users size={24} />
                </div>
             </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
             {[
               { id: 'feed', label: 'Feed', icon: Radio },
               { id: 'following', label: 'Following', icon: Shield },
               { id: 'followers', label: 'Followers', icon: Users },
               { id: 'discover', label: 'Discover', icon: Search }
             ].map(seg => (
               <button
                 key={seg.id}
                 onClick={() => setActiveSegment(seg.id as any)}
                 className={cn(
                   "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all",
                   activeSegment === seg.id 
                    ? "bg-white text-neutral-900 shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
                 )}
               >
                  <seg.icon size={14} className={activeSegment === seg.id ? "text-blue-600" : ""} />
                  {seg.label}
               </button>
             ))}
          </div>
        </div>

        <div className="px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {activeSegment === 'feed' && (
            <motion.div 
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Post Composer */}
              <div className="p-6 sm:p-8 bg-white border border-neutral-200 rounded-[32px] shadow-sm space-y-6 relative overflow-hidden group">
                 <div className="flex gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 shadow-sm">
                       <img 
                         src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                         alt="Me" 
                         className="w-full h-full object-cover" 
                       />
                    </div>
                    <div className="flex-1 space-y-4">
                       <textarea 
                         value={newPostContent}
                         onChange={(e) => setNewPostContent(e.target.value)}
                         placeholder="Share a safety update..."
                         className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none min-h-[100px] shadow-inner"
                       />
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <button className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                <MapPin size={18} />
                             </button>
                             <button className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                <Shield size={18} />
                             </button>
                          </div>
                          <button 
                            onClick={submitPost}
                            disabled={isSubmittingPost || !newPostContent.trim()}
                            className={cn(
                              "px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95",
                              isSubmittingPost || !newPostContent.trim() ? "opacity-30 cursor-not-allowed" : "hover:bg-blue-700"
                            )}
                          >
                             {isSubmittingPost ? <Loader2 size={16} className="animate-spin" /> : "Post Update"}
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-neutral-900">Edit Post</h3>
                <button 
                  onClick={() => setEditingPost(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-full bg-neutral-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-32 p-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold italic outline-none focus:border-blue-600 transition-all resize-none"
                  placeholder="What's on your mind?"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={saveEditPost}
                  disabled={isUpdatingPost || !editContent.trim()}
                  className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs italic shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdatingPost ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditingPost(null)}
                  className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 italic"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

              {/* Feed History */}
              <div className="space-y-4">
                {posts.map((post, idx) => (
                  <motion.div 
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm"
                  >
                    <div className="p-5 flex items-start justify-between">
                       <div className="flex gap-4">
                          <div className="w-11 h-11 rounded-xl bg-neutral-100 overflow-hidden border border-neutral-200">
                             <img 
                               src={post.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} 
                               alt={post.authorName} 
                               className="w-full h-full object-cover" 
                             />
                          </div>
                          <div>
                             <h4 className="font-bold text-neutral-900 leading-tight">{post.authorName}</h4>
                             <p className="text-[10px] text-neutral-500 font-medium">{formatDate(post.timestamp)}</p>
                          </div>
                       </div>

                       {post.authorId === user?.uid && (
                         <div className="flex gap-2 shrink-0">
                            <button 
                              onClick={() => handleEditPost(post)}
                              className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                              title="Edit Post"
                            >
                               <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                              title="Delete Post"
                            >
                               <Trash2 size={16} />
                            </button>
                         </div>
                       )}
                    </div>

                    <div className="px-5 pb-5">
                       <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 text-neutral-700 text-sm leading-relaxed">
                          <p>{post.content}</p>
                       </div>
                    </div>

                    <div className="px-5 py-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center gap-6">
                       <button 
                         onClick={() => handleLike(post.id, post.likes?.includes(user?.uid || ''))}
                         className={cn(
                           "flex items-center gap-2 text-[10px] font-bold uppercase transition-colors",
                           post.likes?.includes(user?.uid || '') ? "text-blue-600" : "text-neutral-400 hover:text-neutral-600"
                         )}
                       >
                          <ThumbsUp size={16} />
                          {post.likes?.length || 0}
                       </button>
                       <button 
                         onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                         className={cn(
                           "flex items-center gap-2 text-[10px] font-bold uppercase transition-colors",
                           expandedComments[post.id] ? "text-blue-600" : "text-neutral-400 hover:text-neutral-600"
                         )}
                       >
                          <MessageSquare size={16} />
                          Comment
                       </button>
                    </div>

                    <AnimatePresence>
                      {expandedComments[post.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-neutral-100"
                        >
                           <CommentSection postId={post.id} authorName={post.authorName} authorPhoto={post.authorPhoto} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {(activeSegment === 'followers' || activeSegment === 'following') && (
            <motion.div 
              key={activeSegment}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                       <div className="w-1 h-4 bg-blue-600 rounded-full" />
                       <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest italic leading-none">
                         {activeSegment === 'followers' ? 'Your Followers' : 'Users You Follow'}
                       </h3>
                    </div>
                    <span className="text-[10px] font-black italic text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                      {(activeSegment === 'followers' ? followers : following).length} Total
                    </span>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(activeSegment === 'followers' ? followers : following).length > 0 ? (activeSegment === 'followers' ? followers : following).map((connection, idx) => (
                       <motion.div 
                        key={connection.uid}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-6 sm:p-8 bg-white border border-neutral-200 rounded-3xl shadow-sm group hover:border-blue-500 transition-all relative overflow-hidden"
                       >
                          <div className="flex flex-col items-center gap-6 relative z-10">
                              <div className="relative">
                                 <div className="w-24 h-24 rounded-[36px] bg-neutral-100 border-4 border-white shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                    <img src={connection.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.uid}`} alt={connection.displayName} className="w-full h-full object-cover" />
                                 </div>
                                 {connection.isOnline && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-[0_0_20px_#10b981]" />
                                 )}
                              </div>
                              <div className="text-center space-y-2">
                                 <h4 className="font-black italic tracking-tighter uppercase text-neutral-900 group-hover:text-blue-600 transition-colors text-xl leading-none">{connection.displayName}</h4>
                                 <div className="flex flex-col items-center gap-2">
                                    <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest italic shadow-lg shadow-blue-500/20">Verified</span>
                                    <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest italic">{connection.followerIds?.length || 0} Followers</p>
                                 </div>
                              </div>
                              
                              <div className="w-full space-y-2">
                                <button 
                                  onClick={() => {
                                    if (setActiveTab && setSelectedId) {
                                      setSelectedId(connection.uid);
                                      setActiveTab('messages');
                                    }
                                  }}
                                  className="w-full py-4 bg-neutral-900 text-white rounded-[24px] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest italic shadow-xl hover:shadow-blue-500/30 active:scale-95"
                                >
                                   <MessageSquare size={16} />
                                   Message
                                </button>
                                
                                {activeSegment === 'followers' && !profile?.followingIds?.includes(connection.uid) && (
                                   <button 
                                     onClick={() => toggleFollow(connection.uid, false)}
                                     className="w-full py-4 bg-blue-50 text-blue-600 rounded-[24px] hover:bg-blue-100 transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest italic active:scale-95 border border-blue-100"
                                   >
                                      Follow Back
                                   </button>
                                )}
                              </div>
                          </div>
                       </motion.div>
                    )) : (
                      <div className="p-20 text-center bg-white border-2 border-dashed border-neutral-100 rounded-[60px] space-y-8 col-span-full shadow-inner">
                         <div className="w-24 h-24 bg-neutral-50 rounded-[40px] flex items-center justify-center mx-auto border-2 border-white shadow-2xl text-neutral-200">
                            <Shield size={48} />
                          </div>
                          <div className="space-y-3">
                             <h4 className="text-sm font-black text-neutral-900 uppercase tracking-widest italic">No users found</h4>
                             <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed max-w-sm mx-auto italic">
                                {activeSegment === 'followers' ? "You don't have any followers yet." : "You aren't following anyone yet."}
                             </p>
                          </div>
                      </div>
                    )}
                 </div>
              </div>
            </motion.div>
          )}

          {activeSegment === 'discover' && (
            <motion.div 
              key="discover"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              {/* Search */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3 px-2">
                    <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                    <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest italic leading-none">Find People</h3>
                 </div>
                 <form onSubmit={handleSearch} className="relative group">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by email..."
                      className="w-full h-20 bg-white border border-neutral-100 rounded-[32px] pl-16 pr-8 text-sm font-black italic tracking-widest placeholder:text-neutral-300 focus:outline-none focus:ring-0 focus:border-blue-500 transition-all shadow-2xl shadow-blue-500/5 group-hover:shadow-blue-500/10"
                    />
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-blue-600" size={24} />
                    <button 
                      type="submit"
                      disabled={isSearching}
                      className="absolute right-4 top-1/2 -translate-y-1/2 px-6 py-3 bg-neutral-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest italic active:scale-95 transition-all shadow-xl disabled:bg-neutral-300"
                    >
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                    </button>
                 </form>
              </div>

              {/* Discover Results */}
              <div className="space-y-8">
                 {(searchResults.length > 0 || (!searchQuery.trim() && globalUsers.length > 0)) && (
                    <div className="space-y-5">
                       <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                             <div className="w-1 h-3 bg-emerald-600" />
                             <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest italic">
                                {searchResults.length > 0 ? 'Search Results' : 'Suggestions'}
                             </h3>
                          </div>
                          {!searchQuery.trim() && globalUsers.length > 0 && (
                             <button 
                               onClick={followAllUsers}
                               className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                             >
                               Follow All
                             </button>
                          )}
                       </div>
                       {(searchResults.length > 0 ? searchResults : globalUsers).map((result, idx) => (
                          <motion.div 
                            key={result.uid} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-6 sm:p-8 bg-white border border-neutral-200 rounded-3xl flex flex-col sm:flex-row items-center gap-6 justify-between shadow-sm group hover:border-blue-500/30 transition-all"
                          >
                             <div className="flex items-center gap-6">
                                <div className="relative">
                                   <div className="w-16 h-16 rounded-[24px] bg-neutral-100 overflow-hidden shadow-2xl ring-4 ring-neutral-50 border-2 border-white transition-transform group-hover:scale-105">
                                      <img src={result.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.uid}`} alt="Operator" className="w-full h-full object-cover" />
                                   </div>
                                   {result.isOnline && (
                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_10px_#10b981]" />
                                   )}
                                </div>
                                <div className="space-y-1">
                                   <div className="flex items-center gap-2">
                                      <h4 className="font-black italic tracking-tighter uppercase text-neutral-900 text-xl">{result.displayName}</h4>
                                      {profile?.trustedContactIds?.includes(result.uid) && <Shield size={12} className="text-blue-500" />}
                                   </div>
                                   <div className="flex items-center gap-2">
                                      <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest italic">{result.countryCode || 'Global'}</p>
                                      <span className="text-[8px] text-neutral-300 font-bold">•</span>
                                      <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic">{result.followerIds?.length || 0} Followers</p>
                                   </div>
                                </div>
                             </div>
                             <div className="flex gap-3 w-full sm:w-auto">
                               <button 
                                 onClick={() => toggleFollow(result.uid, profile?.followingIds?.includes(result.uid) || false)}
                                 className={cn(
                                   "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest italic transition-all active:scale-95",
                                   profile?.followingIds?.includes(result.uid) 
                                     ? "bg-neutral-100 text-neutral-900 border border-neutral-200" 
                                     : "bg-blue-600 text-white shadow-2xl shadow-blue-600/30 hover:bg-blue-700"
                                 )}
                               >
                                  {profile?.followingIds?.includes(result.uid) ? (
                                    <>Following</>
                                  ) : (
                                    <>Follow</>
                                  )}
                               </button>
                               <button 
                                 onClick={() => {
                                   if (setActiveTab && setSelectedId) {
                                     setSelectedId(result.uid);
                                     setActiveTab('messages');
                                   }
                                 }}
                                 className="p-4 bg-neutral-900 text-white rounded-[20px] hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                               >
                                  <MessageSquare size={18} />
                               </button>
                             </div>
                          </motion.div>
                       ))}
                    </div>
                 )}
                 
                 {!searchQuery.trim() && globalUsers.length === 0 && !isSearching && (
                    <div className="space-y-10">
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.9 }}
                         whileInView={{ opacity: 1, scale: 1 }}
                         className="p-12 bg-neutral-900 text-white rounded-[50px] relative overflow-hidden group shadow-[0_40px_80px_rgba(0,0,0,0.3)] border border-white/5"
                       >
                          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 blur-[120px] rounded-full opacity-20 -translate-x-12 -translate-y-12" />
                          <div className="relative z-10 space-y-8">
                             <div className="w-16 h-16 bg-white/10 rounded-[24px] border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                <Zap size={32} className="text-blue-400 fill-current" />
                             </div>
                             <div className="space-y-3">
                                <h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase leading-none text-white">Grow your network</h3>
                                <p className="text-neutral-400 text-xs font-bold leading-relaxed uppercase tracking-wider italic max-w-md">
                                   Connect with friends and family to build a decentralized safety network. Verified contacts stay synced in real-time.
                                </p>
                             </div>
                             <div className="flex gap-5 pt-2">
                                <button className="px-8 py-4 bg-white text-neutral-900 rounded-2xl font-black text-[10px] uppercase tracking-widest italic hover:bg-blue-50 transition-colors shadow-xl">Scan Location</button>
                                <button className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic hover:bg-white/10 transition-colors">Directory</button>
                             </div>
                          </div>
                       </motion.div>
                    </div>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  </div>
);
}
