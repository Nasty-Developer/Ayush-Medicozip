/**
 * GENERATED FILE — do not edit by hand.
 *
 * Source of truth: artifacts/ayush-medico/src/content/{localPages,blog}.ts
 * Regenerate: pnpm --filter @workspace/api-server run gen:prerender
 */

export type PrerenderSection = { heading: string; body: string[]; bullets?: string[] };

export type PrerenderLocalPage = {
  slug: string;
  navLabel: string;
  h1: string;
  intro: string;
  sections: PrerenderSection[];
  faqs: { question: string; answer: string }[];
  related: string[];
};

export type PrerenderBlogPost = {
  slug: string;
  title: string;
  h1: string;
  excerpt: string;
  published: string;
  updated?: string;
  readingMinutes: number;
  sections: PrerenderSection[];
};

export const PRERENDER_LOCAL_PAGES: PrerenderLocalPage[] = [
  {
    "slug": "pharmacy-kurla-west",
    "navLabel": "Pharmacy in Kurla West",
    "h1": "Pharmacy in Kurla West, Mumbai",
    "intro": "Ayush Medico is a licensed retail pharmacy on Halav Pool Road in Kurla West, open every day from 8 AM to 10 PM. Walk in with a prescription, call ahead to check stock, or send your list on WhatsApp and we will keep it ready.",
    "sections": [
      {
        "heading": "What you can pick up at the counter",
        "body": [
          "We are a full-service chemist, not a wellness boutique. Prescription medicines, over-the-counter pain and fever remedies, cough and cold products, digestive care, diabetes supplies, BP monitors, dressings and surgical items, mother and baby care, and daily personal care all sit in the same shop.",
          "If a specific brand is not on the shelf, tell us the salt name or show the prescription. Most items reach us within a day through our licensed distributors, and we will message you when it arrives."
        ],
        "bullets": [
          "Prescription medicines, dispensed by a registered pharmacist",
          "OTC and general remedies for everyday illness",
          "Health devices: BP monitors, glucometers, thermometers, nebulisers",
          "Baby care, personal hygiene, first aid and surgical supplies",
          "Ayurvedic and supplement ranges alongside allopathic stock"
        ]
      },
      {
        "heading": "Finding us if you searched for a pharmacy near you",
        "body": [
          "We sit on Halav Pool Road in Kurla West, pincode 400070, a short walk from Kurla station on the west side. If a map search brought you here, call the shop before you set out and we will tell you exactly what is on the shelf.",
          "Search results for a chemist near you depend on where you are standing, so the honest advice is this: check the distance on the map listing first, then call to confirm the medicine is in stock. We would rather save you a trip than have you arrive for something we do not have."
        ]
      },
      {
        "heading": "Checking stock before you travel",
        "body": [
          "The fastest way to avoid a wasted trip is a phone call or a WhatsApp message with the medicine name and quantity. We check the shelf and the batch while you are on the line, and we tell you honestly when something is unavailable instead of holding you in a queue.",
          "For repeat prescriptions, send a photo of the prescription and the pack you use. We keep the details on file so the next refill takes a single message."
        ]
      },
      {
        "heading": "Reaching us from around Kurla",
        "body": [
          "The shop is at Shop No.1, Hut No.67 1/1, Gangaram Makad Wala Chawl, Halav Pool, near Rolex Hotel, Kurla West 400070 — a short walk from Kurla station's west side and easy to reach from Sion, Chunabhatti, Kalina and Vidyavihar.",
          "Two-wheelers can stop directly outside. If you are coming by car, Halav Pool Road has parking a little ahead of the shop."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Is Ayush Medico a licensed pharmacy?",
        "answer": "Yes. We hold FDA Mumbai Zone-4 licences MH-MZ4-518856 (Form 20, retail sale) and MH-MZ4-518857 (Form 21, wholesale), with a registered pharmacist on the premises during business hours."
      },
      {
        "question": "Do I need an appointment to visit the pharmacy?",
        "answer": "No appointment is needed. Walk in any day between 8 AM and 10 PM. For a medicine that is usually short in the market, call first so we can confirm the batch is in stock."
      },
      {
        "question": "Can I get medicines without a prescription?",
        "answer": "Over-the-counter products and general healthcare items are available directly. Scheduled and prescription-only medicines require a valid prescription from a registered medical practitioner, which we review before dispensing."
      }
    ],
    "related": [
      "medical-store-kurla-west",
      "medicine-delivery-kurla-west",
      "medicine-availability"
    ]
  },
  {
    "slug": "medical-store-kurla-west",
    "navLabel": "Medical Store in Kurla West",
    "h1": "Medical Store in Kurla West for Daily and Long-Term Needs",
    "intro": "From a single strip of tablets to a month of chronic-care medicines, Ayush Medico stocks everyday healthcare for families, clinics and small businesses around Kurla West.",
    "sections": [
      {
        "heading": "Built for regular, repeat customers",
        "body": [
          "Most of our customers come back every month for the same set of tablets. We keep a record of what you bought, so a refill is a message rather than a full explanation each time, and we flag it when a pack size or manufacturer changes.",
          "Clinics and nursing homes nearby use us for surgical consumables, IV fluids, gloves, syringes and dressing material. Bulk quantities are arranged against a written list so there is no confusion at pickup."
        ]
      },
      {
        "heading": "Chronic care: diabetes, BP, thyroid, cardiac",
        "body": [
          "Long-term medicines need consistency, so we hold steady stock of common diabetes, blood pressure, thyroid, cholesterol and cardiac brands, including insulin with cold-chain handling from delivery to counter.",
          "If your prescription changes, bring the new one. We do not substitute a medicine or strength on our own; the prescriber decides that."
        ],
        "bullets": [
          "Monthly refills kept ready against a phone or WhatsApp message",
          "Insulin and cold-chain items stored and handed over as labelled",
          "Surgical and dressing supplies for home care and clinics",
          "Glucometer strips, lancets, BP monitors and nebuliser accessories"
        ]
      },
      {
        "heading": "What we do not do",
        "body": [
          "We do not dispense prescription medicine without a valid prescription, we do not sell expired or unlabelled stock, and we do not advise you to stop or change a course on our own. Where a question is clinical, we send you back to your doctor."
        ]
      }
    ],
    "faqs": [
      {
        "question": "Can Ayush Medico supply medicines for a clinic or nursing home?",
        "answer": "Yes. We supply surgical consumables, dressing material, syringes, gloves and IV fluids in bulk against a written list. Share the list on WhatsApp and we will confirm availability, rate and pickup time."
      },
      {
        "question": "Do you keep insulin and cold-chain medicines?",
        "answer": "Common insulin brands are stocked and kept refrigerated. Tell us before you visit so we can confirm the batch and keep it ready for the shortest possible time out of the cold chain."
      },
      {
        "question": "Do you store my purchase history?",
        "answer": "For repeat customers we keep the medicines you normally buy so refills are quick. Prescription copies are kept only as long as the law requires for dispensing records."
      }
    ],
    "related": [
      "pharmacy-kurla-west",
      "medicine-delivery-kurla-west",
      "chemist-kurla-west"
    ]
  },
  {
    "slug": "medicine-delivery-kurla-west",
    "navLabel": "Medicine Delivery in Kurla West",
    "h1": "Medicine Delivery Within 4 km of Kurla West",
    "intro": "We deliver medicine orders to homes and clinics inside a 4 km radius of the shop in Kurla West. Share your prescription and address on WhatsApp, and we confirm availability, price and a delivery window before anything is dispatched.",
    "sections": [
      {
        "heading": "Where we deliver",
        "body": [
          "Delivery is limited to roughly 4 km around Kurla West (pincode 400070). In practice that covers Kurla East, Chunabhatti, Sion, Kalina, Vidyavihar, Saki Naka, the western edge of Chembur and parts of Ghatkopar.",
          "We do not advertise delivery outside this area. If your pincode is not in the covered list, the site will tell you at checkout, and you are welcome to collect the order from the counter instead."
        ],
        "bullets": [
          "400070 Kurla West · 400071 Kurla East · 400072 Saki Naka",
          "400024 Chunabhatti · 400019 Sion · 400098 Kalina",
          "400086 Vidyavihar · 400077 Ghatkopar · 400037 Chembur (western edge)"
        ]
      },
      {
        "heading": "How an order actually moves",
        "body": [
          "You send the prescription or medicine list. We check stock and confirm the amount on WhatsApp. Once you approve, the order is packed, the bill is prepared, and a rider carries it to your address inside the agreed window.",
          "Payment is on delivery by cash or UPI, or online in advance. You get the bill with the batch number and expiry printed on it, exactly as you would at the counter."
        ]
      },
      {
        "heading": "Prescription and safety rules for delivery",
        "body": [
          "Prescription-only medicines need a clear photo of a valid prescription from a registered practitioner. Our pharmacist reviews it before packing. If a prescription is unclear or expired, we call you instead of guessing.",
          "Refrigerated items travel in an insulated pack and should go into your fridge as soon as they arrive. Anything that looks tampered with on arrival should be refused and reported to us the same day."
        ]
      }
    ],
    "faqs": [
      {
        "question": "How far does Ayush Medico deliver?",
        "answer": "Up to about 4 km from Kurla West. Delivery is confirmed by pincode at checkout, and areas outside that radius are not served for home delivery."
      },
      {
        "question": "How long does delivery take?",
        "answer": "Inside the service area, most orders reach the same day. The exact window is confirmed on WhatsApp after we check stock, because cold-chain and scheduled items take longer to pack."
      },
      {
        "question": "Can I pay cash on delivery?",
        "answer": "Yes. Cash and UPI on delivery are both accepted, and online payment in advance is available if you prefer. A printed bill with batch and expiry comes with every order."
      }
    ],
    "related": [
      "pharmacy-kurla-west",
      "medical-store-kurla-west",
      "medicine-availability"
    ]
  },
  {
    "slug": "chemist-kurla-west",
    "navLabel": "Chemist Shop in Kurla West",
    "h1": "Chemist Shop Near Kurla Station, Kurla West",
    "intro": "A neighbourhood chemist that stays open late enough to be useful. Ayush Medico is a few minutes from Kurla station's west exit and open seven days a week until 10 PM.",
    "sections": [
      {
        "heading": "Open when the clinic has already closed",
        "body": [
          "Most prescriptions in Mumbai are written in the evening. We stay open until 10 PM every day, including Sundays, so a late discharge or a sudden fever does not turn into a hunt across the neighbourhood.",
          "If you are coming from the station, call on the way and we will keep the medicines bagged at the counter."
        ]
      },
      {
        "heading": "A chemist that answers the phone",
        "body": [
          "The most common frustration with local chemists is not being able to reach anyone. Our numbers are answered during shop hours and WhatsApp is monitored, so a stock query usually gets a reply in minutes rather than a busy tone.",
          "Ask for the salt name if you cannot remember the brand. We can tell you what equivalents are on the shelf and let your doctor decide on any change."
        ]
      },
      {
        "heading": "Payments and paperwork",
        "body": [
          "Cash, UPI, and cards are accepted. Every bill carries the batch number and expiry date, which matters if you need to claim reimbursement or return an item.",
          "GST invoices are available for clinic and business purchases — ask at the counter so the details are correct the first time."
        ]
      }
    ],
    "faqs": [
      {
        "question": "What are the shop timings?",
        "answer": "8 AM to 10 PM, all seven days, including Sundays and most public holidays. If you are travelling from far, call first to confirm the medicine is in stock."
      },
      {
        "question": "How close is the shop to Kurla station?",
        "answer": "It is on Halav Pool Road near Rolex Hotel in Kurla West, a short walk or quick auto ride from the west side of Kurla station."
      },
      {
        "question": "Do you give GST invoices?",
        "answer": "Yes, GST invoices are available for clinic and business purchases. Share your GSTIN at the counter or on WhatsApp before billing."
      }
    ],
    "related": [
      "pharmacy-kurla-west",
      "medical-store-kurla-west",
      "medicine-availability"
    ]
  },
  {
    "slug": "medicine-availability",
    "navLabel": "Medicine Availability & Enquiry",
    "h1": "Check Medicine Availability Before You Travel",
    "intro": "Send us the medicine name, strength and quantity and we will confirm whether it is on the shelf, when it can be arranged, and what it costs — before you leave home.",
    "sections": [
      {
        "heading": "How to send an enquiry that gets a fast answer",
        "body": [
          "A clear enquiry saves a round trip. Tell us the brand or salt name, the strength (for example 500 mg), the pack size if you know it, and how many you need.",
          "A photo of the strip or the prescription works just as well and is often faster than typing. For prescriptions, make sure the doctor's name, registration and date are visible."
        ],
        "bullets": [
          "Medicine or salt name, plus strength",
          "Quantity needed and how many days it should last",
          "Prescription photo, if the medicine is prescription-only",
          "Your pincode, if you want delivery rather than pickup"
        ]
      },
      {
        "heading": "When a medicine is not available",
        "body": [
          "Some products are short across the market, not just at our counter. If we do not have it, we tell you plainly and give an honest expectation instead of a vague 'come tomorrow'.",
          "We can usually arrange non-available items through licensed distributors within a day. If an alternative exists on the shelf, we mention it — but the decision to change a medicine stays with your doctor."
        ]
      },
      {
        "heading": "What we will not do",
        "body": [
          "We do not confirm stock we do not have, we do not quote a price we cannot honour, and we do not dispense scheduled medicines without a valid prescription. Enquiries about dosage or whether to continue a course are referred to your doctor."
        ]
      }
    ],
    "faqs": [
      {
        "question": "How quickly will I get a reply to a stock enquiry?",
        "answer": "During shop hours, usually within minutes on WhatsApp or a single phone call. Enquiries sent after 10 PM are answered when the shop opens the next morning."
      },
      {
        "question": "Can you arrange a medicine that is not in stock?",
        "answer": "In most cases yes, through our licensed distributors, typically within a day. We confirm the expected time and price before you commit to anything."
      },
      {
        "question": "Is my prescription kept confidential?",
        "answer": "Prescription details are used only to dispense your order and kept as dispensing records require. They are not shared with anyone else."
      }
    ],
    "related": [
      "pharmacy-kurla-west",
      "medicine-delivery-kurla-west",
      "medical-store-kurla-west"
    ]
  }
];

export const PRERENDER_BLOG_POSTS: PrerenderBlogPost[] = [
  {
    "slug": "medicine-home-delivery-kurla-west",
    "title": "Medicine Home Delivery in Kurla West: How the 4 KM Radius Works",
    "h1": "Medicine Home Delivery in Kurla West: How Our 4 KM Radius Works",
    "excerpt": "What our 4 kilometre delivery area actually covers, what to send on WhatsApp for a quick confirmation, and the items we will not send by bike.",
    "published": "2026-11-11",
    "readingMinutes": 4,
    "sections": [
      {
        "heading": "Why the radius is 4 km and not the whole city",
        "body": [
          "A pharmacy delivers medicine, not parcels. Delivery has to be handled by someone who can answer a question about what is in the bag, keep a cold-chain item cold, and come back if the address is wrong. That is only practical inside a short radius of the shop, which is why Ayush Medico delivers within roughly 4 km of Kurla West.",
          "If you are in Kurla West and the neighbouring pockets of the Kurla, Sion and Chunabhatti side, you are almost certainly inside it. If you are further out, we will say so honestly when you message us rather than take the order and keep you waiting."
        ]
      },
      {
        "heading": "Message first with these four details",
        "body": [
          "Delivery works best when the first message is complete. Send your name, the delivery address with a landmark, the medicine list or a clear photo of the prescription, and whether you need it today.",
          "A photo of the strip you already have is often faster than typing a name, because it shows the strength and pack size. If it is a repeat order, say so; we keep a record of what was dispensed to you before."
        ],
        "bullets": [
          "Name and a reachable phone number",
          "Full address with a building name or landmark",
          "Prescription photo for anything that needs one",
          "Whether it is urgent or can wait for the evening"
        ]
      },
      {
        "heading": "What counts as a valid prescription",
        "body": [
          "For Schedule H and H1 medicines we need a prescription from a registered medical practitioner, with the patient's name, the medicine and strength, the doctor's signature, registration number and date. A photograph of the original is fine; a screenshot of a WhatsApp forward with no patient name is not.",
          "If a prescription is unclear or looks altered, the pharmacist will call you before dispatching. That call is not an obstacle. It is the reason a licensed pharmacy exists."
        ]
      },
      {
        "heading": "What we do not send by delivery",
        "body": [
          "Some items we will only hand over at the counter, and a few we do not handle at all. Insulin and other refrigerated items depend on the weather and how long the trip is, so we confirm case by case instead of promising a cold bag we cannot guarantee.",
          "We do not deliver narcotics or any medicine that requires special licensing, we do not send emergency or life-saving treatment by bike, and we do not deliver outside the service radius to look accommodating. For an emergency, go to the nearest hospital."
        ]
      },
      {
        "heading": "Payment, bill and what arrives with the order",
        "body": [
          "Every delivery carries a proper bill showing the batch number and expiry date of each item, along with the total before the bag leaves the shop. We share the amount on WhatsApp for approval first, so there is no surprise at the door.",
          "If something in the bag is not what you expected, tell us on the same number straight away. Batch traceability only works if you keep the bill, so please keep it until the course is finished."
        ]
      },
      {
        "heading": "If you are just outside the radius",
        "body": [
          "You have two options that still work. Place the order and collect it from the counter at a time we confirm, or ask us whether a one-off arrangement is possible when the distance is only slightly over.",
          "What we will not do is quietly accept an out-of-radius order and deliver it hours later. A pharmacy that overpromises delivery is usually a pharmacy that is not checking its own stock either."
        ]
      },
      {
        "heading": "What “urgent” means for a pharmacy delivery",
        "body": [
          "If a dose is due in the next hour, delivery is the wrong tool. Come to the counter, or send someone who can. A bike in Kurla traffic during the evening peak cannot beat a ten-minute walk, and promising otherwise would be dishonest.",
          "For a routine refill, a same-day slot almost always works. For something the shop does not stock, the honest answer is tomorrow or later, and we would rather say that on the first message than after the bag is packed."
        ]
      },
      {
        "heading": "If something is wrong with the order",
        "body": [
          "Wrong strength, wrong brand, a strip damaged in transit: message the same number with a photo and the bill reference. Nothing about that conversation should be difficult, and the item is replaced or refunded as the bill shows it.",
          "Please keep the bill until the course is finished. Without the batch number there is very little a pharmacy or a manufacturer can do to trace a problem."
        ]
      }
    ]
  },
  {
    "slug": "chemist-near-kurla-station",
    "title": "Chemist Near Kurla Station: What to Carry Before You Visit",
    "h1": "Visiting a Chemist Near Kurla Station: A Short Practical Checklist",
    "excerpt": "Kurla station is one of Mumbai's busiest junctions, and the shops around it are busiest at exactly the wrong hours. Here is how to make one trip enough.",
    "published": "2026-11-11",
    "readingMinutes": 4,
    "sections": [
      {
        "heading": "Carry more than the prescription slip",
        "body": [
          "The single biggest reason a chemist trip fails is an incomplete prescription: a missing strength, a page left at home, a medicine the doctor wrote in shorthand for a brand that has three variants. Before you leave, photograph the prescription. If the chemist has to keep the original, you still have a copy.",
          "If you are buying a refill rather than a new course, bring the old strip or the last bill. The pack size and strength on it remove all guesswork."
        ],
        "bullets": [
          "The full prescription, all pages, front and back",
          "A photo of it on your phone",
          "The old strip or last bill for refills",
          "A list of any other medicines being taken",
          "The doctor's number, in case something is unclear"
        ]
      },
      {
        "heading": "Ask ahead if you are coming for one specific item",
        "body": [
          "Kurla station Road sees thousands of people an hour, and a pharmacy near a junction cannot keep every brand of every molecule on the shelf. If you need one particular medicine, especially an imported, insulin or rare item, message or call before travelling.",
          "A two-line message gets a two-line answer: available, or the date it can be arranged. That is faster than standing at a counter in the evening rush."
        ]
      },
      {
        "heading": "Time the visit away from the crowd",
        "body": [
          "The stretch around the station is at its worst between roughly 6 pm and 9 pm, when offices close and long-distance passengers move through. Mornings are calmer, and early afternoon is usually the quietest window for a conversation at the counter.",
          "If you are buying for an elderly parent or a child, go when you can actually talk. Rushing a medicine purchase is how the wrong strength gets picked up."
        ]
      },
      {
        "heading": "The four questions worth asking at the counter",
        "body": [
          "A good chemist will answer all four without irritation. If any of them is brushed aside, that is information about the shop.",
          "Ask whether the item is in stock in the strength written, what the expiry date is, whether the bill will show the batch number, and how the item should be stored once you get home. For a refrigerated item, ask how it will be packed for the journey."
        ]
      },
      {
        "heading": "When your medicine is not available",
        "body": [
          "Ask for three things: the expected date, whether another branch or distributor can supply it, and whether the doctor needs to approve an alternative brand or strength. The third one matters most. A pharmacist can suggest that a substitute exists; only your doctor can decide that it is right for you.",
          "Do not accept a different strength 'because it is the same medicine' without checking with the prescriber. Same molecule at double the strength is a different dose, not a convenience."
        ]
      },
      {
        "heading": "Getting to Ayush Medico without a wasted trip",
        "body": [
          "Ayush Medico sits in Kurla West, on the station side of the suburb, and handles enquiries by phone and WhatsApp as well as at the counter. Send the prescription photo first and we will confirm stock, price and, if you are within 4 km, delivery.",
          "If you are coming in person from the station side, call before you set out during peak hours and we will tell you whether the item is on the shelf."
        ]
      },
      {
        "heading": "Buying for a parent or a child",
        "body": [
          "When you are buying for someone else, carry three things: their age, their weight if it is a child, and a list of anything else they take. A pharmacist cannot check for overlap or confirm a paediatric dose without them.",
          "If the patient is elderly and takes four or five regular medicines, ask for the whole list to be checked in one visit rather than buying one item at a time across the month. Duplication is easier to spot when the whole picture is on the counter."
        ]
      },
      {
        "heading": "What to avoid near a busy junction",
        "body": [
          "Two habits cause most trouble around a crowded station area. The first is buying a prescription medicine from a shop that does not ask for the prescription. The second is accepting a strip with no bill and no batch number because the queue is long.",
          "Neither is worth the five minutes saved. A licensed chemist who refuses both is not being difficult; that is the standard the licence requires."
        ]
      }
    ]
  },
  {
    "slug": "reading-prescription-abbreviations",
    "title": "Reading Your Prescription: What the Abbreviations Stand For",
    "h1": "Reading Your Prescription: What the Abbreviations Actually Stand For",
    "excerpt": "OD, BD, TDS, HS, SOS, 1-0-1 — the shorthand on an Indian prescription is a shared convention, not a secret code. Here is how to read it.",
    "published": "2026-11-11",
    "readingMinutes": 4,
    "sections": [
      {
        "heading": "The symbols at the top",
        "body": [
          "A prescription usually opens with Rx, from the Latin recipe, meaning 'take'. Below it come the medicine names, then the directions, then the prescriber's signature, registration number and date. If the date or the registration number is missing, the prescription is not complete.",
          "The patient's name and age matter too. A paediatric dose written without an age is exactly the kind of prescription a pharmacist should query before dispensing."
        ]
      },
      {
        "heading": "Frequency: the Latin leftovers",
        "body": [
          "Most of the shorthand on an Indian prescription comes from Latin, which is why it looks strange until you know the pattern. OD means once a day, BD twice a day, TDS three times a day, QDS four times a day. HS means at bedtime, and SOS means only if needed.",
          "These are frequency instructions written by your doctor. They are not something to adjust yourself, and they are not interchangeable. If a prescription says BD and you have been taking it once, that is a question for the prescriber, not a decision to make quietly."
        ],
        "bullets": [
          "OD — once a day",
          "BD — twice a day",
          "TDS — three times a day",
          "QDS — four times a day",
          "HS — at bedtime",
          "SOS — only when required",
          "STAT — to be given immediately"
        ]
      },
      {
        "heading": "The 1-0-1 pattern",
        "body": [
          "Instead of letters, many doctors write a row of numbers: 1-0-1 means one in the morning, none at midday, one at night. The positions follow morning, afternoon, night. A dash is a skipped dose.",
          "This format is compact and easy to misread, especially with three positions. Read it back to the pharmacist before you leave the counter: 'morning and night, nothing in the afternoon, correct?' A five-second confirmation prevents a month of the wrong schedule."
        ]
      },
      {
        "heading": "AC, PC and the food instructions",
        "body": [
          "AC means before food and PC means after food, from the Latin ante cibum and post cibum. Some medicines are marked before food because absorption changes, others after food because they irritate the stomach. This is not a suggestion to rearrange.",
          "If the prescription says before food and you have already eaten, do not double up later. Ask the pharmacist what to do about the missed timing."
        ]
      },
      {
        "heading": "Duration and form",
        "body": [
          "'x 5 days' or 'x 1 month' is the course length. A course length is not a target to beat: stopping early because you feel better is one of the most common reasons a treatment fails, and continuing a course longer than written is its own problem.",
          "The form is usually abbreviated too. Tab for tablet, cap for capsule, syr for syrup, inj for injection, oint for ointment, and drops for eye or ear preparations. Eye and ear drops look identical in print and are not interchangeable, so check the label wording at the counter."
        ]
      },
      {
        "heading": "When the handwriting defeats you",
        "body": [
          "Ask. A pharmacist reads prescriptions all day and will tell you what the letters say. What a pharmacist should not do is guess at a strength or a frequency and dispense anyway.",
          "At Ayush Medico we will call the prescriber or ask you to, rather than fill in a blank ourselves. If a prescription is illegible, the safe outcome is a phone call, not a best guess."
        ]
      },
      {
        "heading": "Repeat prescriptions need a date and a signature too",
        "body": [
          "A line saying 'continue same' is not a prescription on its own. For a repeat, the prescriber should still date it and sign it, and for a Schedule H medicine, note how long the course continues.",
          "Many clinics issue a monthly slip for exactly this reason. If you are asked to bring the old strip and a fresh slip, that is normal practice in Maharashtra, not a shop being awkward."
        ]
      },
      {
        "heading": "Keep the paper somewhere it survives",
        "body": [
          "Photograph the prescription the day you receive it, front and back, and keep the image in a folder you will find again. Paper prescriptions fade, get left in a bag, or go through a wash cycle.",
          "Keep the original too, at least until the course ends. A photograph is a convenience for ordering; the original is what the law asks for when a pharmacist dispenses."
        ]
      }
    ]
  },
  {
    "slug": "generic-vs-branded-medicines",
    "title": "Generic vs Branded Medicines: What the Difference Actually Means",
    "h1": "Generic vs Branded Medicines: What the Difference Actually Means",
    "excerpt": "Same salt, different price tag, and a few cases where switching brands is a bad idea. A plain explanation of how generic medicines work in India.",
    "published": "2026-11-11",
    "readingMinutes": 4,
    "sections": [
      {
        "heading": "The medicine is the salt, not the name on the box",
        "body": [
          "Every medicine has two names. The generic name is the molecule itself, for example paracetamol or metformin. The brand name is what one manufacturer calls its version of that molecule. Ten companies can sell the same molecule under ten different names, in ten different boxes, at ten different prices.",
          "When a prescription is written by brand, the prescriber has chosen one manufacturer's version. When it is written by molecule, any approved version of that molecule should be equivalent, provided the strength and the dosage form match."
        ]
      },
      {
        "heading": "Why the price gap is so wide",
        "body": [
          "A brand pays for decades of marketing, a sales force visiting doctors, and packaging that has become familiar. A generic manufacturer sells largely on price and rarely advertises. The molecule may cost the same to produce in both cases.",
          "That does not automatically make the cheaper box the better buy, and it does not make the expensive one better either. What matters is that the product is approved, that it is stored properly, and that you stay on the same product where consistency is clinically important."
        ]
      },
      {
        "heading": "What approval actually requires in India",
        "body": [
          "Medicines sold in India need approval from the Central Drugs Standard Control Organisation, with manufacturing inspected against good manufacturing practice standards by central or state authorities. A licensed pharmacy buys through authorised distributors so that every strip can be traced back to a batch.",
          "That traceability is the practical value of buying from a chemist rather than an unverified online seller. Batch numbers and expiry dates on the bill are not bureaucracy; they are how a recall reaches you."
        ]
      },
      {
        "heading": "When not to switch brands casually",
        "body": [
          "For most common medicines, a switch between approved versions of the same salt at the same strength is routine. For some categories it is not, because small differences in formulation or absorption matter more than the price difference.",
          "This is a conversation for your doctor, not a decision at the counter. If you have been stable on a particular brand for a long time, ask before changing it, especially for medicines taken for heart conditions, epilepsy, thyroid problems, transplant care, or insulin and inhalers, where consistency is part of the treatment."
        ],
        "bullets": [
          "Ask whether the prescription is written by brand or by molecule",
          "Never change the strength to match what is in stock",
          "Insulin, inhalers and narrow-margin medicines deserve the same brand",
          "Keep the same product for a stable long-term medicine unless your doctor agrees"
        ]
      },
      {
        "heading": "What a pharmacist may and may not do",
        "body": [
          "A pharmacist can tell you that a generic version of the same molecule exists, what it costs, and whether it is in stock. A pharmacist cannot substitute a different molecule, a different strength, or a different dosage form on their own authority, and cannot dispense a prescription medicine without a valid prescription.",
          "If the prescribed brand is unavailable, the honest options are to arrange it, to ask your doctor about an alternative, or to wait. Discounts offered in place of that conversation are worth treating with suspicion."
        ]
      },
      {
        "heading": "Buying by molecule without losing safety",
        "body": [
          "If your doctor is comfortable with a generic, the safest habit is to keep one product rather than shopping by whichever box is cheapest that week. Note the brand and strength you are using, and tell the pharmacy each time so the record stays consistent.",
          "At Ayush Medico we will tell you both names for anything you buy, and we will not swap a brand without your prescriber's agreement."
        ]
      },
      {
        "heading": "How to read the label without a pharmacology degree",
        "body": [
          "Look for three things on any box: the molecule name, the strength in milligrams, and the dosage form. A 500 mg tablet and a 650 mg tablet of the same molecule are not interchangeable at the counter, and neither is a syrup and a tablet.",
          "Then look at the batch number and expiry date. Those two lines are what make a strip traceable, and they are the first things a pharmacist checks when a patient reports a problem."
        ]
      },
      {
        "heading": "Cheap is not a quality claim, and expensive is not one either",
        "body": [
          "A low price and a high price are both marketing decisions as much as manufacturing ones. The useful questions are whether the product is approved, whether it was stored correctly, and whether the pack is genuine.",
          "Buying from a licensed pharmacy with a proper bill is the practical way to answer all three, which is what the extra rupee at the counter is actually paying for."
        ]
      }
    ]
  },
  {
    "slug": "monthly-medicine-refills-for-seniors",
    "title": "Monthly Medicine Refills for Seniors in Kurla West: A Simple System",
    "h1": "A Simple Monthly Refill System for Seniors in Kurla West",
    "excerpt": "Most missed doses in long-term treatment start with an empty strip, not forgetfulness. A five-step refill routine that families can run from anywhere.",
    "published": "2026-11-11",
    "readingMinutes": 4,
    "sections": [
      {
        "heading": "Start with one list, not six boxes",
        "body": [
          "Long-term treatment usually means several medicines, often from different specialists, sometimes with one stopped and another started without the old strip being thrown away. The first useful step is a single written list: medicine name, strength, what it is for, and who prescribed it.",
          "Keep that list with the medicines, photograph it, and share it with the family member who handles refills. When a doctor changes something, the list changes the same day. A list that is three months old is worse than no list, because it looks authoritative."
        ]
      },
      {
        "heading": "Refill on a date, not when the strip runs out",
        "body": [
          "The common failure is discovering an empty strip at 9 pm on a Sunday. Set the refill date five to seven days before the last tablet is due, which leaves room for a stock-out, a distributor gap, or a doctor's appointment.",
          "Pick one fixed day a month, ideally a quiet weekday morning, and treat it as the refill day for everything. A single recurring date is far easier to keep than six separate calculations."
        ]
      },
      {
        "heading": "Keep a week in reserve, not a year",
        "body": [
          "A small buffer of about a week protects against a delayed supply. A cupboard full of surplus does the opposite: medicines expire quietly, and an expired strip looks exactly like a usable one until you read the date.",
          "Check expiry dates at every refill, and remove anything expired from the box immediately. Do not keep expired medicines 'for emergencies'. Dispose of them properly rather than flushing them."
        ]
      },
      {
        "heading": "Send the prescription photo before the visit",
        "body": [
          "For an elderly parent, one trip to a pharmacy is a real outing. Messaging a photograph of the prescription ahead of time turns it into a confirmation: we check stock, tell you the amount, and have the bag ready.",
          "If the patient is within 4 km of Kurla West, delivery to the building saves the trip entirely. Tell us the floor and whether there is a lift, because the last fifty metres is where these deliveries actually succeed or fail."
        ]
      },
      {
        "heading": "The questions worth asking once a year",
        "body": [
          "Once a year, or whenever a new doctor is involved, it is worth asking whether every medicine on the list is still needed, whether any dose has drifted, and whether two prescriptions overlap on the same molecule.",
          "Those are questions for the prescriber, but a pharmacy can help by pointing out duplication on the list and by keeping a clean dispensing record. It is one of the few genuinely useful things a neighbourhood chemist can do beyond selling the strip."
        ]
      },
      {
        "heading": "A routine that survives a bad week",
        "body": [
          "Systems fail during weddings, hospital admissions and travel. If the person is going to be away, refill before they leave rather than after. If someone else is managing the house for a fortnight, hand them the list and the refill date, not a verbal summary.",
          "None of this is medical advice. It is logistics, and logistics is where most long-term treatment quietly goes wrong."
        ]
      },
      {
        "heading": "Mumbai humidity and the medicine box",
        "body": [
          "Between June and September, a kitchen shelf becomes a bad place for tablets. Humidity softens strips, and a bathroom cabinet is worse. Keep medicines in a dry room, in the original strip and box, away from sunlight.",
          "Only items labelled for refrigeration belong in the fridge, and never in the freezer or the door shelf where the temperature swings each time it opens."
        ]
      },
      {
        "heading": "Who to call, and when",
        "body": [
          "For a refill, a stock question or a delivery in Kurla West, a message with the prescription photo is enough. For anything about the dose, a side effect or a missed tablet, call the prescriber.",
          "It is worth saving both numbers on the phone of whoever manages the medicines. Most refill failures are not stock problems; they are the wrong person discovering an empty strip at the wrong time."
        ]
      }
    ]
  },
  {
    "slug": "how-to-choose-a-reliable-pharmacy-in-kurla-west",
    "title": "How to Choose a Reliable Pharmacy in Kurla West",
    "h1": "How to Choose a Reliable Pharmacy in Kurla West",
    "excerpt": "Licences, batch numbers, bills and cold-chain handling — the five checks that separate a dependable chemist from a risky one, explained for Mumbai families.",
    "published": "2026-11-11",
    "readingMinutes": 5,
    "sections": [
      {
        "heading": "Start with the licence, not the discount",
        "body": [
          "Every retail pharmacy in Maharashtra must display its FDA drug licence — a Form 20 for retail sale and a Form 21 for wholesale — along with the name of the registered pharmacist on duty. At Ayush Medico these are MH-MZ4-518856 and MH-MZ4-518857.",
          "A pharmacy that cannot show a licence, or whose pharmacist is never present, is not a place to buy prescription medicine. The licence is not paperwork; it is the reason a pharmacist is legally responsible for what is handed to you."
        ]
      },
      {
        "heading": "Every bill should carry batch number and expiry",
        "body": [
          "A printed bill with the batch number and expiry date is your only practical protection. It lets you check the medicine's remaining shelf life at the counter, and it is what a manufacturer or distributor needs if a product has to be traced.",
          "If a chemist writes the amount on a scrap of paper, you have no record of which batch you were sold. Ask for the proper bill, every time, even for a single strip."
        ],
        "bullets": [
          "Batch number printed on the bill",
          "Expiry date with a comfortable margin, not a month away",
          "Correct medicine name, strength and pack size",
          "GST invoice for clinic or business purchases"
        ]
      },
      {
        "heading": "Cold-chain items need visible handling",
        "body": [
          "Insulin, some vaccines and certain drops have to stay refrigerated from distributor to counter. A reliable pharmacy keeps them in a working refrigerator, not on the shelf beside the cash box, and packs them in an insulated bag for the trip home.",
          "Ask how the item is stored before you buy it, and put it in your fridge as soon as you get back — not in the freezer."
        ]
      },
      {
        "heading": "A good chemist answers questions honestly",
        "body": [
          "The most useful signal is behaviour under pressure. A dependable pharmacy says 'not available, I can arrange it tomorrow' rather than 'come back later' five times. It refuses to sell a prescription medicine without a prescription, even to a regular customer.",
          "It also knows its limits. Questions about dosage, substitutes or stopping a course belong to your doctor, and a pharmacy that respects that boundary is protecting you."
        ]
      },
      {
        "heading": "Locations matter less than reachability",
        "body": [
          "In Kurla West you are rarely far from a chemist, so choose one you can actually reach. A pharmacy near Kurla station that answers its phone and keeps stock steady will save more time over a year than one that is marginally closer but never has your medicine."
        ]
      }
    ]
  },
  {
    "slug": "understanding-medicine-availability",
    "title": "Why a Medicine Is Sometimes Unavailable (and What to Do)",
    "h1": "Understanding Medicine Availability in Mumbai",
    "excerpt": "Short supply, brand discontinuation, batch recalls and distributor gaps all look the same at the counter. Here is how medicine availability actually works.",
    "published": "2026-11-11",
    "readingMinutes": 4,
    "sections": [
      {
        "heading": "Four different reasons a medicine is missing",
        "body": [
          "Not available at the counter can mean very different things. It may be a temporary stock-out at the shop, a wider shortage at the distributor, a manufacturer that has paused production of a brand, or a recall of a specific batch.",
          "Each has a different fix, which is why an honest timeline from your pharmacist is more useful than a vague assurance."
        ],
        "bullets": [
          "Shop stock-out — usually resolved in a day",
          "Distributor gap — a few days, depending on the route",
          "Brand discontinued — your doctor may need to choose an equivalent",
          "Batch recall — the batch must not be dispensed at all"
        ]
      },
      {
        "heading": "Salt name beats brand name",
        "body": [
          "Medicines are approved by their composition, not by the brand printed on the box. Knowing the salt name and strength — for example paracetamol 500 mg rather than just a brand — lets a pharmacy search equivalents when your usual box is not on the shelf.",
          "Substituting a medicine is a clinical decision, not a shop decision. Share the alternative with your prescriber before you switch, particularly for anything taken daily."
        ]
      },
      {
        "heading": "What a pharmacy can and cannot confirm by phone",
        "body": [
          "A pharmacist can check the shelf, the batch and the price while you are on the line. What they cannot do is guarantee that a scheduled medicine will be dispensed before seeing a valid prescription.",
          "Enquiries get answered fastest when you send the salt name or a photo of the strip, the quantity you need, and your pincode if delivery is involved."
        ]
      },
      {
        "heading": "Plan repeat prescriptions around the gap",
        "body": [
          "If you take a medicine every day, order it a few days before the last strip runs out rather than on the final evening. That buffer absorbs the ordinary one-day gaps without turning them into a missed dose.",
          "For long-term medicines, a written list kept on file at your pharmacy turns a monthly scramble into a single message."
        ]
      }
    ]
  },
  {
    "slug": "how-to-store-medicines-safely-at-home",
    "title": "How to Store Medicines Safely at Home in Mumbai",
    "h1": "Storing Medicines Safely at Home",
    "excerpt": "Mumbai humidity ruins more medicines than people realise. Where to keep them, what belongs in the fridge, and when to throw a strip away.",
    "published": "2026-11-11",
    "readingMinutes": 4,
    "sections": [
      {
        "heading": "Heat and humidity are the real enemies",
        "body": [
          "Most tablets are labelled to be stored below 30°C in dry conditions. A Mumbai kitchen shelf in summer, or a bathroom cabinet that steams up every morning, can push past that routinely.",
          "The safest spot in most homes is a closed cupboard in the coolest room — away from the stove, the window and the bathroom, and high enough that children cannot reach it."
        ],
        "bullets": [
          "Keep the original strip and box, so strength and expiry stay readable",
          "Keep the desiccant sachet inside the bottle, not removed",
          "Store liquids upright; syrups leak and pills absorb the spill",
          "Never move tablets into an unlabelled container"
        ]
      },
      {
        "heading": "What actually needs the fridge",
        "body": [
          "Only items labelled for refrigeration — typically insulin, some vaccines and certain eye preparations — belong in the fridge. Put them in the main compartment, never the freezer, and never against the back wall where they can freeze.",
          "Everything else in the fridge picks up moisture. Tablets that look powdery, stuck or discoloured after refrigeration should be discarded."
        ]
      },
      {
        "heading": "When to throw a medicine away",
        "body": [
          "The expiry date is a hard stop. Beyond that, a change in appearance is a warning: discoloured tablets, brittle strips, a syrup that has separated, or a cream that smells different.",
          "Expired medicines should not be flushed down the drain. Hand them to a pharmacy that accepts returns for safe disposal, or follow your local municipal guidance."
        ]
      },
      {
        "heading": "Keep one list, keep it accurate",
        "body": [
          "A written list of current medicines, strengths and the prescriber's name is useful in an emergency and at every appointment. Update it when a course ends rather than letting it become a museum of past prescriptions."
        ]
      }
    ]
  },
  {
    "slug": "prescription-rules-at-a-pharmacy",
    "title": "Why Pharmacies Ask for a Prescription",
    "h1": "Understanding Prescription Requirements",
    "excerpt": "What makes a prescription valid, why a pharmacist can refuse to dispense, and what to do when you have lost the original.",
    "published": "2026-11-11",
    "readingMinutes": 4,
    "sections": [
      {
        "heading": "What a valid prescription needs",
        "body": [
          "A prescription is a legal document, not a note. For scheduled medicines it should carry the patient's name, the medicine with strength and dosage form, the prescriber's name and registration number, the date, and the prescriber's signature.",
          "Prescriptions also have a shelf life. A prescription written months ago for an acute problem may no longer be appropriate, and pharmacies are expected to apply judgement rather than dispense indefinitely."
        ]
      },
      {
        "heading": "Why a pharmacist may say no",
        "body": [
          "Pharmacists refuse for specific reasons: no valid prescription, an illegible or altered document, an expired date, a dose that looks unsafe, or signs that the same prescription has already been dispensed elsewhere.",
          "This is not obstruction. Dispensing a scheduled medicine without a valid prescription is an offence, and the pharmacist on duty is personally accountable."
        ]
      },
      {
        "heading": "If you have lost the prescription",
        "body": [
          "Ask your doctor for a fresh prescription or a digital copy with the registration number visible. A photograph of an old prescription is acceptable only when the details are legible and the prescription is still valid.",
          "For repeat medication, many prescribers will issue a repeat for a stable, long-term medicine. Ask them directly; do not ask the pharmacy to work around the rule."
        ]
      },
      {
        "heading": "Online and WhatsApp orders",
        "body": [
          "Sending a prescription on WhatsApp does not change the rules. The pharmacist still reviews it before packing, and orders for scheduled medicines are held until that review is done.",
          "Clear photos help: full page, good light, no fingers over the dosage. If something is unclear, expect a call rather than a guess."
        ]
      }
    ]
  },
  {
    "slug": "how-to-contact-ayush-medico",
    "title": "How to Contact Ayush Medico for a Medicine Enquiry",
    "h1": "Contacting Ayush Medico: What to Send, and What to Expect",
    "excerpt": "Call, WhatsApp or walk in. A short guide to getting a fast, accurate answer about stock, price and delivery in Kurla West.",
    "published": "2026-11-11",
    "readingMinutes": 3,
    "sections": [
      {
        "heading": "Three ways to reach the shop",
        "body": [
          "Phone is fastest for a quick stock check. WhatsApp is best when you need to send a prescription or a photo of the strip. Walking in is simplest if you already know what you need and want it in hand.",
          "All three reach the same counter, staffed during shop hours from 8 AM to 10 PM, seven days a week."
        ],
        "bullets": [
          "Call +91 98332 73838 during shop hours",
          "WhatsApp the same number with a prescription photo",
          "Visit Halav Pool Road, Kurla West, near Rolex Hotel"
        ]
      },
      {
        "heading": "What to include in the message",
        "body": [
          "For a stock enquiry: medicine name or salt, strength, quantity, and your pincode if you want delivery. For a prescription order: a clear photo of the whole page.",
          "If you are asking about a chronic medicine, mention that it is a monthly refill. It helps us check the batch and keep it aside."
        ]
      },
      {
        "heading": "Delivery expectations",
        "body": [
          "Home delivery covers roughly a 4 km radius around Kurla West — Kurla East, Chunabhatti, Sion, Kalina, Vidyavihar, Saki Naka, Ghatkopar and the western edge of Chembur.",
          "Orders outside that radius are not delivered; you can collect them from the counter instead. The checkout tells you straight away whether your pincode is covered."
        ]
      },
      {
        "heading": "Questions we will pass back to your doctor",
        "body": [
          "Whether to continue a course, whether to switch brands, or what to do about a side effect are clinical questions. We will tell you what the label says and what is in stock, and send the clinical decision to the prescriber."
        ]
      }
    ]
  }
];
