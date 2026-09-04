import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { DemoProvider } from "./lib/demo";
import { CartProvider } from "./lib/cart";
import { InboxProvider } from "./lib/inbox";
import { ToastProvider } from "./components/toast";
import "./styles/coo.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DemoProvider>
          <CartProvider>
            <InboxProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </InboxProvider>
          </CartProvider>
        </DemoProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
