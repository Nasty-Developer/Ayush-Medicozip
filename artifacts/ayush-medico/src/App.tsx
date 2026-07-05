import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { RequestMedicineProvider } from "@/context/RequestMedicineContext";
import LoadingScreen from "@/components/LoadingScreen";
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
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";

const queryClient = new QueryClient();

function PublicSite() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LoadingScreen />
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <NewArrivals />
        <SpecialMedicines />
        <About />
        <Services />
        <Categories />
        <WhyChooseUs />
        <Testimonials />
        <FAQ />
        <RequestMedicine />
        <Contact />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <BackToTop />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ayush-medico-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <RequestMedicineProvider>
              <Switch>
                <Route path="/admin/login" component={AdminLogin} />
                <Route path="/admin" component={AdminLayout} />
                <Route path="/admin/:rest*" component={AdminLayout} />
                <Route component={PublicSite} />
              </Switch>
              <Toaster />
            </RequestMedicineProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
