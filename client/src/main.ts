import "./styles/global.css";

import { mountThumbShooterScaffold } from "./app/mount-thumbshooter-scaffold";

const rootElement = document.querySelector<HTMLDivElement>("#app");

if (rootElement === null) {
  throw new Error("ThumbShooter root element was not found.");
}

mountThumbShooterScaffold(rootElement);
