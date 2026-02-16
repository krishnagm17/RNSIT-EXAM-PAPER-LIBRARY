import { apiClient } from './apiClient.js';

export const userService = {
    fetchAll: () => apiClient.get('/users'),
    remove: (id) => apiClient.delete(`/users/${id}`)
};
