// src/pages/pt/ChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Send, MessageSquare, Clock, ShieldAlert } from 'lucide-react';
import { chatService } from '../../services/chatService';
// IMPORT HÀM GỬI WEBSOCKET
import { sendWebSocketMessage } from '../../services/websocketService';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

export default function ChatPage() {
    const { user } = useAuthStore();
    const location = useLocation();

    const [threads, setThreads] = useState([]);
    const [activeMappingId, setActiveMappingId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    const [loadingThreads, setLoadingThreads] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);

    const loadThreads = async () => {
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
    };

    useEffect(() => {
        loadThreads().then((loadedThreads) => {
            if (loadedThreads.length > 0) {
                const targetClientId = location.state?.targetClientId;
                if (targetClientId) {
                    const targetThread = loadedThreads.find(t => t.participantId === targetClientId);
                    setActiveMappingId(targetThread ? targetThread.mappingId : loadedThreads[0].mappingId);
                } else if (!activeMappingId) {
                    setActiveMappingId(loadedThreads[0].mappingId);
                }
            }
        });
    }, [location.state, activeMappingId]);

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

    // HỨNG SỰ KIỆN TIN NHẮN TỪ WEBSOCKET (Cả tin mình gửi và tin người khác gửi)
    useEffect(() => {
        const handleNewMessage = (e) => {
            const newMsg = e.detail;

            // Đẩy vào khung chat hiện tại nếu đúng ID
            if (newMsg.mappingId === activeMappingId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                chatService.markRead(activeMappingId).catch(console.error);
            }

            // Luôn reload cột bên trái để cập nhật text "Tin nhắn cuối cùng" và chấm đỏ
            loadThreads();
        };

        window.addEventListener('realtime_chat_message', handleNewMessage);
        return () => window.removeEventListener('realtime_chat_message', handleNewMessage);
    }, [activeMappingId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || !activeMappingId) return;

        try {
            setSending(true);

            // GỬI QUA ĐƯỜNG ỐNG WEBSOCKET
            const success = sendWebSocketMessage('CHAT_SEND', {
                mappingId: activeMappingId,
                content: newMessage.trim()
            });

            if (success) {
                setNewMessage('');
                // Note: Không cần add tay vào UI nữa. Server sẽ bắn trả lại tin nhắn qua WebSocket và useEffect bên trên sẽ lo việc hiển thị.
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

    const activeThread = threads.find(t => t.mappingId === activeMappingId);

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] min-h-[600px] flex gap-6 animate-fade-in pb-6">

            {/* CỘT TRÁI */}
            <Card className="w-80 flex flex-col bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden flex-shrink-0">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" /> Tin nhắn
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

            {/* CỘT PHẢI */}
            <Card className="flex-1 flex flex-col bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden relative">
                {!activeMappingId ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30">
                        <MessageSquare className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700">Chưa chọn cuộc trò chuyện</h3>
                        <p className="text-slate-500 mt-2">Chọn một người bên trái để bắt đầu nhắn tin.</p>
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
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đang kết nối
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
                                    Hãy gửi lời chào đầu tiên!
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
                                                {msg.content}
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
                            <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Nhập tin nhắn... (Nhấn Enter để gửi)"
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none overflow-hidden max-h-32 min-h-[52px]"
                                    rows="1"
                                />
                                <Button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
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