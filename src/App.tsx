import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StationProvider } from "./contexts/StationContext";
import { LocationProvider } from "./contexts/LocationContext";
import { UserProvider } from "./contexts/UserContext";
import { ParcelProvider } from "./contexts/ParcelContext";
import { FrontdeskParcelProvider } from "./contexts/FrontdeskParcelContext";
import { DriverTrackerProvider } from "./contexts/DriverTrackerContext";
import { ShelfProvider } from "./contexts/ShelfContext";
import { ToastProvider } from "./components/ui/toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import { TenantProvider } from "./contexts/TenantContext";
import { MainLayout } from "./layouts/MainLayout";
import { ParcelLayout } from "./layouts/ParcelLayout";
import { DeliveryLayout } from "./layouts/DeliveryLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { SuperAdminLayout } from "./layouts/SuperAdminLayout";
import { RiderLayout } from "./layouts/RiderLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollController } from "./components/ScrollController";
import { Login } from "./screens/Login";
import { Landing } from "./screens/Landing/Landing";
import { Signup } from "./screens/Signup/Signup";
import { VerifyEmail } from "./screens/VerifyEmail";
import { ForgotPassword } from "./screens/ForgotPassword";
import { PasswordRequestSent } from "./screens/PasswordRequestSent";
import { ResetPassword } from "./screens/ResetPassword";
import { ParcelRegistration } from "./screens/ParcelRegistration";
import { PickupRequest } from "./screens/PickupRequest";
import { ParcelCostsAndPOD } from "./screens/ParcelCostsAndPOD";
import { ParcelReview } from "./screens/ParcelReview";
import { ParcelSMSSuccess } from "./screens/ParcelSMSSuccess";
import { ParcelSelection } from "./screens/ParcelSelection";
import { ParcelRiderSelection } from "./screens/ParcelRiderSelection";
import { ActiveDeliveries } from "./screens/ActiveDeliveries";
import { RiderDashboard } from "./screens/RiderDashboard";
import { RiderHistory } from "./screens/RiderHistory";
import { RiderEarnings } from "./screens/RiderEarnings/RiderEarnings";
import { Reconciliation } from "./screens/Reconciliation";
import { ReconciliationConfirmation } from "./screens/ReconciliationConfirmation";
import { FinancialDashboard } from "./screens/FinancialDashboard/FinancialDashboard";
import { ShelfManagement } from "./screens/ShelfManagement/ShelfManagement";
import { PreDeliveryQueue } from "./screens/CallCenter/PreDeliveryQueue/PreDeliveryQueue";
import { PostDeliveryFollowUp } from "./screens/CallCenter/PostDeliveryFollowUp/PostDeliveryFollowUp";
import { ParcelSearch } from "./screens/ParcelSearch/ParcelSearch";
import { ParcelEdit } from "./screens/ParcelEdit";
// import { AdminDashboard } from "./screens/Admin/AdminDashboard/AdminDashboard";
import { StationManagement } from "./screens/Admin/StationManagement/StationManagement";
import { UserManagement } from "./screens/Admin/UserManagement/UserManagement";
import { SystemParcelOverview } from "./screens/Admin/SystemParcelOverview/SystemParcelOverview";
import { FinancialReports } from "./screens/Admin/FinancialReports/FinancialReports";
import { AdminReconciliation } from "./screens/Admin/AdminReconciliation/AdminReconciliation";
import { AdminReconciliationAnalytics } from "./screens/Admin/AdminReconciliationAnalytics/AdminReconciliationAnalytics";
import { Settings } from "./screens/Settings/Settings";
import { Help } from "./screens/Help/Help";
import { TenantSettings } from "./screens/Admin/TenantSettings/TenantSettings";
import { Billing } from "./screens/Admin/Billing/Billing";
import { DeliveryIncome } from "./screens/Admin/DeliveryIncome/DeliveryIncome";
import { DeliveryAccountability } from "./screens/Admin/DeliveryAccountability/DeliveryAccountability";
import { TenantManagement } from "./screens/Admin/TenantManagement/TenantManagement";
import { CrossTenantAnalytics } from "./screens/Admin/CrossTenantAnalytics/CrossTenantAnalytics";
import { TrackParcel } from "./screens/TrackParcel/TrackParcel";
import { CustomerParcelHub } from "./screens/CustomerParcelHub/CustomerParcelHub";
import { CustomerAuthProvider } from "./contexts/CustomerAuthContext";
import { ParcelTransfer } from "./screens/ParcelTransfer";
import { OutgoingParcels } from "./screens/OutgoingParcels";
import { IncomingParcels } from "./screens/IncomingParcels";
import { DriverInboundReconciliation } from "./screens/DriverInboundReconciliation/DriverInboundReconciliation";
import { DriverTrackerDetail } from "./screens/DriverInboundReconciliation/DriverTrackerDetail";
import { SystemLogs } from "./screens/Admin/SystemLogs/SystemLogs";
import { HomeDeliveryWatchlist } from "./screens/CallCenter/HomeDeliveryWatchlist/HomeDeliveryWatchlist";
import { SmartSearch } from "./screens/SmartSearch/SmartSearch";
import RiderFuelRequest from "./screens/RiderFuelRequest";
import AdminFuelRequests from "./screens/AdminFuelRequests";
import AdminStatistics from "./screens/Admin/AdminStatistics";
import { ReconciliationAnalytics } from "./screens/ReconciliationAnalytics";
import { RiderDetail } from "./screens/ReconciliationAnalytics/RiderDetail";
import { PartnerPortal } from "./screens/PartnerPortal/PartnerPortal";
import { ParcelScan } from "./screens/ParcelScan/ParcelScan";
import { AddressManagement } from "./screens/AddressManagement/AddressManagement";
import { AdminFinancialDashboard } from "./screens/Admin/AdminFinancialDashboard";
import { RiderMap } from "./screens/RiderMap";

const PARCEL_ROLES = ["FRONTDESK", "MANAGER"];
const DELIVERY_ROLES = ["MANAGER", "CALLER"];
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export const App = (): JSX.Element => {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <TenantProvider>
          <StationProvider>
            <LocationProvider>
              <UserProvider>
                <ParcelProvider>
                  <FrontdeskParcelProvider>
                    <DriverTrackerProvider>
                      <ShelfProvider>
                        <ToastProvider>
                          <BrowserRouter>
                            <Routes>
                              {/* ── Auth ── */}
                              <Route path="/login" element={<Login />} />
                              <Route path="/forgot-password" element={<ForgotPassword />} />
                              <Route path="/password-request-sent" element={<PasswordRequestSent />} />
                              <Route path="/reset-password" element={<ResetPassword />} />

                              {/* ── Public ── */}
                              <Route path="/track" element={<TrackParcel />} />
                              <Route path="/p/:parcelId" element={<ParcelScan />} />
                              <Route path="/scan" element={<ParcelScan />} />
                              <Route path="/receive" element={<CustomerAuthProvider><CustomerParcelHub /></CustomerAuthProvider>} />

                              {/* ── Partner Portal ── */}
                              <Route path="/partner/*" element={<ProtectedRoute allowedRoles={["VENDOR"]}><PartnerPortal /></ProtectedRoute>} />

                              {/* ── Root / Marketing ── */}
                              <Route path="/" element={<Landing />} />
                              <Route path="/signup" element={<Signup />} />
                              <Route path="/verify-email" element={<VerifyEmail />} />

                              {/* ════════════════════════════════
                                  PARCEL HUB  /parcel/*
                              ════════════════════════════════ */}
                              <Route path="/parcel/intake" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><ParcelRegistration /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/search" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><ParcelSearch /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/smart-search" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><SmartSearch /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/edit" element={<ProtectedRoute allowedRoles={["MANAGER"]}><ParcelLayout><ParcelEdit /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/transfer" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><ParcelTransfer /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/incoming" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><IncomingParcels /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/outgoing" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><OutgoingParcels /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/shelf" element={<ProtectedRoute allowedRoles={["MANAGER"]}><ParcelLayout><ShelfManagement /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/pickup" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><PickupRequest /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/driver-tracker" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><DriverInboundReconciliation /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/driver-tracker/:phoneKey" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><DriverTrackerDetail /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/assignments" element={<ProtectedRoute allowedRoles={["MANAGER"]}><ParcelLayout><ParcelSelection /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/settings" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><Settings /></ParcelLayout></ProtectedRoute>} />
                              <Route path="/parcel/preferences" element={<Navigate to="/parcel/settings" replace />} />
                              <Route path="/parcel/help" element={<ProtectedRoute allowedRoles={PARCEL_ROLES}><ParcelLayout><Help /></ParcelLayout></ProtectedRoute>} />

                              {/* Parcel flow sub-pages (layout-less, keep MainLayout for now) */}
                              <Route path="/parcel-costs-pod" element={<MainLayout><ParcelCostsAndPOD /></MainLayout>} />
                              <Route path="/parcel-review" element={<MainLayout><ParcelReview /></MainLayout>} />
                              <Route path="/parcel-sms-success" element={<MainLayout><ParcelSMSSuccess /></MainLayout>} />

                              {/* ════════════════════════════════
                                  DELIVERY HUB  /delivery/*
                              ════════════════════════════════ */}
                              <Route path="/delivery/assignments" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><ParcelSelection /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/rider-selection" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><ParcelRiderSelection /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/active" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><ActiveDeliveries /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/reconciliation" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><Reconciliation /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/reconciliation-confirmation" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><ReconciliationConfirmation /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/analytics" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><ReconciliationAnalytics /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/rider-detail" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><RiderDetail /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/rider-map" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><RiderMap /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/financial" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><FinancialDashboard /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/fuel-requests" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><AdminFuelRequests /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/call-center" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><PreDeliveryQueue /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/call-center/follow-up" element={<ProtectedRoute allowedRoles={["CALLER"]}><DeliveryLayout><PostDeliveryFollowUp /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/call-center/home-delivery" element={<ProtectedRoute allowedRoles={["CALLER"]}><DeliveryLayout><HomeDeliveryWatchlist /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/intake" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><ParcelRegistration /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/search" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><ParcelSearch /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/pickup" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><PickupRequest /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/addresses" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><AddressManagement /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/addresses" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><AddressManagement /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/smart-search" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><SmartSearch /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/edit" element={<ProtectedRoute allowedRoles={["MANAGER"]}><DeliveryLayout><ParcelEdit /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/settings" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><Settings /></DeliveryLayout></ProtectedRoute>} />
                              <Route path="/delivery/preferences" element={<Navigate to="/delivery/settings" replace />} />
                              <Route path="/delivery/help" element={<ProtectedRoute allowedRoles={DELIVERY_ROLES}><DeliveryLayout><Help /></DeliveryLayout></ProtectedRoute>} />

                              {/* ════════════════════════════════
                                  ADMIN SHELL  /admin/*
                              ════════════════════════════════ */}
                              <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminStatistics /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/statistics" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminFinancialDashboard /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/stations" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><StationManagement /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><UserManagement /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/parcels" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><SystemParcelOverview /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/reconciliation" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminReconciliation /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/delivery-analytics" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminReconciliationAnalytics /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/rider-detail" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><RiderDetail /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/financial" element={<Navigate to="/admin/dashboard" replace />} />
                              <Route path="/admin/financial-reports" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><FinancialReports /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/system-logs" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><SystemLogs /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/rider-map" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><RiderMap /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/fuel-requests" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminFuelRequests /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><TenantSettings /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/billing" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><Billing /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/delivery-income" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><DeliveryIncome /></AdminLayout></ProtectedRoute>} />
                              <Route path="/admin/accountability" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><DeliveryAccountability /></AdminLayout></ProtectedRoute>} />

                              {/* Super Admin only */}
                              <Route path="/admin/tenants" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><SuperAdminLayout><TenantManagement /></SuperAdminLayout></ProtectedRoute>} />
                              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><SuperAdminLayout><CrossTenantAnalytics /></SuperAdminLayout></ProtectedRoute>} />

                              {/* ════════════════════════════════
                                  RIDER APP  /rider/*  (unchanged)
                              ════════════════════════════════ */}
                              <Route path="/rider/dashboard" element={<ProtectedRoute allowedRoles={["RIDER"]}><RiderLayout><RiderDashboard /></RiderLayout></ProtectedRoute>} />
                              <Route path="/rider/history" element={<ProtectedRoute allowedRoles={["RIDER"]}><RiderLayout><RiderHistory /></RiderLayout></ProtectedRoute>} />
                              <Route path="/rider/earnings" element={<ProtectedRoute allowedRoles={["RIDER"]}><RiderLayout><RiderEarnings /></RiderLayout></ProtectedRoute>} />
                              <Route path="/rider/fuel-request" element={<ProtectedRoute allowedRoles={["RIDER"]}><RiderLayout><RiderFuelRequest /></RiderLayout></ProtectedRoute>} />

                              {/* ════════════════════════════════
                                  LEGACY REDIRECTS (backward compat)
                              ════════════════════════════════ */}
                              <Route path="/parcel-intake" element={<Navigate to="/parcel/intake" replace />} />
                              <Route path="/parcel-search" element={<Navigate to="/parcel/search" replace />} />
                              <Route path="/parcel-edit" element={<Navigate to="/parcel/edit" replace />} />
                              <Route path="/parcel-transfer" element={<Navigate to="/parcel/transfer" replace />} />
                              <Route path="/incoming-parcels" element={<Navigate to="/parcel/incoming" replace />} />
                              <Route path="/outgoing-parcels" element={<Navigate to="/parcel/outgoing" replace />} />
                              <Route path="/shelf-management" element={<Navigate to="/parcel/shelf" replace />} />
                              <Route path="/pickup-request" element={<Navigate to="/parcel/pickup" replace />} />
                              <Route path="/driver-tracker" element={<Navigate to="/parcel/driver-tracker" replace />} />
                              <Route path="/driver-tracker/:phoneKey" element={<Navigate to="/parcel/driver-tracker" replace />} />
                              <Route path="/smart-search" element={<Navigate to="/parcel/smart-search" replace />} />
                              <Route path="/package-assignments" element={<Navigate to="/delivery/assignments" replace />} />
                              <Route path="/rider-selection" element={<Navigate to="/delivery/rider-selection" replace />} />
                              <Route path="/active-deliveries" element={<Navigate to="/delivery/active" replace />} />
                              <Route path="/reconciliation" element={<Navigate to="/delivery/reconciliation" replace />} />
                              <Route path="/reconciliation-history" element={<Navigate to="/delivery/reconciliation" replace />} />
                              <Route path="/reconciliation-confirmation" element={<Navigate to="/delivery/reconciliation-confirmation" replace />} />
                              <Route path="/reconciliation-analytics" element={<Navigate to="/delivery/analytics" replace />} />
                              <Route path="/rider-detail" element={<Navigate to="/delivery/rider-detail" replace />} />
                              <Route path="/financial-dashboard" element={<Navigate to="/delivery/financial" replace />} />
                              <Route path="/call-center" element={<Navigate to="/delivery/call-center" replace />} />
                              <Route path="/call-center/follow-up" element={<Navigate to="/delivery/call-center/follow-up" replace />} />
                              <Route path="/call-center/home-delivery" element={<Navigate to="/delivery/call-center/home-delivery" replace />} />
                              <Route path="/preferences" element={<Navigate to="/parcel/preferences" replace />} />
                              <Route path="/help" element={<Navigate to="/parcel/help" replace />} />
                              <Route path="/admin/fuel-requests-old" element={<Navigate to="/admin/fuel-requests" replace />} />
                            </Routes>
                            <ScrollController />
                          </BrowserRouter>
                        </ToastProvider>
                      </ShelfProvider>
                    </DriverTrackerProvider>
                  </FrontdeskParcelProvider>
                </ParcelProvider>
              </UserProvider>
            </LocationProvider>
          </StationProvider>
        </TenantProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
};
