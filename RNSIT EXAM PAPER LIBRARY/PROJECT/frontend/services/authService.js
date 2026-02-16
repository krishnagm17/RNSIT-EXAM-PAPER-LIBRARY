import { apiClient } from './apiClient.js';

export const authService = {
    login: (payload) => apiClient.post('/auth/login', payload),
    googleLogin: (token) => apiClient.post('/auth/google', { token }),
    register: (payload) => apiClient.post('/auth/register', payload),
    initSignup: (payload) => apiClient.post('/auth/signup-init', payload),
    completeSignup: (payload) => apiClient.post('/auth/signup-complete', payload),
    requestReset: (email) => apiClient.post('/password-resets/request', { email }),
    confirmReset: (email, otp, newPassword) => apiClient.post('/password-resets/confirm', { email, otp, newPassword }),
    changePassword: (email, oldPassword, newPassword) =>
        apiClient.post('/auth/change-password', { email, oldPassword, newPassword }),
    verifySession: () => apiClient.get('/auth/verify'),
    logout: () => apiClient.post('/auth/logout', {})
};
