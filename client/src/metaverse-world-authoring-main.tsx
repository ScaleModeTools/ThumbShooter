import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { MetaverseWorldAuthoringScreen } from "./metaverse/components/metaverse-world-authoring-screen";
import "./styles/global.css";

const rootElement = document.querySelector<HTMLDivElement>("#app");

if (rootElement === null) {
  throw new Error("WebGPU Metaverse world authoring root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <MetaverseWorldAuthoringScreen />
  </StrictMode>
);
