// src/pages/customer/CustomerChatPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Send, MessageSquare, Clock, ShieldAlert, ImagePlus, X } from 'lucide-react';
import { chatService } from '../../services/chatService';
import { sendWebSocketMessage } from '../../services/websocketService';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import useWebSocket from '../../hooks/useWebSocket';

const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024;

export default function CustomerChatPage() {
    const { user } = useAuthStore();
    const location = useLocation();
    useWebSocket();
    const [threads, setThreads] = useState([]);
    const [activeMappingId, setActiveMappingId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImagePreview, setSelectedImagePreview] = useState('');

    const [loadingThreads, setLoadingThreads] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);
    const imageInputRef = useRef(null);

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

    useEffect(() => {
        let isMounted = true;
        const initChat = async () => {
            const loadedThreads = await loadThreads();
            if (!isMounted) return;

            if (loadedThreads.length > 0) {
                const targetPtId = location.state?.targetPtId;
                if (targetPtId) {
                    const targetThread = loadedThreads.find(t => t.participantId === targetPtId);
                    setActiveMappingId(prev => {
                        const newId = targetThread ? targetThread.mappingId : loadedThreads[0].mappingId;
                        return prev !== newId ? newId : prev;
                    });
                } else {
                    setActiveMappingId(prev => prev || loadedThreads[0].mappingId);
                }
            }
        };
        initChat();
        return () => { isMounted = false; };
    }, [location.state, loadThreads]);

    useEffect(() => {
        if (!activeMappingId) return;

        const loadMessages = async () => {
            try {
                setLoadingMessages(true);
                const res = await chatService.getMessages(activeMappingId, { page: 0, size: 50 });
                const msgs = res.data.data.content || [];
                setMessages(msgs.reverse());
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

    useEffect(() => {
        const handleNewMessage = (e) => {
            const newMsg = e.detail;
            if (!newMsg.createdAt) {
                newMsg.createdAt = new Date().toISOString();
            }
            if (newMsg.mappingId === activeMappingId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                chatService.markRead(activeMappingId).catch(console.error);
            }
            loadThreads();
        };

        window.addEventListener('realtime_chat_message', handleNewMessage);
        return () => window.removeEventListener('realtime_chat_message', handleNewMessage);
    }, [activeMappingId, loadThreads]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        return () => {
            if (selectedImagePreview) {
                URL.revokeObjectURL(selectedImagePreview);
            }
        };
    }, [selectedImagePreview]);

    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type?.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh');
            event.target.value = '';
            return;
        }
        if (file.size > MAX_CHAT_IMAGE_SIZE) {
            toast.error('Ảnh quá lớn. Kích thước tối đa là 5MB.');
            event.target.value = '';
            return;
        }

        if (selectedImagePreview) {
            URL.revokeObjectURL(selectedImagePreview);
        }
        setSelectedImage(file);
        setSelectedImagePreview(URL.createObjectURL(file));
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

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if ((!newMessage.trim() && !selectedImage) || !activeMappingId) return;

        try {
            setSending(true);
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

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';
    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const activeThread = threads.find(t => t.mappingId === activeMappingId);

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-120px)] min-h-[600px] flex gap-6 animate-fade-in pb-6 mt-6">

            {/* CỘT TRÁI: DANH SÁCH PT */}
            <Card className="w-80 flex flex-col bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden flex-shrink-0">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" /> Hỗ trợ
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Trò chuyện với Huấn luyện viên</p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loadingThreads ? (
                        [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-100" />)
                    ) : threads.length === 0 ? (
                        <div className="text-center py-10">
                            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 font-medium">Bạn chưa kết nối với PT nào</p>
                            <Button
                                variant="link"
                                className="text-blue-600 mt-2 h-auto p-0"
                                onClick={() => window.location.href = '/marketplace'}
                            >
                                Tìm PT ngay
                            </Button>
                        </div>
                    ) : (
                        threads.map((thread) => {
                            const isActive = thread.mappingId === activeMappingId;
                            return (
                                <button
                                    key={thread.mappingId}
                                    onClick={() => setActiveMappingId(thread.mappingId)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                                        isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                                            isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
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
                                            <h3 className={`text-sm truncate ${isActive ? 'font-bold text-blue-900' : 'font-semibold text-slate-700'}`}>
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

            {/* CỘT PHẢI: KHUNG CHAT */}
            <Card className="flex-1 flex flex-col bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden relative">
                {!activeMappingId ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30">
                        <MessageSquare className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700">Trợ giúp từ PT</h3>
                        <p className="text-slate-500 mt-2">Chọn PT của bạn bên trái để bắt đầu nhắn tin.</p>
                    </div>
                ) : (
                    <>
                        <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-4 z-10 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold">
                                {activeThread?.participantAvatarUrl ? (
                                    <img src={activeThread.participantAvatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                ) : getInitials(activeThread?.participantName)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{activeThread?.participantName}</h3>
                                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Huấn luyện viên của bạn
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
                            {loadingMessages ? (
                                <div className="flex flex-col gap-4">
                                    <Skeleton className="h-16 w-2/3 rounded-2xl rounded-tl-none self-start bg-slate-200" />
                                    <Skeleton className="h-16 w-2/3 rounded-2xl rounded-tr-none self-end bg-blue-100" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                                    Gửi tin nhắn đầu tiên cho PT của bạn!
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = msg.senderId === user?.id;
                                    return (
                                        <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[70%] px-5 py-3 text-sm ${
                                                isMe
                                                    ? 'bg-blue-600 text-white rounded-3xl rounded-tr-sm shadow-md shadow-blue-500/20'
                                                    : 'bg-white border border-slate-200 text-slate-800 rounded-3xl rounded-tl-sm shadow-sm'
                                            }`}>
                                                {msg.imageUrl && (
                                                    <img
                                                        src={msg.imageUrl}
                                                        alt={msg.content || 'Hình ảnh đính kèm'}
                                                        className="mb-2 max-h-72 w-full rounded-2xl object-cover"
                                                    />
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
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none overflow-hidden max-h-32 min-h-[52px]"
                                    rows="1"
                                />
                                <Button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !selectedImage) || sending}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-[52px] w-[52px] flex-shrink-0 shadow-md shadow-blue-500/20 transition-all p-0 flex items-center justify-center"
                                >
                                    <Send className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`} />
                                </Button>
                            </form>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
