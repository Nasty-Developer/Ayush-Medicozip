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
const OrdersPage            = lazy(() => import("@/pages/OrdersPage"));
const UpiPaymentPage        = lazy(() => import("@/pages/UpiPaymentPage"));
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
const LocalSeoPage        = lazy(() => import("@/pages/LocalSeoPage"));
const BlogIndexPage       = lazy(() => import("@/pages/BlogPages").then((m) => ({ default: m.BlogIndexPage })));
const BlogPostPage        = lazy(() => import("@/pages/BlogPages").then((m) => ({ default: m.BlogPostPage })));

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

/**
 * RouteLoader — branded placeholder while a lazy route chunk downloads.
 * Same mark and bar as the boot splash so the hand-off looks like one screen.
 */
function RouteLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#1e6ca4] to-[#0e8f8a] shadow-[0_18px_38px_-20px_rgba(30,108,164,0.6)]">
        <svg viewBox="0 0 512 512" className="h-8 w-8" aria-hidden="true">
          <rect x="192" y="96" width="128" height="320" rx="26" fill="#fff" />
          <rect x="96" y="192" width="320" height="128" rx="26" fill="#fff" />
        </svg>
      </div>
      <div className="h-[3px] w-28 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/5 animate-[loader-slide_1.15s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#1e6ca4] to-[#0e8f8a]" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  );
}

const PageLoader = RouteLoader;

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
          <CustomerAuthProvider>
            <AuthProvider>
              <CartProvider>
                <RequestMedicineProvider>
                  <LoadingScreen />

                  <OfflineGuard>
                    <ErrorBoundary label="App">
                      <Suspense fallback={<PageLoader />}>
                        <WouterRouter base={import.meta.env.BASE_URL}>
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

                           {/* ── UPI payment ── */}
                           <Route path="/payment/:docId">
                             {() => (
                               <PublicLayout>
                                 <ErrorBoundary label="UpiPaymentPage">
                                   <UpiPaymentPage />
                                 </ErrorBoundary>
                               </PublicLayout>
                             )}
                           </Route>

                          {/* ── Order detail / tracking ── */}
                           <Route path="/orders">
                             {() => (
                               <PublicLayout>
                                 <ErrorBoundary label="OrdersPage">
                                   <OrdersPage />
                                 </ErrorBoundary>
                               </PublicLayout>
                             )}
                           </Route>

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
                           <Route path="/vet-medicines/:id">
                             {() => <PublicLayout><MedicineDetailPage kind="vet" /></PublicLayout>}
                           </Route>
                           <Route path="/general-products/:id">
                             {() => <PublicLayout><MedicineDetailPage kind="general" /></PublicLayout>}
                           </Route>
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
                          <Route path="/pharmacy-kurla-west">
                            {() => (
                              <PublicLayout>
                                <LocalSeoPage slug="pharmacy-kurla-west" />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/medical-store-kurla-west">
                            {() => (
                              <PublicLayout>
                                <LocalSeoPage slug="medical-store-kurla-west" />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/medicine-delivery-kurla-west">
                            {() => (
                              <PublicLayout>
                                <LocalSeoPage slug="medicine-delivery-kurla-west" />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/chemist-kurla-west">
                            {() => (
                              <PublicLayout>
                                <LocalSeoPage slug="chemist-kurla-west" />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/medicine-availability">
                            {() => (
                              <PublicLayout>
                                <LocalSeoPage slug="medicine-availability" />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/blog">
                            {() => (
                              <PublicLayout>
                                <BlogIndexPage />
                              </PublicLayout>
                            )}
                          </Route>
                          <Route path="/blog/:slug">
                            {(params) => (
                              <PublicLayout>
                                <BlogPostPage slug={params.slug} />
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
                        </WouterRouter>
                      </Suspense>
                    </ErrorBoundary>
                  </OfflineGuard>

                  <Toaster />
                </RequestMedicineProvider>
              </CartProvider>
            </AuthProvider>
          </CustomerAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
