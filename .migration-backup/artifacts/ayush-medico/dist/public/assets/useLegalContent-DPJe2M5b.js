import{r as s}from"./index-Ds-rFBeg.js";const d=["storeName","proprietorName","phone","phone2","email","address","mapLink","hoursWeekday","hoursWeekend","deliveryRadius","pharmacistName","pharmacistRegNumber","pharmacistQualification","pharmacistCouncil","pharmacistValidUpto","drugLicenseForm20","drugLicenseForm21","licenceValidity","fdaFileNumber","licensingAuthority"];function p(e,o){let r=e;for(const n of d){const a=String(o[n]??"");r=r.replaceAll(`{{${n}}}`,a)}return r}const c={privacy:{sections:[{heading:"1. Information We Collect",body:`We collect information you provide when placing an order, uploading a prescription, or contacting us — including your name, phone number, delivery address, and prescription details.

We do not collect payment card details. Payments are processed securely through Razorpay; we receive only transaction confirmation.`},{heading:"2. How We Use Your Information",body:`- To process and deliver your medicine orders.
- To verify prescriptions as required under the Drugs and Cosmetics Act, 1940.
- To send order updates via WhatsApp or SMS.
- To respond to your inquiries and provide customer support.`},{heading:"3. Prescription Data",body:"Prescription images are stored securely and accessed only by our registered pharmacist ({{pharmacistName}}, {{pharmacistQualification}}, Reg. No. {{pharmacistRegNumber}}, {{pharmacistCouncil}}) for verification. We retain records under Rule 65 of the Drugs and Cosmetics Rules, 1945 and do not share your prescription without consent."},{heading:"4. Data Sharing",body:`We do not sell or rent your personal information. We may share data with:

- Delivery partners — solely to fulfil your order.
- Payment processors — solely for transaction processing.
- Regulatory authorities — when required by law.`},{heading:"5. Data Security",body:"We implement industry-standard security measures. All data transmissions are encrypted using HTTPS/TLS."},{heading:"6. Your Rights",body:"You may request access to, correction of, or deletion of your personal data. Contact us at the details below and we will respond within 30 days."},{heading:"7. Contact",body:`**{{storeName}}**
Proprietor: {{proprietorName}}
{{address}}
Phone: {{phone}} / {{phone2}}
Email: {{email}}`}]},terms:{sections:[{heading:"1. Acceptance of Terms",body:"By accessing or using {{storeName}} services, you agree to these Terms and Conditions. If you do not agree, please discontinue use immediately."},{heading:"2. Business Details",body:`**{{storeName}}**
Proprietor: {{proprietorName}}
{{address}}
Phone: {{phone}} / {{phone2}}
Email: {{email}}

**Drug Licences ({{licensingAuthority}})**
Form 20 Licence No: {{drugLicenseForm20}} (valid to {{licenceValidity}})
Form 21 Licence No: {{drugLicenseForm21}} (valid to {{licenceValidity}})
FDA File No: {{fdaFileNumber}}

**Registered Pharmacist:** {{pharmacistName}} ({{pharmacistQualification}}, Reg. No. {{pharmacistRegNumber}}, {{pharmacistCouncil}})`},{heading:"3. Services Provided",body:"{{storeName}} provides licensed retail pharmacy services including OTC medicines, prescription medicines (subject to valid prescription), healthcare products, and same-day delivery within {{deliveryRadius}}."},{heading:"4. Prescription Medicines",body:"Prescription-only medicines (Schedule H, H1, and X) are dispensed only against a valid prescription from a registered medical practitioner. Submitting a forged or expired prescription violates the Drugs and Cosmetics Act, 1940 and may result in order cancellation and regulatory reporting."},{heading:"5. Pricing and Availability",body:"All prices are inclusive of applicable taxes. Prices may change without prior notice. We reserve the right to cancel out-of-stock orders with a full refund."},{heading:"6. User Responsibilities",body:`- Provide accurate personal and delivery information.
- Upload genuine and valid prescriptions where required.
- Not use the service for any unlawful purpose.`},{heading:"7. Limitation of Liability",body:"{{storeName}} shall not be liable for indirect, incidental, or consequential damages. Liability is limited to the value of products purchased in any single transaction."},{heading:"8. Governing Law",body:"These Terms are governed by Indian law. Disputes are subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra."},{heading:"9. Contact",body:`**{{storeName}}**
{{address}}
Phone: {{phone}} / {{phone2}}
Email: {{email}}`}]},shipping:{sections:[{heading:"1. Delivery Area",body:"We currently deliver to {{deliveryRadius}}. Delivery eligibility is confirmed at checkout based on your pincode."},{heading:"2. Same-Day Delivery",body:"Same-day delivery is available for orders placed before **6:00 PM**, subject to product availability and area eligibility. Orders placed after 6:00 PM will be delivered the following day."},{heading:"3. Delivery Timelines",body:`- **In-stock OTC products:** Same day (order before 6 PM).
- **Prescription medicines:** Delivered after verification, typically within 2–4 hours of approval.
- **Special order items:** 1–3 business days.`},{heading:"4. Delivery Charges",body:"Delivery charges (if applicable) are shown at checkout before order confirmation. Delivery may be free above a minimum order value — check the website for current promotions."},{heading:"5. Delivery Attempt",body:"Our delivery personnel will make one attempt. If you are unavailable, we will contact you via WhatsApp or phone to reschedule. Unclaimed orders may be cancelled after 24 hours."},{heading:"6. Damaged or Missing Orders",body:"If your order arrives damaged or items are missing, contact us within **24 hours** at {{phone}} with photos. We will arrange a replacement or refund."},{heading:"7. Contact",body:`**{{storeName}}**
{{address}}
Phone / WhatsApp: {{phone}} / {{phone2}}
Email: {{email}}`}]},refund:{sections:[{heading:"1. Order Cancellation",body:"You may cancel your order before it is dispatched. Once dispatched, cancellation is not possible. Contact us immediately via phone or WhatsApp at {{phone}} or {{phone2}}."},{heading:"2. Eligible Returns",body:`We accept returns only in the following circumstances:

- Wrong product delivered.
- Damaged or broken packaging upon delivery.
- Expired product delivered.

Returns must be reported within **24 hours of delivery** with photographic evidence.`},{heading:"3. Non-Returnable Items",body:`The following cannot be returned:

- Prescription medicines once dispensed and delivered.
- Opened or partially used products.
- Products with broken safety seals (unless received that way).
- Baby care products, diagnostic kits, and thermometers.
- Perishable items.`},{heading:"4. Refund Process",body:`Approved refunds are processed within **5–7 business days** to the original payment method:

- UPI / online payments: refunded to the source account.
- Cash on Delivery: store credit or bank transfer on provision of bank details.`},{heading:"5. How to Initiate a Return",body:`Contact us within 24 hours of delivery:

Phone / WhatsApp: **{{phone}}** / **{{phone2}}**
Email: **{{email}}**

Provide your order ID, describe the issue, and share photos.`},{heading:"6. Contact",body:`**{{storeName}}**
Proprietor: {{proprietorName}}
{{address}}`}]},prescription:{sections:[{heading:"Important — Prescription Rules",body:`- Prescription medicines are supplied only against a valid prescription.
- Schedule H, H1, and X medicines always require a prescription.
- The pharmacist reserves the right to reject any order if the prescription is invalid.
- Customers must upload their prescription during checkout when required.
- All orders are verified by our Registered Pharmacist before dispatch.`},{heading:"1. Legal Requirement",body:`Under the Drugs and Cosmetics Act, 1940 and the Pharmacy Act, 1948, Schedule H, H1, and X medicines may only be dispensed against a valid prescription from a registered medical practitioner.

All dispensing at {{storeName}} is supervised by our Registered Pharmacist: **{{pharmacistName}}** ({{pharmacistQualification}}, Reg. No. {{pharmacistRegNumber}}, {{pharmacistCouncil}}).

Drug Licences: Form 20 ({{drugLicenseForm20}}) and Form 21 ({{drugLicenseForm21}}), valid to {{licenceValidity}}.`},{heading:"2. Prescription Requirements",body:`A valid prescription must include:

- Patient's full name, age, and address.
- Date of issue (not older than 30 days; not older than 6 months for Schedule X).
- Doctor's name, qualification, registration number, and signature.
- Clinic/hospital stamp or letterhead.
- Name, strength, and dosage of the medicine(s) prescribed.`},{heading:"3. Uploading Your Prescription",body:"During checkout, upload a clear photograph or scan of your prescription. Accepted formats: JPG, PNG, PDF. The file must be legible and complete — partial or illegible prescriptions will be rejected."},{heading:"4. Verification Process",body:"Our registered pharmacist reviews every uploaded prescription before dispatch. We may contact you for clarification. Orders for prescription medicines are not dispatched until verification is complete."},{heading:"5. Rejection of Prescriptions",body:`We reserve the right to reject prescriptions that are:

- Expired or undated.
- Illegible, incomplete, or appear altered.
- Not issued by a registered medical practitioner.
- Inconsistent with the medicines ordered.

Rejection results in cancellation of affected items with a full refund.`},{heading:"6. Record Keeping",body:"Prescription records are retained under Rule 65 of the Drugs and Cosmetics Rules, 1945. Data is stored securely and not shared except as required by law."},{heading:"7. Schedule X Drugs",body:"Schedule X controlled substances require a special prescription with strict quantity limits. We may require the original physical prescription. Our Form 21 licence ({{drugLicenseForm21}}) covers Schedule C and C(1) drugs excluding Schedule X."},{heading:"8. Contact",body:`**{{storeName}}**
{{address}}
Phone / WhatsApp: {{phone}} / {{phone2}}
Email: {{email}}`}]},disclaimer:{sections:[{heading:"1. General Information",body:"Information on this website by {{storeName}} is for general informational purposes only and is not intended to substitute for professional medical advice, diagnosis, or treatment."},{heading:"2. Medical Advice Disclaimer",body:`Always seek the advice of your physician, registered pharmacist, or qualified health provider with any questions about a medical condition or medication. Never disregard professional medical advice because of something you read on this website.

{{storeName}} does not recommend or endorse any specific tests, physicians, products, or procedures mentioned on this website.`},{heading:"3. Product Information",body:"While we take every effort to ensure the accuracy of product information, errors may occur. We reserve the right to correct inaccuracies and cancel orders if product information is found incorrect."},{heading:"4. Prescription Medicines",body:"Information about prescription medicines on this website is for reference only. Prescription medicines are dispensed exclusively under the supervision of our Registered Pharmacist: **{{pharmacistName}}** ({{pharmacistQualification}}, Reg. No. {{pharmacistRegNumber}}, {{pharmacistCouncil}})."},{heading:"5. Limitation of Liability",body:"To the fullest extent permitted by law, {{storeName}}, its proprietor {{proprietorName}}, pharmacist, employees, and agents are not liable for any indirect, incidental, consequential, or punitive damages from your use of this website."},{heading:"6. External Links",body:"This website may contain links to external websites not maintained by {{storeName}}. We have no control over their content and do not endorse them."},{heading:"7. Regulatory Compliance",body:`{{storeName}} operates as a licensed retail pharmacy under the Pharmacy Act, 1948 and the Drugs and Cosmetics Act, 1940.

**Drug Licences issued by {{licensingAuthority}}:**
Form 20 Licence No: {{drugLicenseForm20}} (valid to {{licenceValidity}})
Form 21 Licence No: {{drugLicenseForm21}} (valid to {{licenceValidity}})
FDA File No: {{fdaFileNumber}}`},{heading:"8. Contact",body:`**{{storeName}}**
Proprietor: {{proprietorName}}
{{address}}
Phone: {{phone}} / {{phone2}}
Email: {{email}}`}]},about:{sections:[{heading:"About {{storeName}}",body:`{{storeName}} is your trusted neighbourhood pharmacy in Kurla West, Mumbai — serving the community with genuine medicines and quality healthcare since 2013.

We are a licensed retail pharmacy operating under the Drugs and Cosmetics Act, 1940 and the Pharmacy Act, 1948, with drug licences issued by the Food & Drugs Administration, Mumbai-Zone4.`},{heading:"Our Registered Pharmacist",body:`All prescription dispensing is supervised by:

**{{pharmacistName}}**
{{pharmacistQualification}} · Reg. No. {{pharmacistRegNumber}}
{{pharmacistCouncil}} · Valid to {{pharmacistValidUpto}}`},{heading:"Drug Licences",body:`**Form 20 Licence No:** {{drugLicenseForm20}}
**Form 21 Licence No:** {{drugLicenseForm21}}
**Valid to:** {{licenceValidity}}
**Licensing Authority:** {{licensingAuthority}}
**FDA File No:** {{fdaFileNumber}}`},{heading:"Our Commitment",body:`- 100% genuine medicines sourced from CDSCO-approved distributors.
- All prescriptions verified by our registered pharmacist before dispatch.
- Same-day delivery within {{deliveryRadius}}.
- Secure and transparent payments.
- Full statutory records maintained as required by law.`},{heading:"Contact",body:`**{{storeName}}**
Proprietor: {{proprietorName}}
{{address}}
Phone: {{phone}} / {{phone2}}
Email: {{email}}
Hours: {{hoursWeekday}}`}]}};function l(e){return c[e]??{sections:[]}}function h(e){const[o,r]=s.useState(l(e)),[n,a]=s.useState(!0);return s.useEffect(()=>{let t=!1;return fetch(`/api/settings/legal_${e}`).then(i=>i.ok?i.json():null).then(i=>{t||i&&typeof i=="object"&&Array.isArray(i.sections)&&r(i)}).catch(()=>{}).finally(()=>{t||a(!1)}),()=>{t=!0}},[e]),{content:o,loading:n}}export{l as g,p as i,h as u};
