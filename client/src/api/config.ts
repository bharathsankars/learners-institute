const LOCAL_API_URL = "http://localhost:4000";

const isLocalBrowser =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalBrowser ? LOCAL_API_URL : "");
