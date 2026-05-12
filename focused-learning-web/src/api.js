const API_URL = "https://zonein-3.onrender.com/api";

export const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Only set JSON content type if it's not FormData
  if (!options.isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    ...options,
    headers,
  };

  // Remove isFormData from config so it doesn't get sent to fetch
  delete config.isFormData;

  if (config.body && typeof config.body === "object" && !options.isFormData) {
    // Note: options.isFormData was deleted from config, but still available in options
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
};
