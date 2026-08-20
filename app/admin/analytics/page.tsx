"use client";

import { AnalyticsReport } from "../../../components/AnalyticsReport";
import { AdminAccessGate } from "../../../components/AdminAccessGate";

export default function AdminAnalyticsPage() {
  return (
    <AdminAccessGate>
      <AnalyticsReport />
    </AdminAccessGate>
  );
}
