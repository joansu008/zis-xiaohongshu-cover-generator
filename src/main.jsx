import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { XiaohongshuApp } from "./XiaohongshuApp.jsx";
import "./styles.css";

const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {pathname === "/xiaohongshu" ? <XiaohongshuApp /> : <App />}
  </React.StrictMode>,
);
