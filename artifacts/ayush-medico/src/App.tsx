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
import LoadingScreen from "@/components/LoadingScreen";
import OfflinePage from "@/components/OfflinePage";
import Header from "@/components/Header";
import CartDrawer from "@/components/customer/CartDrawer";
import Hero from "@/components/Hero";
import NewArrivals from "@/components/NewArrivals";
import SpecialMedicines from "@/components/SpecialMedicines";
import About from "@/components/About";
import Services from "@/components/Services";
import WhyChooseUs from "@/components/WhyChooseUs";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import RequestMedicine from "@/components/RequestMedicine";
import GeneralInquiry from "@/components/GeneralInquiry";
import DeliveryFeatures from "@/components/DeliveryFeatures";
import TrustBadges from "@/components/TrustBadges";
import Categories from "@/components/Categories";
import PromoBanner from "@/components/PromoBanner";
import HowItWorks from "@/components/HowItWorks";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import OrderTracker from "@/pages/OrderTracker";
import CategoriesPage from "@/pages/CategoriesPage";
import CategoryDetailPage from "@/pages/CategoryDetailPage";
import MedicineDetailPage from "@/pages/MedicineDetailPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import OrderDetailPage from "@/pages/OrderDetailPage";

const queryClient = new QueryClient();

/**
 * PublicLayout — shared shell for every public-facing page.
 * Provides the announcement banner context, header, footer, and overlays
 * so each public page only needs to supply its <main> content.
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
 */
function HomeSections() {
  return (
    <>
      <Hero />
      <TrustBadges />
      <Categories />
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
      <RequestMedicine />
      <GeneralInquiry />
      <Contact />
    </>
  );
}

/**
 * OfflineGuard — overlays OfflinePage whenever the device loses internet.
 * Keeps the React tree mounted so state is preserved; the app snaps back
 * the moment connectivity is restored (OfflinePage auto-reloads).
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
                    <Switch>
                      {/* ── Admin ── */}
                      <Route path="/admin/login" component={AdminLogin} />
                      <Route path="/admin"       component={AdminLayout} />
                      <Route path="/admin/:rest*" component={AdminLayout} />

                      {/* ── Order tracking (legacy prescription-based) ── */}
                      <Route path="/track/:requestId" component={OrderTracker} />
                      <Route path="/track"            component={OrderTracker} />

                      {/* ── Phase 2: Cart ── */}
                      <Route path="/cart">
                        {() => (
                          <PublicLayout>
                            <CartPage />
                          </PublicLayout>
                        )}
                      </Route>

                      {/* ── Phase 2: Checkout ── */}
                      <Route path="/checkout">
                        {() => (
                          <PublicLayout>
                            <CheckoutPage />
                          </PublicLayout>
                        )}
                      </Route>

                      {/* ── Phase 2: Order confirmation ── */}
                      <Route path="/order-confirmation/:docId">
                        {() => (
                          <PublicLayout>
                            <OrderConfirmationPage />
                          </PublicLayout>
                        )}
                      </Route>

                      {/* ── Phase 2: Order detail / tracking ── */}
                      <Route path="/order/:docId">
                        {() => (
                          <PublicLayout>
                            <OrderDetailPage />
                          </PublicLayout>
                        )}
                      </Route>

                      {/* ── Public: categories listing ── */}
                      <Route path="/categories">
                        {() => (
                          <PublicLayout>
                            <CategoriesPage />
                          </PublicLayout>
                        )}
                      </Route>

                      {/* ── Public: medicine detail ── */}
                      <Route path="/medicine/:id">
                        {() => (
                          <PublicLayout>
                            <MedicineDetailPage />
                          </PublicLayout>
                        )}
                      </Route>

                      {/* ── Public: individual category ── */}
                      <Route path="/category/:slug">
                        {() => (
                          <PublicLayout>
                            <CategoryDetailPage />
                          </PublicLayout>
                        )}
                      </Route>

                      {/* ── Homepage (catch-all) ── */}
                      <Route>
                        {() => (
                          <PublicLayout>
                            <HomeSections />
                          </PublicLayout>
                        )}
                      </Route>
                    </Switch>
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
