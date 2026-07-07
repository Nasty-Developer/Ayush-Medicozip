import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { RequestMedicineProvider } from "@/context/RequestMedicineContext";
import { AnnouncementProvider } from "@/context/AnnouncementContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import LoadingScreen from "@/components/LoadingScreen";
import OfflinePage from "@/components/OfflinePage";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import NewArrivals from "@/components/NewArrivals";
import SpecialMedicines from "@/components/SpecialMedicines";
import About from "@/components/About";
import Services from "@/components/Services";
import Categories from "@/components/Categories";
import WhyChooseUs from "@/components/WhyChooseUs";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import RequestMedicine from "@/components/RequestMedicine";
import GeneralInquiry from "@/components/GeneralInquiry";
import DeliveryFeatures from "@/components/DeliveryFeatures";
import HowItWorks from "@/components/HowItWorks";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import OrderTracker from "@/pages/OrderTracker";

const queryClient = new QueryClient();

function PublicSite() {
  return (
    <AnnouncementProvider>
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <ScrollProgress />
        <Header />
        <main>
          <Hero />
          <DeliveryFeatures />
          <HowItWorks />
          <NewArrivals />
          <SpecialMedicines />
          <About />
          <Services />
          <Categories />
          <WhyChooseUs />
          <Testimonials />
          <FAQ />
          <RequestMedicine />
          <GeneralInquiry />
          <Contact />
        </main>
        <Footer />
        <FloatingWhatsApp />
        <BackToTop />
      </div>
    </AnnouncementProvider>
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
              <RequestMedicineProvider>
                {/* Splash / loading screen — hides immediately if offline */}
                <LoadingScreen />

                {/* Offline overlay — appears over any route when connection is lost */}
                <OfflineGuard>
                  <Switch>
                    <Route path="/admin/login" component={AdminLogin} />
                    <Route path="/admin" component={AdminLayout} />
                    <Route path="/admin/:rest*" component={AdminLayout} />
                    <Route path="/track/:requestId" component={OrderTracker} />
                    <Route path="/track" component={OrderTracker} />
                    <Route component={PublicSite} />
                  </Switch>
                </OfflineGuard>

                <Toaster />
              </RequestMedicineProvider>
            </CustomerAuthProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
