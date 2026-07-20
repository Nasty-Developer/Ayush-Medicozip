import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function DisclaimerPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Disclaimer
          </h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: July 2025 · Ayush Medico &amp; General Stores, Kurla West, Mumbai</p>

          <div className="space-y-8">

            <PolicySection title="1. General Information">
              <p>The information provided on this website by Ayush Medico &amp; General Stores is for general informational purposes only. The content is not intended to substitute for professional medical advice, diagnosis, or treatment.</p>
            </PolicySection>

            <PolicySection title="2. Medical Advice Disclaimer">
              <p>Always seek the advice of your physician, registered pharmacist, or other qualified health provider with any questions you may have regarding a medical condition or medication. Never disregard professional medical advice or delay seeking it because of something you have read on this website.</p>
              <p>Ayush Medico &amp; General Stores does not recommend or endorse any specific tests, physicians, products, procedures, or opinions mentioned on this website.</p>
            </PolicySection>

            <PolicySection title="3. Product Information">
              <p>While we take every effort to ensure the accuracy of product information displayed on this website (including pricing, availability, descriptions, and images), errors may occasionally occur. We reserve the right to correct any errors or inaccuracies and to cancel orders if product information is found to be incorrect.</p>
            </PolicySection>

            <PolicySection title="4. Prescription Medicines">
              <p>Information about prescription medicines on this website is for reference only. Prescription medicines are dispensed exclusively under the supervision of our Registered Pharmacist: <strong>Khan Aqsa Tasadduk Hussain</strong> (D.Pharm, Reg. No. 492012, Maharashtra State Pharmacy Council) and only against a valid prescription from a registered medical practitioner.</p>
            </PolicySection>

            <PolicySection title="5. Limitation of Liability">
              <p>To the fullest extent permitted by applicable law, Ayush Medico &amp; General Stores, its proprietor, pharmacist, employees, and agents shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of this website or reliance on the information provided.</p>
            </PolicySection>

            <PolicySection title="6. External Links">
              <p>This website may contain links to external websites that are not maintained by Ayush Medico &amp; General Stores. We have no control over the nature, content, or availability of those sites and do not endorse or make any representations about them.</p>
            </PolicySection>

            <PolicySection title="7. Regulatory Compliance">
              <p>Ayush Medico &amp; General Stores operates as a licensed retail pharmacy in full compliance with the Pharmacy Act, 1948, the Drugs and Cosmetics Act, 1940, and applicable Maharashtra state regulations. All statutory obligations are maintained as required by the Maharashtra Food and Drug Administration (FDA).</p>
            </PolicySection>

            <PolicySection title="8. Contact">
              <p>
                For any questions about this Disclaimer:<br />
                <strong>Ayush Medico &amp; General Stores</strong><br />
                Proprietor: Govind Ram Chitara<br />
                Shop No.1, Hut No.67 1/1, Ground Floor, Gangaram Makad Wala Chawl,<br />
                Halav Pool, Near Rolex Hotel, CTS No.451, Kurla West, Mumbai – 400070<br />
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
