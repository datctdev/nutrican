import { useState } from 'react';
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { chatService } from '../../services/chatService';

export default function ChatMessageActions({ message, isMine, onUpdated, onDeleted }) {
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(message.content || '');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!isMine) return null;

    const isText = message.messageType === 'TEXT'
        && !message.imageUrl
        && !message.attachmentUrl;

    const saveEdit = async () => {
        const normalized = content.trim();
        if (!normalized) {
            toast.error('Nội dung tin nhắn không được để trống');
            return;
        }
        if (normalized === message.content) {
            setEditing(false);
            return;
        }
        try {
            setSaving(true);
            const response = await chatService.updateMessage(
                message.mappingId,
                message.id,
                normalized,
            );
            onUpdated?.(response.data?.data);
            setEditing(false);
            toast.success('Đã sửa tin nhắn');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể sửa tin nhắn');
        } finally {
            setSaving(false);
        }
    };

    const deleteMessage = async () => {
        if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;
        try {
            setDeleting(true);
            await chatService.deleteMessage(message.mappingId, message.id);
            onDeleted?.(message.id);
            toast.success('Đã xóa tin nhắn');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể xóa tin nhắn');
        } finally {
            setDeleting(false);
        }
    };

    if (editing) {
        return (
            <div className="mt-1.5 flex w-full max-w-sm items-center gap-1.5">
                <input
                    autoFocus
                    value={content}
                    maxLength={2000}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            saveEdit();
                        }
                        if (event.key === 'Escape') {
                            setContent(message.content || '');
                            setEditing(false);
                        }
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving}
                    className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                    title="Lưu"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setContent(message.content || '');
                        setEditing(false);
                    }}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    title="Hủy"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="mt-1 flex items-center justify-end gap-0.5 opacity-70 transition-opacity hover:opacity-100">
            {isText && (
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                    title="Sửa tin nhắn"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            )}
            <button
                type="button"
                onClick={deleteMessage}
                disabled={deleting}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Xóa tin nhắn"
            >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
        </div>
    );
}
