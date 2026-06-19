import { Routes, Route, Navigate } from "react-router-dom";
import { PartnerLayout } from "./PartnerLayout";
import { SendParcelsPage } from "./SendParcelsPage";
import { TrackParcelsPage } from "./TrackParcelsPage";
import { EarningsPage } from "./EarningsPage";
import { HistoryPage } from "./HistoryPage";
import { SettingsPage } from "./SettingsPage";

export const PartnerPortal = () => {
  return (
    <PartnerLayout>
      <Routes>
        <Route index           element={<SendParcelsPage />} />
        <Route path="track"    element={<TrackParcelsPage />} />
        <Route path="reconciliation" element={<EarningsPage />} />
        <Route path="earnings" element={<Navigate to="/partner/reconciliation" replace />} />
        <Route path="history"  element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*"        element={<Navigate to="/partner" replace />} />
      </Routes>
    </PartnerLayout>
  );
};
