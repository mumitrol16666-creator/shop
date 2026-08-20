import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "../app/globals.css";
import StorePage from "../app/page";
import AdminPricingPage from "../app/admin/pricing/page";
import AdminAnalyticsPage from "../app/admin/analytics/page";

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  if (pathname === "/admin/analytics" || pathname.startsWith("/admin/analytics")) {
    return <AdminAnalyticsPage />;
  }

  if (pathname.startsWith("/admin")) {
    return <AdminPricingPage />;
  }

  return <StorePage />;
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
