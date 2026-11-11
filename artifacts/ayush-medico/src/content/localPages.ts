/**
 * Local landing page content.
 *
 * One entry per real search intent around Kurla West. Each page has its own
 * copy, headings and questions — not a template with the locality swapped — so
 * they read as separate useful pages rather than doorway duplicates.
 *
 * Facts reused across pages come from the business itself: licensed retail
 * pharmacy, Kurla West address, 8 AM–10 PM seven days, ~4 km delivery radius.
 */

export type LocalSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

export type LocalPage = {
  slug: string;
  /** Short label used in breadcrumbs and internal links. */
  navLabel: string;
  h1: string;
  intro: string;
  sections: LocalSection[];
  faqs: { question: string; answer: string }[];
  related: string[];
};

export const LOCAL_PAGES: LocalPage[] = [
  {
    slug: "pharmacy-kurla-west",
    navLabel: "Pharmacy in Kurla West",
    h1: "Pharmacy in Kurla West, Mumbai",
    intro:
      "Ayush Medico is a licensed retail pharmacy on Halav Pool Road in Kurla West, open every day from 8 AM to 10 PM. Walk in with a prescription, call ahead to check stock, or send your list on WhatsApp and we will keep it ready.",
    sections: [
      {
        heading: "What you can pick up at the counter",
        body: [
          "We are a full-service chemist, not a wellness boutique. Prescription medicines, over-the-counter pain and fever remedies, cough and cold products, digestive care, diabetes supplies, BP monitors, dressings and surgical items, mother and baby care, and daily personal care all sit in the same shop.",
          "If a specific brand is not on the shelf, tell us the salt name or show the prescription. Most items reach us within a day through our licensed distributors, and we will message you when it arrives.",
        ],
        bullets: [
          "Prescription medicines, dispensed by a registered pharmacist",
          "OTC and general remedies for everyday illness",
          "Health devices: BP monitors, glucometers, thermometers, nebulisers",
          "Baby care, personal hygiene, first aid and surgical supplies",
          "Ayurvedic and supplement ranges alongside allopathic stock",
        ],
      },
      {
        heading: "Checking stock before you travel",
        body: [
          "The fastest way to avoid a wasted trip is a phone call or a WhatsApp message with the medicine name and quantity. We check the shelf and the batch while you are on the line, and we tell you honestly when something is unavailable instead of holding you in a queue.",
          "For repeat prescriptions, send a photo of the prescription and the pack you use. We keep the details on file so the next refill takes a single message.",
        ],
      },
      {
        heading: "Reaching us from around Kurla",
        body: [
          "The shop is at Shop No.1, Hut No.67 1/1, Gangaram Makad Wala Chawl, Halav Pool, near Rolex Hotel, Kurla West 400070 — a short walk from Kurla station's west side and easy to reach from Sion, Chunabhatti, Kalina and Vidyavihar.",
          "Two-wheelers can stop directly outside. If you are coming by car, Halav Pool Road has parking a little ahead of the shop.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is Ayush Medico a licensed pharmacy?",
        answer:
          "Yes. We hold FDA Mumbai Zone-4 licences MH-MZ4-518856 (Form 20, retail sale) and MH-MZ4-518857 (Form 21, wholesale), with a registered pharmacist on the premises during business hours.",
      },
      {
        question: "Do I need an appointment to visit the pharmacy?",
        answer:
          "No appointment is needed. Walk in any day between 8 AM and 10 PM. For a medicine that is usually short in the market, call first so we can confirm the batch is in stock.",
      },
      {
        question: "Can I get medicines without a prescription?",
        answer:
          "Over-the-counter products and general healthcare items are available directly. Scheduled and prescription-only medicines require a valid prescription from a registered medical practitioner, which we review before dispensing.",
      },
    ],
    related: ["medical-store-kurla-west", "medicine-delivery-kurla-west", "medicine-availability"],
  },
  {
    slug: "medical-store-kurla-west",
    navLabel: "Medical Store in Kurla West",
    h1: "Medical Store in Kurla West for Daily and Long-Term Needs",
    intro:
      "From a single strip of tablets to a month of chronic-care medicines, Ayush Medico stocks everyday healthcare for families, clinics and small businesses around Kurla West.",
    sections: [
      {
        heading: "Built for regular, repeat customers",
        body: [
          "Most of our customers come back every month for the same set of tablets. We keep a record of what you bought, so a refill is a message rather than a full explanation each time, and we flag it when a pack size or manufacturer changes.",
          "Clinics and nursing homes nearby use us for surgical consumables, IV fluids, gloves, syringes and dressing material. Bulk quantities are arranged against a written list so there is no confusion at pickup.",
        ],
      },
      {
        heading: "Chronic care: diabetes, BP, thyroid, cardiac",
        body: [
          "Long-term medicines need consistency, so we hold steady stock of common diabetes, blood pressure, thyroid, cholesterol and cardiac brands, including insulin with cold-chain handling from delivery to counter.",
          "If your prescription changes, bring the new one. We do not substitute a medicine or strength on our own; the prescriber decides that.",
        ],
        bullets: [
          "Monthly refills kept ready against a phone or WhatsApp message",
          "Insulin and cold-chain items stored and handed over as labelled",
          "Surgical and dressing supplies for home care and clinics",
          "Glucometer strips, lancets, BP monitors and nebuliser accessories",
        ],
      },
      {
        heading: "What we do not do",
        body: [
          "We do not dispense prescription medicine without a valid prescription, we do not sell expired or unlabelled stock, and we do not advise you to stop or change a course on our own. Where a question is clinical, we send you back to your doctor.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can Ayush Medico supply medicines for a clinic or nursing home?",
        answer:
          "Yes. We supply surgical consumables, dressing material, syringes, gloves and IV fluids in bulk against a written list. Share the list on WhatsApp and we will confirm availability, rate and pickup time.",
      },
      {
        question: "Do you keep insulin and cold-chain medicines?",
        answer:
          "Common insulin brands are stocked and kept refrigerated. Tell us before you visit so we can confirm the batch and keep it ready for the shortest possible time out of the cold chain.",
      },
      {
        question: "Do you store my purchase history?",
        answer:
          "For repeat customers we keep the medicines you normally buy so refills are quick. Prescription copies are kept only as long as the law requires for dispensing records.",
      },
    ],
    related: ["pharmacy-kurla-west", "medicine-delivery-kurla-west", "chemist-kurla-west"],
  },
  {
    slug: "medicine-delivery-kurla-west",
    navLabel: "Medicine Delivery in Kurla West",
    h1: "Medicine Delivery Within 4 km of Kurla West",
    intro:
      "We deliver medicine orders to homes and clinics inside a 4 km radius of the shop in Kurla West. Share your prescription and address on WhatsApp, and we confirm availability, price and a delivery window before anything is dispatched.",
    sections: [
      {
        heading: "Where we deliver",
        body: [
          "Delivery is limited to roughly 4 km around Kurla West (pincode 400070). In practice that covers Kurla East, Chunabhatti, Sion, Kalina, Vidyavihar, Saki Naka, the western edge of Chembur and parts of Ghatkopar.",
          "We do not advertise delivery outside this area. If your pincode is not in the covered list, the site will tell you at checkout, and you are welcome to collect the order from the counter instead.",
        ],
        bullets: [
          "400070 Kurla West · 400071 Kurla East · 400072 Saki Naka",
          "400024 Chunabhatti · 400019 Sion · 400098 Kalina",
          "400086 Vidyavihar · 400077 Ghatkopar · 400037 Chembur (western edge)",
        ],
      },
      {
        heading: "How an order actually moves",
        body: [
          "You send the prescription or medicine list. We check stock and confirm the amount on WhatsApp. Once you approve, the order is packed, the bill is prepared, and a rider carries it to your address inside the agreed window.",
          "Payment is on delivery by cash or UPI, or online in advance. You get the bill with the batch number and expiry printed on it, exactly as you would at the counter.",
        ],
      },
      {
        heading: "Prescription and safety rules for delivery",
        body: [
          "Prescription-only medicines need a clear photo of a valid prescription from a registered practitioner. Our pharmacist reviews it before packing. If a prescription is unclear or expired, we call you instead of guessing.",
          "Refrigerated items travel in an insulated pack and should go into your fridge as soon as they arrive. Anything that looks tampered with on arrival should be refused and reported to us the same day.",
        ],
      },
    ],
    faqs: [
      {
        question: "How far does Ayush Medico deliver?",
        answer:
          "Up to about 4 km from Kurla West. Delivery is confirmed by pincode at checkout, and areas outside that radius are not served for home delivery.",
      },
      {
        question: "How long does delivery take?",
        answer:
          "Inside the service area, most orders reach the same day. The exact window is confirmed on WhatsApp after we check stock, because cold-chain and scheduled items take longer to pack.",
      },
      {
        question: "Can I pay cash on delivery?",
        answer:
          "Yes. Cash and UPI on delivery are both accepted, and online payment in advance is available if you prefer. A printed bill with batch and expiry comes with every order.",
      },
    ],
    related: ["pharmacy-kurla-west", "medical-store-kurla-west", "medicine-availability"],
  },
  {
    slug: "chemist-kurla-west",
    navLabel: "Chemist Shop in Kurla West",
    h1: "Chemist Shop Near Kurla Station, Kurla West",
    intro:
      "A neighbourhood chemist that stays open late enough to be useful. Ayush Medico is a few minutes from Kurla station's west exit and open seven days a week until 10 PM.",
    sections: [
      {
        heading: "Open when the clinic has already closed",
        body: [
          "Most prescriptions in Mumbai are written in the evening. We stay open until 10 PM every day, including Sundays, so a late discharge or a sudden fever does not turn into a hunt across the neighbourhood.",
          "If you are coming from the station, call on the way and we will keep the medicines bagged at the counter.",
        ],
      },
      {
        heading: "A chemist that answers the phone",
        body: [
          "The most common frustration with local chemists is not being able to reach anyone. Our numbers are answered during shop hours and WhatsApp is monitored, so a stock query usually gets a reply in minutes rather than a busy tone.",
          "Ask for the salt name if you cannot remember the brand. We can tell you what equivalents are on the shelf and let your doctor decide on any change.",
        ],
      },
      {
        heading: "Payments and paperwork",
        body: [
          "Cash, UPI, and cards are accepted. Every bill carries the batch number and expiry date, which matters if you need to claim reimbursement or return an item.",
          "GST invoices are available for clinic and business purchases — ask at the counter so the details are correct the first time.",
        ],
      },
    ],
    faqs: [
      {
        question: "What are the shop timings?",
        answer:
          "8 AM to 10 PM, all seven days, including Sundays and most public holidays. If you are travelling from far, call first to confirm the medicine is in stock.",
      },
      {
        question: "How close is the shop to Kurla station?",
        answer:
          "It is on Halav Pool Road near Rolex Hotel in Kurla West, a short walk or quick auto ride from the west side of Kurla station.",
      },
      {
        question: "Do you give GST invoices?",
        answer:
          "Yes, GST invoices are available for clinic and business purchases. Share your GSTIN at the counter or on WhatsApp before billing.",
      },
    ],
    related: ["pharmacy-kurla-west", "medical-store-kurla-west", "medicine-availability"],
  },
  {
    slug: "medicine-availability",
    navLabel: "Medicine Availability & Enquiry",
    h1: "Check Medicine Availability Before You Travel",
    intro:
      "Send us the medicine name, strength and quantity and we will confirm whether it is on the shelf, when it can be arranged, and what it costs — before you leave home.",
    sections: [
      {
        heading: "How to send an enquiry that gets a fast answer",
        body: [
          "A clear enquiry saves a round trip. Tell us the brand or salt name, the strength (for example 500 mg), the pack size if you know it, and how many you need.",
          "A photo of the strip or the prescription works just as well and is often faster than typing. For prescriptions, make sure the doctor's name, registration and date are visible.",
        ],
        bullets: [
          "Medicine or salt name, plus strength",
          "Quantity needed and how many days it should last",
          "Prescription photo, if the medicine is prescription-only",
          "Your pincode, if you want delivery rather than pickup",
        ],
      },
      {
        heading: "When a medicine is not available",
        body: [
          "Some products are short across the market, not just at our counter. If we do not have it, we tell you plainly and give an honest expectation instead of a vague 'come tomorrow'.",
          "We can usually arrange non-available items through licensed distributors within a day. If an alternative exists on the shelf, we mention it — but the decision to change a medicine stays with your doctor.",
        ],
      },
      {
        heading: "What we will not do",
        body: [
          "We do not confirm stock we do not have, we do not quote a price we cannot honour, and we do not dispense scheduled medicines without a valid prescription. Enquiries about dosage or whether to continue a course are referred to your doctor.",
        ],
      },
    ],
    faqs: [
      {
        question: "How quickly will I get a reply to a stock enquiry?",
        answer:
          "During shop hours, usually within minutes on WhatsApp or a single phone call. Enquiries sent after 10 PM are answered when the shop opens the next morning.",
      },
      {
        question: "Can you arrange a medicine that is not in stock?",
        answer:
          "In most cases yes, through our licensed distributors, typically within a day. We confirm the expected time and price before you commit to anything.",
      },
      {
        question: "Is my prescription kept confidential?",
        answer:
          "Prescription details are used only to dispense your order and kept as dispensing records require. They are not shared with anyone else.",
      },
    ],
    related: ["pharmacy-kurla-west", "medicine-delivery-kurla-west", "medical-store-kurla-west"],
  },
];

export const localPageBySlug = (slug: string): LocalPage | undefined =>
  LOCAL_PAGES.find((page) => page.slug === slug);
