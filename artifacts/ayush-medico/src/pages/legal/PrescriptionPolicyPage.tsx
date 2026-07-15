import { motion } from "framer-motion";
import { FileCheck, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrescriptionPolicyPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <FileCheck size={20} className="text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Prescription Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: January 2025 · Ayush Medico, Kurla West, Mumbai</p>

          <div className="space-y-8">
            <PolicyNote />

            <PolicySection title="1. Legal Requirement">
              <p>Under the Drugs and Cosmetics Act, 1940 and the Pharmacy Act, 1948, certain medicines classified as Schedule H, H1, and X (prescription-only drugs) may only be dispensed against a valid prescription from a registered medical practitioner (RMP).</p>
            </PolicySection>

            <PolicySection title="2. Prescription Requirements">
              <p>A valid prescription must include:</p>
              <ul>
                <li>Patient's full name, age, and address.</li>
                <li>Date of issue (not older than 30 days for most drugs; not older than 6 months for Schedule X).</li>
                <li>Doctor's name, qualification, registration number, and signature.</li>
                <li>Clinic/hospital stamp or letterhead.</li>
                <li>Name, strength, and dosage of the medicine(s) prescribed.</li>
              </ul>
            </PolicySection>

            <PolicySection title="3. Uploading Your Prescription">
              <p>During checkout, you will be prompted to upload a clear photograph or scanned copy of your prescription. Accepted formats: JPG, PNG, PDF. The file must be legible and complete — partial or illegible prescriptions will be rejected.</p>
            </PolicySection>

            <PolicySection title="4. Verification Process">
              <p>Our registered pharmacist reviews every uploaded prescription before dispatch. We may contact you for clarification if the prescription is unclear. Orders for prescription medicines are not dispatched until verification is complete.</p>
            </PolicySection>

            <PolicySection title="5. Rejection of Prescriptions">
              <p>We reserve the right to reject prescriptions that are:</p>
              <ul>
                <li>Expired or undated.</li>
                <li>Illegible, incomplete, or appear to be altered.</li>
                <li>Not issued by a registered medical practitioner.</li>
                <li>Inconsistent with the medicines ordered.</li>
              </ul>
              <p>Rejection of a prescription will result in cancellation of the affected items with a full refund.</p>
            </PolicySection>

            <PolicySection title="6. Record Keeping">
              <p>We retain prescription records as required under Rule 65 of the Drugs and Cosmetics Rules, 1945. This data is stored securely and not shared except as required by law or regulatory authority.</p>
            </PolicySection>

            <PolicySection title="7. Schedule X Drugs">
              <p>Schedule X controlled substances require a special prescription and are subject to strict quantity limits. We may require the original physical prescription before dispensing Schedule X medications.</p>
            </PolicySection>

            <PolicySection title="8. Contact">
              <p>
                For prescription-related queries:<br />
                <strong>Ayush Medico</strong><br />
                Shop No. 67, Halav Pool Rd, Makad Wala Chawl, Kurla West, Mumbai – 400070<br />
                Phone / WhatsApp: +91 98332 73838
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

function PolicyNote() {
  return (
    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
      <strong>Sample Policy Template — </strong>This is a placeholder document. Please review and update with a qualified legal professional before going live.
    </div>
  );
}
