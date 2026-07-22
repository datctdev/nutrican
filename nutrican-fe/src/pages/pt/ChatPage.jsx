import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Send, MessageSquare, Clock, ShieldAlert, ImagePlus, X, UploadCloud, FileText, Loader2 } from 'lucide-react';
import { chatService } from '../../services/chatService';
import { workspaceService } from '../../services/workspaceService';
import { sendWebSocketMessage } from '../../services/websocketService';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import ImageLightbox from '../../components/common/ImageLightbox';
import ChatContextCard from './components/ChatContextCard';
import ChatPendingReviewCard from './components/ChatPendingReviewCard';
import ChatMessageContextCard from './components/ChatMessageContextCard';

const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024;
const MSG_PAGE_SIZE = 30;

function dayKey(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (dayKey(dateStr) === dayKey(today.toISOString())) return 'Hôm nay';
    if (dayKey(dateStr) === dayKey(yesterday.toISOString())) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN');
}

function mergeUniqueById(existing, incoming, mode = 'append') {
    const map = new Map();
    const ordered = mode === 'prepend' ? [...incoming, ...existing] : [...existing, ...incoming];
    ordered.forEach((m) => {
        if (m?.id != null) map.set(String(m.id), m);
        else map.set(`tmp-${m.createdAt}-${m.content}`, m);
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export default function ChatPage() {
    const { user } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const contextLogId = searchParams.get('contextLogId');

    const [threads, setThreads] = useState([]);
    const [activeMappingId, setActiveMappingId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [msgPage, setMsgPage] = useState(0);
    const [msgLast, setMsgLast] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImagePreview, setSelectedImagePreview] = useState('');
    const [chatContext, setChatContext] = useState(null);
    const [pendingLogs, setPendingLogs] = useState([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [reviewingLogId, setReviewingLogId] = useState(null);
    const [mobileSideOpen, setMobileSideOpen] = useState(false);

    const [loadingThreads, setLoadingThreads] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [lightboxImage, setLightboxImage] = useState('');

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const stickToBottomRef = useRef(true);
    const imageInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    const loadThreads = useCallback(async () => {
        try {
            const res = await chatService.getThreads();
            const loadedThreads = res.data.data || [];
            setThreads(loadedThreads);
            return loadedThreads;
        } catch (err) {
            console.error("Fetch threads error:", err);
            toast.error('Lỗi khi tải danh sách trò chuyện');
            return [];
        } finally {
            setLoadingThreads(false);
        }
    }, []);

    const refreshChatContext = useCallback(async (participantId) => {
        if (!participantId) {
            setChatContext(null);
            return;
        }
        try {
            const res = await workspaceService.getChatContext(participantId);
            setChatContext(res.data?.data || null);
        } catch {
            setChatContext(null);
        }
    }, []);

    const refreshPendingLogs = useCallback(async (clientId) => {
        if (!clientId) {
            setPendingLogs([]);
            return;
        }
        setLoadingPending(true);
        try {
            const res = await workspaceService.getPendingLogs({ page: 0, size: 5, clientId });
            setPendingLogs(res.data?.data?.content || []);
        } catch {
            setPendingLogs([]);
        } finally {
            setLoadingPending(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const initChat = async () => {
            const loadedThreads = await loadThreads();
            if (!isMounted) return;

            if (loadedThreads.length > 0) {
                const targetClientId = location.state?.targetClientId;
                if (targetClientId) {
                    const targetThread = loadedThreads.find(t => t.participantId === targetClientId);
                    setActiveMappingId(prev => {
                        const newId = targetThread ? targetThread.mappingId : loadedThreads[0].mappingId;
                        return prev !== newId ? newId : prev;
                    });
                } else {
                    setActiveMappingId(prev => prev || loadedThreads[0].mappingId);
                }
                if (contextLogId) {
                    setNewMessage((prev) => prev || `Tôi muốn hỏi về nhật ký bữa ăn (${contextLogId.slice(0, 8)}…)`);
                }
            }
        };
        initChat();
        return () => { isMounted = false; };
    }, [location.state, loadThreads, contextLogId]);

    const activeThread = threads.find(t => t.mappingId === activeMappingId);

    useEffect(() => {
        refreshChatContext(activeThread?.participantId);
        refreshPendingLogs(activeThread?.participantId);
    }, [activeThread?.participantId, refreshChatContext, refreshPendingLogs]);

    useEffect(() => {
        if (!activeMappingId) return;

        const loadMessages = async () => {
            try {
                setLoadingMessages(true);
                stickToBottomRef.current = true;
                setMsgPage(0);
                const res = await chatService.getMessages(activeMappingId, { page: 0, size: MSG_PAGE_SIZE });
                const pageData = res.data.data || {};
                const msgs = [...(pageData.content || [])].reverse();
                setMessages(msgs);
                setMsgLast(Boolean(pageData.last ?? true));
                await chatService.markRead(activeMappingId);
            } catch (err) {
                console.error("Fetch messages error:", err);
                toast.error('Lỗi khi tải tin nhắn');
            } finally {
                setLoadingMessages(false);
            }
        };
        loadMessages();
    }, [activeMappingId]);

    const loadOlderMessages = useCallback(async () => {
        if (!activeMappingId || isLoadingMore || msgLast) return;
        const container = messagesContainerRef.current;
        const prevHeight = container?.scrollHeight || 0;
        const prevTop = container?.scrollTop || 0;
        const nextPage = msgPage + 1;
        setIsLoadingMore(true);
        stickToBottomRef.current = false;
        try {
            const res = await chatService.getMessages(activeMappingId, { page: nextPage, size: MSG_PAGE_SIZE });
            const pageData = res.data.data || {};
            const older = [...(pageData.content || [])].reverse();
            setMessages((prev) => mergeUniqueById(prev, older, 'prepend'));
            setMsgPage(nextPage);
            setMsgLast(Boolean(pageData.last ?? true));
            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight - prevHeight + prevTop;
                }
            });
        } catch {
            toast.error('Không tải thêm được tin cũ');
        } finally {
            setIsLoadingMore(false);
        }
    }, [activeMappingId, isLoadingMore, msgLast, msgPage]);

    const handleMessagesScroll = (e) => {
        const el = e.currentTarget;
        stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (el.scrollTop < 48) {
            loadOlderMessages();
        }
    };

    useEffect(() => {
        const handleNewMessage = (e) => {
            const newMsg = e.detail;

            if (!newMsg.createdAt) {
                newMsg.createdAt = new Date().toISOString();
            }

            if (newMsg.mappingId === activeMappingId) {
                stickToBottomRef.current = true;
                setMessages(prev => mergeUniqueById(prev, [newMsg], 'append'));
                chatService.markRead(activeMappingId).catch(console.error);
            }
            loadThreads();
        };

        window.addEventListener('realtime_chat_message', handleNewMessage);
        return () => window.removeEventListener('realtime_chat_message', handleNewMessage);
    }, [activeMappingId, loadThreads]);

    useEffect(() => {
        if (stickToBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        return () => {
            if (selectedImagePreview) {
                URL.revokeObjectURL(selectedImagePreview);
            }
        };
    }, [selectedImagePreview]);

    const handleQuickReview = async (logId, action) => {
        setReviewingLogId(logId);
        try {
            await workspaceService.reviewLog(logId, { action, note: action === 'APPROVE' ? 'Duyệt nhanh từ chat' : undefined });
            toast.success(action === 'APPROVE' ? 'Đã duyệt bữa ăn' : 'Đã từ chối');
            await refreshPendingLogs(activeThread?.participantId);
            await refreshChatContext(activeThread?.participantId);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không duyệt được');
        } finally {
            setReviewingLogId(null);
        }
    };

    const handleFile = (file) => {
        if (!file.type?.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh');
            return;
        }
        if (file.size > MAX_CHAT_IMAGE_SIZE) {
            toast.error('Ảnh quá lớn. Kích thước tối đa là 5MB.');
            return;
        }

        if (selectedImagePreview) {
            URL.revokeObjectURL(selectedImagePreview);
        }
        setSelectedImage(file);
        setSelectedImagePreview(URL.createObjectURL(file));
    };

    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        handleFile(file);
        event.target.value = '';
    };

    const handlePaste = (e) => {
        const file = e.clipboardData?.files?.[0];
        if (file) {
            e.preventDefault();
            handleFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const clearSelectedImage = () => {
        if (selectedImagePreview) {
            URL.revokeObjectURL(selectedImagePreview);
        }
        setSelectedImage(null);
        setSelectedImagePreview('');
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    const handlePdfSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !activeMappingId) return;
        if (file.type !== 'application/pdf') {
            toast.error('Chỉ chấp nhận file PDF');
            event.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('PDF tối đa 10MB');
            event.target.value = '';
            return;
        }
        try {
            setSending(true);
            const res = await chatService.sendAttachment(
                activeMappingId,
                file,
                newMessage.trim() || 'Tài liệu đính kèm',
                contextLogId ? 'DIET_LOG' : null,
                contextLogId || null,
            );
            const sentMessage = res.data?.data;
            if (sentMessage) {
                setMessages((prev) => prev.some((m) => m.id === sentMessage.id) ? prev : [...prev, sentMessage]);
            }
            setNewMessage('');
            toast.success('Đã gửi PDF');
        } catch {
            toast.error('Không thể gửi PDF');
        } finally {
            setSending(false);
            event.target.value = '';
        }
    };

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if ((!newMessage.trim() && !selectedImage) || !activeMappingId) return;

        try {
            setSending(true);
            stickToBottomRef.current = true;
            if (selectedImage) {
                const res = await chatService.sendImage(activeMappingId, selectedImage, newMessage);
                const sentMessage = res.data?.data;
                if (sentMessage) {
                    setMessages((prev) => prev.some((m) => m.id === sentMessage.id) ? prev : [...prev, sentMessage]);
                }
                setNewMessage('');
                clearSelectedImage();
                return;
            }

            const success = sendWebSocketMessage('CHAT_SEND', {
                mappingId: activeMappingId,
                content: newMessage.trim()
            });

            if (success) {
                setNewMessage('');
            } else {
                toast.error('Mất kết nối máy chủ. Vui lòng F5 tải lại trang.');
            }
        } catch (err) {
            console.error("Send message error:", err);
            toast.error('Không thể gửi tin nhắn');
        } finally {
            setSending(false);
        }
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US';
    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const handleContextNavigate = (path, refId) => {
        if (path === '/pt/clients/dietlog') {
            const params = new URLSearchParams();
            if (activeThread?.participantId) params.set('clientId', activeThread.participantId);
            if (activeThread?.participantName) params.set('clientName', activeThread.participantName);
            if (refId) params.set('logId', refId);
            navigate(`${path}?${params.toString()}`);
            return;
        }
        navigate(path);
    };

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-120px)] min-h-[600px] flex gap-6 animate-fade-in pb-6 mt-6">


            <Card className="w-80 flex flex-col bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden flex-shrink-0">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" /> Tin nhắn
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loadingThreads ? (
                        [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-100" />)
                    ) : threads.length === 0 ? (
                        <div className="text-center py-10">
                            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 font-medium">Chưa có cuộc trò chuyện nào</p>
                        </div>
                    ) : (
                        threads.map((thread) => {
                            const isActive = thread.mappingId === activeMappingId;
                            return (
                                <button
                                    key={thread.mappingId}
                                    onClick={() => setActiveMappingId(thread.mappingId)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left border ${
                                        isActive ? 'bg-primary/5 border-primary/10' : 'hover:bg-slate-50 border-transparent'
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                                            isActive ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {thread.participantAvatarUrl ? (
                                                <img src={thread.participantAvatarUrl} alt={thread.participantName} className="w-full h-full rounded-full object-cover" />
                                            ) : getInitials(thread.participantName)}
                                        </div>
                                        {thread.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                                {thread.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`text-sm truncate ${isActive ? 'font-bold text-primary-dark' : 'font-semibold text-slate-700'}`}>
                                                {thread.participantName}
                                            </h3>
                                            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                                                {formatTime(thread.lastMessage?.createdAt || thread.linkedAt)}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate ${thread.unreadCount > 0 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                                            {thread.lastMessage ? thread.lastMessage.content : 'Bắt đầu trò chuyện...'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </Card>

            {activeThread && (
                <div className="w-72 flex-shrink-0 hidden lg:flex flex-col gap-4 overflow-y-auto max-h-full">
                    <ChatContextCard
                        context={chatContext}
                        onViewDiet={() => {
                            const params = new URLSearchParams({
                                clientId: activeThread.participantId,
                                clientName: activeThread.participantName || 'Học viên',
                            });
                            navigate(`/pt/clients/dietlog?${params.toString()}`);
                        }}
                    />
                    <ChatPendingReviewCard
                        logs={pendingLogs}
                        loading={loadingPending}
                        reviewingLogId={reviewingLogId}
                        onApprove={(id) => handleQuickReview(id, 'APPROVE')}
                        onReject={(id) => handleQuickReview(id, 'REJECT')}
                        onOpenFull={() => {
                            const params = new URLSearchParams({
                                clientId: activeThread.participantId,
                                clientName: activeThread.participantName || 'Học viên',
                            });
                            navigate(`/pt/clients/dietlog?${params.toString()}`);
                        }}
                    />
                </div>
            )}


            <Card 
                className="flex-1 flex flex-col bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >

                {dragActive && (
                    <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-dashed border-primary m-4 rounded-2xl pointer-events-none animate-in fade-in duration-100">
                        <UploadCloud className="w-16 h-16 text-primary animate-bounce mb-3" />
                        <h3 className="text-xl font-bold text-slate-800">Thả hình ảnh vào đây</h3>
                        <p className="text-sm text-slate-500 mt-1">Để tự động đính kèm gửi cho Học viên</p>
                    </div>
                )}

                {!activeMappingId ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30">
                        <MessageSquare className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700">Chưa chọn cuộc trò chuyện</h3>
                        <p className="text-slate-500 mt-2">Chọn một người bên trái để bắt đầu nhắn tin.</p>
                    </div>
                ) : (
                    <>
                        <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4 z-10 shadow-sm">
                            <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-indigo-50/50 flex items-center justify-center text-primary font-bold">
                                {activeThread?.participantAvatarUrl ? (
                                    <img src={activeThread.participantAvatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                ) : getInitials(activeThread?.participantName)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-slate-800 text-lg truncate">{activeThread?.participantName}</h3>
                                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đang kết nối
                                </p>
                            </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="lg:hidden rounded-xl text-xs font-bold shrink-0"
                                onClick={() => setMobileSideOpen(true)}
                            >
                                Ngữ cảnh
                            </Button>
                        </div>

                        <div
                            ref={messagesContainerRef}
                            onScroll={handleMessagesScroll}
                            className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4"
                        >
                            {isLoadingMore && (
                                <div className="flex justify-center py-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                </div>
                            )}
                            {loadingMessages ? (
                                <div className="flex flex-col gap-4">
                                    <Skeleton className="h-16 w-2/3 rounded-2xl rounded-tl-none self-start bg-slate-200" />
                                    <Skeleton className="h-16 w-2/3 rounded-2xl rounded-tr-none self-end bg-primary/10" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                                    Hãy gửi lời chào đầu tiên!
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = msg.senderId === user?.id;
                                    const prev = messages[index - 1];
                                    const showDay = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);

                                    return (
                                        <div key={msg.id || `idx-${index}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {showDay && (
                                                <div className="w-full flex justify-center my-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                                                        {dayLabel(msg.createdAt)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`max-w-[70%] px-5 py-3 text-sm ${
                                                isMe
                                                    ? 'bg-primary text-white rounded-3xl rounded-tr-sm shadow-md shadow-primary/20'
                                                    : 'bg-white border border-slate-200 text-slate-800 rounded-3xl rounded-tl-sm shadow-sm'
                                            }`}>
                                                {msg.contextType && msg.contextRefId && (
                                                    <ChatMessageContextCard
                                                        contextType={msg.contextType}
                                                        contextRefId={msg.contextRefId}
                                                        onNavigate={handleContextNavigate}
                                                    />
                                                )}
                                                {msg.imageUrl && (
                                                    <img
                                                        src={msg.imageUrl}
                                                        alt={msg.content || 'Hình ảnh đính kèm'}
                                                        onClick={() => setLightboxImage(msg.imageUrl)}
                                                        className="mb-2 max-h-72 w-full rounded-2xl object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
                                                    />
                                                )}
                                                {msg.attachmentUrl && (
                                                    <a
                                                        href={msg.attachmentUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`mb-2 flex items-center gap-2 text-sm font-semibold underline ${isMe ? 'text-white/90' : 'text-blue-600'}`}
                                                    >
                                                        <FileText className="w-4 h-4" /> Tệp PDF đính kèm
                                                    </a>
                                                )}
                                                {msg.content && <p>{msg.content}</p>}
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1.5 px-2 font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {formatTime(msg.createdAt)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t border-slate-100">
                            {selectedImagePreview && (
                                <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <img src={selectedImagePreview} alt="Ảnh đính kèm đã chọn" className="h-16 w-16 rounded-xl object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-slate-800">{selectedImage?.name}</p>
                                        <p className="text-xs font-medium text-slate-500">Ảnh sẽ được gửi cùng tin nhắn</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearSelectedImage}
                                        className="rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                                        aria-label="Gỡ bỏ hình ảnh đã chọn"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />
                                <input
                                    ref={pdfInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={handlePdfSelect}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={sending}
                                    className="h-[52px] w-[52px] flex-shrink-0 rounded-2xl border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-50"
                                    aria-label="Đính kèm hình ảnh"
                                >
                                    <ImagePlus className="h-5 w-5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => pdfInputRef.current?.click()}
                                    disabled={sending}
                                    className="h-[52px] w-[52px] flex-shrink-0 rounded-2xl border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-50"
                                    aria-label="Đính kèm PDF"
                                >
                                    <FileText className="h-5 w-5" />
                                </Button>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onPaste={handlePaste}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Nhập tin nhắn... (Ctrl+V hoặc kéo thả ảnh)"
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none overflow-hidden max-h-32 min-h-[52px]"
                                    rows="1"
                                />
                                <Button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !selectedImage) || sending}
                                    className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-[52px] w-[52px] flex-shrink-0 shadow-md shadow-primary/20 transition-all p-0 flex items-center justify-center animate-fade-in"
                                >
                                    <Send className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`} />
                                </Button>
                            </form>
                        </div>
                    </>
                )}
            </Card>


            <ImageLightbox
                isOpen={!!lightboxImage}
                imageUrl={lightboxImage}
                onClose={() => setLightboxImage('')}
            />

            {mobileSideOpen && activeThread && (
                <div className="fixed inset-0 z-[80] lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileSideOpen(false)} />
                    <div className="absolute right-0 top-0 h-full w-[min(100%,20rem)] bg-white shadow-xl p-4 overflow-y-auto space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Ngữ cảnh & Duyệt</h3>
                            <button type="button" onClick={() => setMobileSideOpen(false)} className="p-2 text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <ChatContextCard
                            context={chatContext}
                            onViewDiet={() => {
                                setMobileSideOpen(false);
                                const params = new URLSearchParams({
                                    clientId: activeThread.participantId,
                                    clientName: activeThread.participantName || 'Học viên',
                                });
                                navigate(`/pt/clients/dietlog?${params.toString()}`);
                            }}
                        />
                        <ChatPendingReviewCard
                            logs={pendingLogs}
                            loading={loadingPending}
                            reviewingLogId={reviewingLogId}
                            onApprove={(id) => handleQuickReview(id, 'APPROVE')}
                            onReject={(id) => handleQuickReview(id, 'REJECT')}
                            onOpenFull={() => {
                                setMobileSideOpen(false);
                                const params = new URLSearchParams({
                                    clientId: activeThread.participantId,
                                    clientName: activeThread.participantName || 'Học viên',
                                });
                                navigate(`/pt/clients/dietlog?${params.toString()}`);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
