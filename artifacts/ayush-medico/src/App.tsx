import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
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
import TrustBadges from "@/components/TrustBadges";
import Categories from "@/components/Categories";

// ── Homepage sections (lazy — below-the-fold, non-critical) ──────────────────
const PromoBanner       = lazy(() => import("@/components/PromoBanner"));
const NewArrivals       = lazy(() => import("@/components/NewArrivals"));
const SpecialMedicines  = lazy(() => import("@/components/SpecialMedicines"));
const DeliveryFeatures  = lazy(() => import("@/components/DeliveryFeatures"));
const HowItWorks        = lazy(() => import("@/components/HowItWorks"));
const About             = lazy(() => import("@/components/About"));
const Services          = lazy(() => import("@/components/Services"));
const WhyChooseUs       = lazy(() => import("@/components/WhyChooseUs"));
const Testimonials      = lazy(() => import("@/components/Testimonials"));
const FAQ               = lazy(() => import("@/components/FAQ"));
const TrustCompliance   = lazy(() => import("@/components/TrustCompliance"));
const RequestMedicine   = lazy(() => import("@/components/RequestMedicine"));
const GeneralInquiry    = lazy(() => import("@/components/GeneralInquiry"));
const Contact           = lazy(() => import("@/components/Contact"));

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

// Legal pages
const PrivacyPolicyPage     = lazy(() => import("@/pages/legal/PrivacyPolicyPage"));
const TermsPage             = lazy(() => import("@/pages/legal/TermsPage"));
const RefundPolicyPage      = lazy(() => import("@/pages/legal/RefundPolicyPage"));
const ShippingPolicyPage    = lazy(() => import("@/pages/legal/ShippingPolicyPage"));
const PrescriptionPolicyPage = lazy(() => import("@/pages/legal/PrescriptionPolicyPage"));
const DisclaimerPage        = lazy(() => import("@/pages/legal/DisclaimerPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
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
 * Homepage — all sections in one long scroll.
 * Above-the-fold sections (Hero, TrustBadges, Categories) load eagerly.
 * Everything below is lazy with a lightweight skeleton fallback.
 */
function HomeSections() {
  return (
    <>
      <Hero />
      <TrustBadges />
      <Categories />
      <Suspense fallback={<div className="h-24" />}>
        <PromoBanner />
        <NewArrivals />
        <SpecialMedicines />
        <DeliveryFeatures />
        <HowItWorks />
        <About />
        <Services />
        <WhyChooseUs />
        <Testimonials />
        <FAQ />
        <TrustCompliance />
        <RequestMedicine />
        <GeneralInquiry />
        <Contact />
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

                          {/* ── Order tracking (legacy prescription-based) ── */}
                          <Route path="/track/:requestId" component={OrderTracker} />
                          <Route path="/track"            component={OrderTracker} />

                          {/* ── Phase 2: Cart ── */}
                          <Route path="/cart">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="CartPage">
                                  <CartPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Phase 2: Checkout ── */}
                          <Route path="/checkout">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="CheckoutPage">
                                  <CheckoutPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Phase 2: Order confirmation ── */}
                          <Route path="/order-confirmation/:docId">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="OrderConfirmationPage">
                                  <OrderConfirmationPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Phase 2: Order detail / tracking ── */}
                          <Route path="/order/:docId">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="OrderDetailPage">
                                  <OrderDetailPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Public: categories listing ── */}
                          <Route path="/categories">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="CategoriesPage">
                                  <CategoriesPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Public: medicine detail ── */}
                          <Route path="/medicine/:id">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="MedicineDetailPage">
                                  <MedicineDetailPage />
                                </ErrorBoundary>
                              </PublicLayout>
                            )}
                          </Route>

                          {/* ── Public: individual category ── */}
                          <Route path="/category/:slug">
                            {() => (
                              <PublicLayout>
                                <ErrorBoundary label="CategoryDetailPage">
                                  <CategoryDetailPage />
                                </ErrorBoundary>
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
