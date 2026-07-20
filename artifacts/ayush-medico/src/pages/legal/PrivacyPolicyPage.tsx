import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicyPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: July 2025 · Ayush Medico &amp; General Stores, Kurla West, Mumbai</p>

          <div className="prose prose-sm max-w-none text-foreground space-y-8">

            <PolicySection title="1. Information We Collect">
              <p>We collect information you provide directly when you place an order, upload a prescription, or contact us. This may include your name, phone number, delivery address, and prescription details.</p>
              <p>We do not collect payment card details — payments are processed securely through third-party gateways (Razorpay) and we receive only transaction confirmation.</p>
            </PolicySection>

            <PolicySection title="2. How We Use Your Information">
              <ul>
                <li>To process and deliver your medicine orders.</li>
                <li>To verify prescriptions as required under the Drugs and Cosmetics Act, 1940.</li>
                <li>To send order updates via WhatsApp or SMS.</li>
                <li>To respond to your inquiries and provide customer support.</li>
              </ul>
            </PolicySection>

            <PolicySection title="3. Prescription Data">
              <p>Prescription images are stored securely and accessed only by our registered pharmacist (Khan Aqsa Tasadduk Hussain, D.Pharm, Reg. No. 492012, Maharashtra State Pharmacy Council) for verification purposes. We retain prescription records as mandated by Rule 65 of the Drugs and Cosmetics Rules, 1945. We do not share your prescription with any third party without your consent.</p>
            </PolicySection>

            <PolicySection title="4. Data Sharing">
              <p>We do not sell or rent your personal information. We may share data with:</p>
              <ul>
                <li>Delivery partners — solely to fulfill your order.</li>
                <li>Payment processors — solely for transaction processing.</li>
                <li>Regulatory authorities — when required by law.</li>
              </ul>
            </PolicySection>

            <PolicySection title="5. Data Security">
              <p>We implement industry-standard security measures to protect your personal information. All data transmissions are encrypted using HTTPS/TLS.</p>
            </PolicySection>

            <PolicySection title="6. Your Rights">
              <p>You may request access to, correction of, or deletion of your personal data by contacting us at the details below. We will respond within 30 days.</p>
            </PolicySection>

            <PolicySection title="7. Contact Us">
              <p>
                For privacy-related queries:<br />
                <strong>Ayush Medico &amp; General Stores</strong><br />
                Proprietor: Govind Ram Chitara<br />
                Shop No.1, Hut No.67 1/1, Ground Floor, Gangaram Makad Wala Chawl,<br />
                Halav Pool, Near Rolex Hotel, CTS No.451,<br />
                Kurla West, Mumbai – 400070<br />
                Phone: +91 98332 73838 / +91 97021 65965<br />
                Email: aqsakhan7654@gmail.com
              </p>
            </PolicySection>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-8">
      <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>{title}</h2>
      <div className="space-y-3 text-muted-foreground text-sm leading-relaxed [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
