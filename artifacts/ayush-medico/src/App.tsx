import { lazy, Suspense } from "react";
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { RequestMedicineProvider } from "@/context/RequestMedicineContext";
import { AnnouncementProvider } from "@/context/AnnouncementContext";
import { CartProvider } from "@/context/CartContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import OfflinePage from "@/components/OfflinePage";
import Header from "@/components/Header";
import CartDrawer from "@/components/customer/CartDrawer";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";

// ── Homepage sections (eager — above-the-fold, critical path) ─────────────────
import Hero from "@/components/Hero";
import PromoBanner from "@/components/PromoBanner";
import Categories from "@/components/Categories";

// ── Homepage sections (lazy — below-the-fold, non-critical) ──────────────────
const WhyChooseUs         = lazy(() => import("@/components/WhyChooseUs"));
const DeliveryFeatures    = lazy(() => import("@/components/DeliveryFeatures"));
const FeaturedMedicines   = lazy(() => import("@/components/FeaturedMedicines"));
const NewArrivals         = lazy(() => import("@/components/NewArrivals"));
const SpecialMedicines    = lazy(() => import("@/components/SpecialMedicines"));
const ExploreCollections  = lazy(() => import("@/components/ExploreCollections"));
const TestimonialsPreview = lazy(() => import("@/components/TestimonialsPreview"));
const ContactCTA          = lazy(() => import("@/components/ContactCTA"));

// ── Pages (all lazy-loaded — only loaded when route is visited) ───────────────
const AdminLogin            = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminLayout           = lazy(() => import("@/pages/admin/AdminLayout"));
const OrderTracker          = lazy(() => import("@/pages/OrderTracker"));
const CategoriesPage        = lazy(() => import("@/pages/CategoriesPage"));
const CategoryDetailPage    = lazy(() => import("@/pages/CategoryDetailPage"));
const MedicineDetailPage    = lazy(() => import("@/pages/MedicineDetailPage"));
const CartPage              = lazy(() => import("@/pages/CartPage"));
const CheckoutPage          = lazy(() => import("@/pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("@/pages/OrderConfirmationPage"));
const OrderDetailPage       = lazy(() => import("@/pages/OrderDetailPage"));
const NotFoundPage          = lazy(() => import("@/pages/not-found"));

// Product collection pages
const VetMedicinesPage     = lazy(() => import("@/pages/VetMedicinesPage"));
const GeneralProductsPage  = lazy(() => import("@/pages/GeneralProductsPage"));

// Info pages (sections moved off homepage)
const AboutPage           = lazy(() => import("@/pages/AboutPage"));
const ServicesPage        = lazy(() => import("@/pages/ServicesPage"));
const DeliveryPage        = lazy(() => import("@/pages/DeliveryPage"));
const FAQPage             = lazy(() => import("@/pages/FAQPage"));
const CompliancePage      = lazy(() => import("@/pages/CompliancePage"));
const ContactPage         = lazy(() => import("@/pages/ContactPage"));
const RequestMedicinePage = lazy(() => import("@/pages/RequestMedicinePage"));
const GeneralInquiryPage  = lazy(() => import("@/pages/GeneralInquiryPage"));

// Legal pages
const PrivacyPolicyPage      = lazy(() => import("@/pages/legal/PrivacyPolicyPage"));
const TermsPage              = lazy(() => import("@/pages/legal/TermsPage"));
const RefundPolicyPage       = lazy(() => import("@/pages/legal/RefundPolicyPage"));
const ShippingPolicyPage     = lazy(() => import("@/pages/legal/ShippingPolicyPage"));
const PrescriptionPolicyPage = lazy(() => import("@/pages/legal/PrescriptionPolicyPage"));
const DisclaimerPage         = lazy(() => import("@/pages/legal/DisclaimerPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  },
});

/** Thin fallback shown while a lazy chunk loads. */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

/**
 * PublicLayout — shared shell for every public-facing page.
 */
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnnouncementProvider>
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <ScrollProgress />
        <Header />
        <CartDrawer />
        <main>{children}</main>
        <Footer />
        <FloatingWhatsApp />
        <BackToTop />
      </div>
    </AnnouncementProvider>
  );
}

/**
 * Homepage — premium, complete section layout.
 * Hero → PromoBanner → Categories → Featured Medicines →
 * Why Choose Us → New Arrivals → Special Medicines →
 * Explore Collections (Vet + General) → Delivery →
 * Testimonials → Contact CTA
 */
function HomeSections() {
  return (
    <>
      <Hero />
      <PromoBanner />
      <Categories />
      <Suspense fallback={<div className="h-24" />}>
        <FeaturedMedicines />
        <WhyChooseUs />
        <NewArrivals />
        <SpecialMedicines />
        <ExploreCollections />
        <DeliveryFeatures />
        <TestimonialsPreview />
        <ContactCTA />
      </Suspense>
    </>
  );
}

/**
 * OfflineGuard — overlays OfflinePage whenever the device loses internet.
 */
function OfflineGuard({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  return (
    <>
      {children}
      {!isOnline && <OfflinePage />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ayush-medico-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <CustomerAuthProvider>
              <CartProvider>
                <RequestMedicineProvider>
                  <LoadingScreen />

                  <OfflineGuard>
                    <ErrorBoundary label="App">
                      <Suspense fallback={<PageLoader />}>
                        <Switch>
                          {/* ── Admin ── */}
                          <Route path="/admin/login">
                            {() => (
                              <ErrorBoundary label="AdminLogin">
                                <AdminLogin />
                              </ErrorBoundary>
                            )}
                          </Route>
                          <Route path="/admin">
                            {() => (
                              <ErrorBoundary label="AdminLayout">
                                <AdminLayout />
                              </ErrorBoundary>
                            )}
                          </Route>
                          <Route path="/admin/:rest*">
                            {() => (
                              <ErrorBoundary label="AdminLayout">
                                <AdminLayout />
                              </ErrorBoundary>
                            )}
                          </Route>

                          {/* ── Order tracking ── */}
                          <Route path="/track/:requestId" component={OrderTracker} />
                          <Route path="/track"            component={OrderTracker} />

                          {/* ── Cart ── */}
                          <Route path="/cart">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="CartPage">
                                  <CartPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Checkout ── */}
                          <Route path="/checkout">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="CheckoutPage">
                                  <CheckoutPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Order confirmation ── */}
                          <Route path="/order-confirmation/:docId">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="OrderConfirmationPage">
                                  <OrderConfirmationPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Order detail / tracking ── */}
                          <Route path="/order/:docId">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="OrderDetailPage">
                                  <OrderDetailPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Categories listing ── */}
                          <Route path="/categories">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="CategoriesPage">
                                  <CategoriesPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Medicine detail ── */}
                          <Route path="/medicine/:id">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="MedicineDetailPage">
                                  <MedicineDetailPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Individual category ── */}
                          <Route path="/category/:slug">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="CategoryDetailPage">
                                  <CategoryDetailPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Product collection pages ── */}
                          <Route path="/vet-medicines">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="VetMedicinesPage">
                                  <VetMedicinesPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/general-products">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="GeneralProductsPage">
                                  <GeneralProductsPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Info pages (moved from homepage) ── */}
                          <Route path="/about">
                            {() => (
                              <PublicLayout>
                                <AboutPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/services">
                            {() => (
                              <PublicLayout>
                                <ServicesPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/delivery">
                            {() => (
                              <PublicLayout>
                                <DeliveryPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/faq">
                            {() => (
                              <PublicLayout>
                                <FAQPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/compliance">
                            {() => (
                              <PublicLayout>
                                <CompliancePage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/contact">
                            {() => (
                              <PublicLayout>
                                <ContactPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/request-medicine">
                            {() => (
                              <PublicLayout>
                                <RequestMedicinePage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/inquiry">
                            {() => (
                              <PublicLayout>
                                <GeneralInquiryPage />
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Legal pages ── */}
                          <Route path="/privacy-policy">
                            {() => (
                              <PublicLayout>
                                <PrivacyPolicyPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/terms-conditions">
                            {() => (
                              <PublicLayout>
                                <TermsPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/refund-policy">
                            {() => (
                              <PublicLayout>
                                <RefundPolicyPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/shipping-policy">
                            {() => (
                              <PublicLayout>
                                <ShippingPolicyPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/prescription-policy">
                            {() => (
                              <PublicLayout>
                                <PrescriptionPolicyPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/disclaimer">
                            {() => (
                              <PublicLayout>
                                <DisclaimerPage />
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Homepage (catch-all) ── */}
                          <Route path="/">
                            {() => (
                              <PublicLayout>
                                <HomeSections />
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── 404 ── */}
                          <Route>
                            {() => (
                              <PublicLayout>
                                <NotFoundPage />
                              </PublicLayout>
                            )}
                          </Route>
                        </Switch>
                      </Suspense>
                    </ErrorBoundary>
                  </OfflineGuard>

                  <Toaster />
                </RequestMedicineProvider>
              </CartProvider>
            </CustomerAuthProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
