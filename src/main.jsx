import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import ReactQueryProvider from "./provider/react-query-provider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ReactQueryProvider>
        <App />
      </ReactQueryProvider>
    </BrowserRouter>
  </React.StrictMode>
);