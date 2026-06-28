// src/services/chatService.js
import api from './api';

export const chatService = {
    /**
     * Lấy danh sách tất cả các luồng chat (Threads) của người dùng hiện tại
     * Trả về danh sách những người đang nhắn tin cùng
     */
    getThreads: () => {
        return api.get('/chat/threads');
    },

    /**
     * Lấy lịch sử tin nhắn của một luồng chat cụ thể
     * @param {string} mappingId - ID của luồng chat (PtClientMapping ID)
     * @param {object} params - { page, size } dùng để phân trang
     */
    getMessages: (mappingId, params = { page: 0, size: 30 }) => {
        return api.get(`/chat/threads/${mappingId}/messages`, { params });
    },

    /**
     * Đánh dấu toàn bộ tin nhắn trong luồng này là đã đọc
     * @param {string} mappingId - ID của luồng chat
     */
    markRead: (mappingId) => {
        return api.put(`/chat/threads/${mappingId}/read`);
    }
};