import { apiClient, buildApiUrl } from './apiClient.js';

export const documentService = {
    fetchAll: () => apiClient.get('/documents'),
    checkDuplicate: (data) => apiClient.post('/documents/check-duplicate', data),
    upload: (formData) => apiClient.postForm('/documents', formData),
    remove: (id) => apiClient.delete(`/documents/${id}`),
    download: async (id) => {
        const response = await apiClient.raw(`/documents/${id}/file`);
        return response.blob();
    },
    getFileUrl: (relativeOrAbsolute) =>
        relativeOrAbsolute.startsWith('http')
            ? relativeOrAbsolute
            : buildApiUrl(relativeOrAbsolute)
};
