import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PRODUCT_NAME } from "./config";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

document.title = PRODUCT_NAME;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
