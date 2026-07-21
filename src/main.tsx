import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { NegocioProvider } from "./context/NegocioContext";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontró el elemento #root");
}

const root = ReactDOM.createRoot(rootElement);
console.log("App montada");
root.render(
  <React.StrictMode>
    <NegocioProvider>
      <App />
    </NegocioProvider>
  </React.StrictMode>
);
