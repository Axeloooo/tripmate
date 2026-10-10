import "@fontsource/sofia-sans/400.css";
import "@fontsource/sofia-sans/600.css";
import "@fontsource/sofia-sans-condensed/600.css";
import "@fontsource/sofia-sans-condensed/800.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createApiClient } from "./api/client";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

createApiClient().then((client) =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App client={client} />
    </StrictMode>,
  ),
);
