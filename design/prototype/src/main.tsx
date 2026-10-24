import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./app/demoEntry";
import { router } from "./app/router";
import "./shared/styles/tokens.css";
import "./shared/styles/reset.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
