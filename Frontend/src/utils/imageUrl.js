const BACKEND_BASE = "http://127.0.0.1:8002";

export const resolveImageUrl = (path) => {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  if (path.startsWith("/media/")) {
    return `${BACKEND_BASE}${path}`;
  }
  if (path.startsWith("/")) {
    return `${BACKEND_BASE}${path}`;
  }
  return path;
};

export default resolveImageUrl;
