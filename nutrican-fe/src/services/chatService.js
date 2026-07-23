import api from './api';

export const chatService = {

    getThreads: () => {
        return api.get('/chat/threads');
    },


    getMessages: (mappingId, params = { page: 0, size: 30 }) => {
        return api.get(`/chat/threads/${mappingId}/messages`, { params });
    },

    sendImage: (mappingId, file, content) => {
        const formData = new FormData();
        formData.append('file', file);
        if (content?.trim()) {
            formData.append('content', content.trim());
        }
        return api.post(`/chat/threads/${mappingId}/images`, formData);
    },


    markRead: (mappingId) => {
        return api.put(`/chat/threads/${mappingId}/read`);
    },

    sendAttachment: (mappingId, file, content, contextType, contextRefId) => {
        const formData = new FormData();
        formData.append('file', file);
        if (content?.trim()) formData.append('content', content.trim());
        if (contextType) formData.append('contextType', contextType);
        if (contextRefId) formData.append('contextRefId', contextRefId);
        return api.post(`/chat/threads/${mappingId}/attachments`, formData);
    },

    updateMessage: (mappingId, messageId, content) =>
        api.patch(`/chat/threads/${mappingId}/messages/${messageId}`, { content }),

    deleteMessage: (mappingId, messageId) =>
        api.delete(`/chat/threads/${mappingId}/messages/${messageId}`),
};
