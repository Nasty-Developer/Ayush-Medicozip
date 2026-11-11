/**
 * Pharmacy guides.
 *
 * Practical, non-clinical content a neighbourhood pharmacy can stand behind:
 * finding a reliable chemist, checking availability, storing medicines, and
 * understanding prescriptions. No diagnoses, no dosage advice, no health claims.
 */

export type BlogSection = { heading: string; body: string[]; bullets?: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  /** H1 can differ from the SEO title. */
  h1: string;
  excerpt: string;
  /** ISO date, used for Article schema and display. */
  published: string;
  updated?: string;
  readingMinutes: number;
  sections: BlogSection[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-choose-a-reliable-pharmacy-in-kurla-west",
    title: "How to Choose a Reliable Pharmacy in Kurla West",
    h1: "How to Choose a Reliable Pharmacy in Kurla West",
    excerpt:
      "Licences, batch numbers, bills and cold-chain handling — the five checks that separate a dependable chemist from a risky one, explained for Mumbai families.",
    published: "2026-11-11",
    readingMinutes: 5,
    sections: [
      {
        heading: "Start with the licence, not the discount",
        body: [
          "Every retail pharmacy in Maharashtra must display its FDA drug licence — a Form 20 for retail sale and a Form 21 for wholesale — along with the name of the registered pharmacist on duty. At Ayush Medico these are MH-MZ4-518856 and MH-MZ4-518857.",
          "A pharmacy that cannot show a licence, or whose pharmacist is never present, is not a place to buy prescription medicine. The licence is not paperwork; it is the reason a pharmacist is legally responsible for what is handed to you.",
        ],
      },
      {
        heading: "Every bill should carry batch number and expiry",
        body: [
          "A printed bill with the batch number and expiry date is your only practical protection. It lets you check the medicine's remaining shelf life at the counter, and it is what a manufacturer or distributor needs if a product has to be traced.",
          "If a chemist writes the amount on a scrap of paper, you have no record of which batch you were sold. Ask for the proper bill, every time, even for a single strip.",
        ],
        bullets: [
          "Batch number printed on the bill",
          "Expiry date with a comfortable margin, not a month away",
          "Correct medicine name, strength and pack size",
          "GST invoice for clinic or business purchases",
        ],
      },
      {
        heading: "Cold-chain items need visible handling",
        body: [
          "Insulin, some vaccines and certain drops have to stay refrigerated from distributor to counter. A reliable pharmacy keeps them in a working refrigerator, not on the shelf beside the cash box, and packs them in an insulated bag for the trip home.",
          "Ask how the item is stored before you buy it, and put it in your fridge as soon as you get back — not in the freezer.",
        ],
      },
      {
        heading: "A good chemist answers questions honestly",
        body: [
          "The most useful signal is behaviour under pressure. A dependable pharmacy says 'not available, I can arrange it tomorrow' rather than 'come back later' five times. It refuses to sell a prescription medicine without a prescription, even to a regular customer.",
          "It also knows its limits. Questions about dosage, substitutes or stopping a course belong to your doctor, and a pharmacy that respects that boundary is protecting you.",
        ],
      },
      {
        heading: "Locations matter less than reachability",
        body: [
          "In Kurla West you are rarely far from a chemist, so choose one you can actually reach. A pharmacy near Kurla station that answers its phone and keeps stock steady will save more time over a year than one that is marginally closer but never has your medicine.",
        ],
      },
    ],
  },
  {
    slug: "understanding-medicine-availability",
    title: "Why a Medicine Is Sometimes Unavailable (and What to Do)",
    h1: "Understanding Medicine Availability in Mumbai",
    excerpt:
      "Short supply, brand discontinuation, batch recalls and distributor gaps all look the same at the counter. Here is how medicine availability actually works.",
    published: "2026-11-11",
    readingMinutes: 4,
    sections: [
      {
        heading: "Four different reasons a medicine is missing",
        body: [
          "Not available at the counter can mean very different things. It may be a temporary stock-out at the shop, a wider shortage at the distributor, a manufacturer that has paused production of a brand, or a recall of a specific batch.",
          "Each has a different fix, which is why an honest timeline from your pharmacist is more useful than a vague assurance.",
        ],
        bullets: [
          "Shop stock-out — usually resolved in a day",
          "Distributor gap — a few days, depending on the route",
          "Brand discontinued — your doctor may need to choose an equivalent",
          "Batch recall — the batch must not be dispensed at all",
        ],
      },
      {
        heading: "Salt name beats brand name",
        body: [
          "Medicines are approved by their composition, not by the brand printed on the box. Knowing the salt name and strength — for example paracetamol 500 mg rather than just a brand — lets a pharmacy search equivalents when your usual box is not on the shelf.",
          "Substituting a medicine is a clinical decision, not a shop decision. Share the alternative with your prescriber before you switch, particularly for anything taken daily.",
        ],
      },
      {
        heading: "What a pharmacy can and cannot confirm by phone",
        body: [
          "A pharmacist can check the shelf, the batch and the price while you are on the line. What they cannot do is guarantee that a scheduled medicine will be dispensed before seeing a valid prescription.",
          "Enquiries get answered fastest when you send the salt name or a photo of the strip, the quantity you need, and your pincode if delivery is involved.",
        ],
      },
      {
        heading: "Plan repeat prescriptions around the gap",
        body: [
          "If you take a medicine every day, order it a few days before the last strip runs out rather than on the final evening. That buffer absorbs the ordinary one-day gaps without turning them into a missed dose.",
          "For long-term medicines, a written list kept on file at your pharmacy turns a monthly scramble into a single message.",
        ],
      },
    ],
  },
  {
    slug: "how-to-store-medicines-safely-at-home",
    title: "How to Store Medicines Safely at Home in Mumbai",
    h1: "Storing Medicines Safely at Home",
    excerpt:
      "Mumbai humidity ruins more medicines than people realise. Where to keep them, what belongs in the fridge, and when to throw a strip away.",
    published: "2026-11-11",
    readingMinutes: 4,
    sections: [
      {
        heading: "Heat and humidity are the real enemies",
        body: [
          "Most tablets are labelled to be stored below 30°C in dry conditions. A Mumbai kitchen shelf in summer, or a bathroom cabinet that steams up every morning, can push past that routinely.",
          "The safest spot in most homes is a closed cupboard in the coolest room — away from the stove, the window and the bathroom, and high enough that children cannot reach it.",
        ],
        bullets: [
          "Keep the original strip and box, so strength and expiry stay readable",
          "Keep the desiccant sachet inside the bottle, not removed",
          "Store liquids upright; syrups leak and pills absorb the spill",
          "Never move tablets into an unlabelled container",
        ],
      },
      {
        heading: "What actually needs the fridge",
        body: [
          "Only items labelled for refrigeration — typically insulin, some vaccines and certain eye preparations — belong in the fridge. Put them in the main compartment, never the freezer, and never against the back wall where they can freeze.",
          "Everything else in the fridge picks up moisture. Tablets that look powdery, stuck or discoloured after refrigeration should be discarded.",
        ],
      },
      {
        heading: "When to throw a medicine away",
        body: [
          "The expiry date is a hard stop. Beyond that, a change in appearance is a warning: discoloured tablets, brittle strips, a syrup that has separated, or a cream that smells different.",
          "Expired medicines should not be flushed down the drain. Hand them to a pharmacy that accepts returns for safe disposal, or follow your local municipal guidance.",
        ],
      },
      {
        heading: "Keep one list, keep it accurate",
        body: [
          "A written list of current medicines, strengths and the prescriber's name is useful in an emergency and at every appointment. Update it when a course ends rather than letting it become a museum of past prescriptions.",
        ],
      },
    ],
  },
  {
    slug: "prescription-rules-at-a-pharmacy",
    title: "Why Pharmacies Ask for a Prescription",
    h1: "Understanding Prescription Requirements",
    excerpt:
      "What makes a prescription valid, why a pharmacist can refuse to dispense, and what to do when you have lost the original.",
    published: "2026-11-11",
    readingMinutes: 4,
    sections: [
      {
        heading: "What a valid prescription needs",
        body: [
          "A prescription is a legal document, not a note. For scheduled medicines it should carry the patient's name, the medicine with strength and dosage form, the prescriber's name and registration number, the date, and the prescriber's signature.",
          "Prescriptions also have a shelf life. A prescription written months ago for an acute problem may no longer be appropriate, and pharmacies are expected to apply judgement rather than dispense indefinitely.",
        ],
      },
      {
        heading: "Why a pharmacist may say no",
        body: [
          "Pharmacists refuse for specific reasons: no valid prescription, an illegible or altered document, an expired date, a dose that looks unsafe, or signs that the same prescription has already been dispensed elsewhere.",
          "This is not obstruction. Dispensing a scheduled medicine without a valid prescription is an offence, and the pharmacist on duty is personally accountable.",
        ],
      },
      {
        heading: "If you have lost the prescription",
        body: [
          "Ask your doctor for a fresh prescription or a digital copy with the registration number visible. A photograph of an old prescription is acceptable only when the details are legible and the prescription is still valid.",
          "For repeat medication, many prescribers will issue a repeat for a stable, long-term medicine. Ask them directly; do not ask the pharmacy to work around the rule.",
        ],
      },
      {
        heading: "Online and WhatsApp orders",
        body: [
          "Sending a prescription on WhatsApp does not change the rules. The pharmacist still reviews it before packing, and orders for scheduled medicines are held until that review is done.",
          "Clear photos help: full page, good light, no fingers over the dosage. If something is unclear, expect a call rather than a guess.",
        ],
      },
    ],
  },
  {
    slug: "how-to-contact-ayush-medico",
    title: "How to Contact Ayush Medico for a Medicine Enquiry",
    h1: "Contacting Ayush Medico: What to Send, and What to Expect",
    excerpt:
      "Call, WhatsApp or walk in. A short guide to getting a fast, accurate answer about stock, price and delivery in Kurla West.",
    published: "2026-11-11",
    readingMinutes: 3,
    sections: [
      {
        heading: "Three ways to reach the shop",
        body: [
          "Phone is fastest for a quick stock check. WhatsApp is best when you need to send a prescription or a photo of the strip. Walking in is simplest if you already know what you need and want it in hand.",
          "All three reach the same counter, staffed during shop hours from 8 AM to 10 PM, seven days a week.",
        ],
        bullets: [
          "Call +91 98332 73838 during shop hours",
          "WhatsApp the same number with a prescription photo",
          "Visit Halav Pool Road, Kurla West, near Rolex Hotel",
        ],
      },
      {
        heading: "What to include in the message",
        body: [
          "For a stock enquiry: medicine name or salt, strength, quantity, and your pincode if you want delivery. For a prescription order: a clear photo of the whole page.",
          "If you are asking about a chronic medicine, mention that it is a monthly refill. It helps us check the batch and keep it aside.",
        ],
      },
      {
        heading: "Delivery expectations",
        body: [
          "Home delivery covers roughly a 4 km radius around Kurla West — Kurla East, Chunabhatti, Sion, Kalina, Vidyavihar, Saki Naka, Ghatkopar and the western edge of Chembur.",
          "Orders outside that radius are not delivered; you can collect them from the counter instead. The checkout tells you straight away whether your pincode is covered.",
        ],
      },
      {
        heading: "Questions we will pass back to your doctor",
        body: [
          "Whether to continue a course, whether to switch brands, or what to do about a side effect are clinical questions. We will tell you what the label says and what is in stock, and send the clinical decision to the prescriber.",
        ],
      },
    ],
  },
];

export const blogPostBySlug = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((post) => post.slug === slug);
