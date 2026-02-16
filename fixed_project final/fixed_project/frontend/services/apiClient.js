const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const createError = async (response) => {
    let message = `Request failed with status ${response.status}`;
    try {
        const data = await response.clone().json();
        if (data?.message) {
            message = data.message;
            if (data.error) {
                message += `: ${data.error}`;
            }
        }
    } catch {
        const text = await response.clone().text();
        if (text) {
            message = text;
        }
    }
    return new Error(message);
};

const request = async (path, options = {}, parseJson = true) => {
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    const fetchOptions = {
        ...options,
        credentials: 'include'
    };
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
        throw await createError(response);
    }
    if (!parseJson) {
        return response;
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
};

const jsonHeaders = {
    'Content-Type': 'application/json'
};

export const apiClient = {
    baseUrl: API_BASE_URL,
    get: (path) => request(path),
    post: (path, body) =>
        request(
            path,
            {
                method: 'POST',
                headers: jsonHeaders,
                body: JSON.stringify(body)
            }
        ),
    postForm: (path, formData) =>
        request(
            path,
            {
                method: 'POST',
                body: formData
            }
        ),
    delete: (path) =>
        request(path, { method: 'DELETE' }),
    raw: (path, options = {}) => request(path, options, false)
};

export const buildApiUrl = (relativePath) => `${API_BASE_URL}${relativePath}`;
