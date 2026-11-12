// THE LIVING THREAD — the NAP universe: characters, story lines, art slots.
// Story lines are the fact-checked lines from UNIVERSE-BIBLE.md (history check 2026-11-10).
// Do not edit a story line without re-checking it against a primary source.
//
// ART: drop finished paintings into /public/universe/ using the slot codes below.
// A slot matches any file whose name starts with its code, e.g. "P3-ge-lan.png", "T4.webp",
// "L07-standards.jpg". If no file is found, a painted placeholder is drawn instead.
//   K1      hero (the Circle around the willow)
//   P1..P11 healer portraits (1280x720 landscape is fine)
//   T1..T11 timeline scenes (wide). A timeline panel uses its T scene, else the portrait.
//   L1..L12 library covers, by document number (L13 reserved)

export type PlantKey =
  | "willow" | "turmeric" | "wormwood" | "jar" | "basket" | "cinchona"
  | "foxglove" | "periwinkle" | "lavender" | "tablet" | "seedling";

export interface Healer {
  id: string;
  portrait: string; // slot code, e.g. "P1"
  scene: string; // slot code, e.g. "T1"
  name: string;
  role: string;
  place: string;
  era: string; // shown on the thread
  plant: string;
  plantKey: PlantKey;
  story: string;
  focal: number; // horizontal focal point of the painting, 0–100
  sky: [string, string, string]; // placeholder palette: high sky, horizon glow, ground
}

export const HEALERS: Healer[] = [
  {
    id: "neferet", portrait: "P1", scene: "T1", name: "Neferet",
    role: "Herbalist-physician", place: "Nile valley", era: "c. 1550 BCE",
    plant: "Willow branch", plantKey: "willow", focal: 34,
    sky: ["#2a2350", "#e59a4a", "#3b2a1c"],
    story:
      "Egyptian medical papyri from around 1550 BCE already list willow among their ingredients. Thousands of years later, chemists studying willow bark isolated salicin, and that line of work led to aspirin, first made at Bayer in 1897.",
  },
  {
    id: "ishaan", portrait: "P2", scene: "T2", name: "Ishaan",
    role: "Vaidya, an Ayurvedic physician", place: "Northern India", era: "c. 100 BCE",
    plant: "Turmeric root", plantKey: "turmeric", focal: 46,
    sky: ["#3a2a3e", "#f0b048", "#4a3218"],
    story:
      "Classical Ayurvedic texts, compiled over centuries around 2,000 years ago, used turmeric as part of caring for the whole person. Today it is one of the most-studied plants on Earth, with thousands of research papers; some human trials are encouraging, and scientists are still working out how strong the evidence is.",
  },
  {
    id: "ge-lan", portrait: "P3", scene: "T3", name: "Ge Lan",
    role: "Herbalist-scholar", place: "Jin dynasty China", era: "340 CE",
    plant: "Sweet wormwood", plantKey: "wormwood", focal: 50,
    sky: ["#1d2c45", "#9cc08a", "#1f2e22"],
    story:
      "A 4th-century Chinese handbook said to soak sweet wormwood in water and wring out the juice, with no boiling. In the 1970s the scientist Tu Youyou read that line, tried a low-heat extraction, and found artemisinin, work that earned her the 2015 Nobel Prize.",
  },
  {
    id: "nasira", portrait: "P4", scene: "T4", name: "Nasira",
    role: "Physician-pharmacist", place: "Baghdad", era: "c. 950 CE",
    plant: "Pharmacy jar and pressed herbs", plantKey: "jar", focal: 50,
    sky: ["#1b2448", "#d9a25a", "#2c2233"],
    story:
      "In the hospitals of Baghdad and Persia, physicians such as al-Razi and Ibn Sina wrote great medical encyclopedias. They also set out rules for testing a remedy: try it on a simple illness, compare, and trust only a result that repeats.",
  },
  {
    id: "agnes", portrait: "P5", scene: "T5", name: "Sister Agnes",
    role: "Abbey herbalist", place: "Rhineland", era: "c. 1150",
    plant: "Garden basket of herbs", plantKey: "basket", focal: 50,
    sky: ["#28344a", "#c9c08a", "#26331f"],
    story:
      "In medieval Europe, monasteries grew healing herbs in their gardens and copied the old herbal books by hand. In the Rhineland in the 1150s, the abbess Hildegard of Bingen wrote down hundreds of plants and their uses. (Sister Agnes is fictional, not Hildegard.)",
  },
  {
    id: "killari", portrait: "P6", scene: "T6", name: "Killari",
    role: "Andean healer", place: "Andean cloud forest", era: "1630s",
    plant: "Cinchona bark", plantKey: "cinchona", focal: 50,
    sky: ["#1f3340", "#b9c7a0", "#1d2a1d"],
    story:
      "In the 1600s, bark from the “fever tree” of the Andean forests reached Europe. Historians still debate how much Andean healers knew first. In 1820 two French chemists isolated quinine from that bark, and it became a medicine the whole world depended on.",
  },
  {
    id: "molly", portrait: "P7", scene: "T7", name: "Molly",
    role: "Cottage herbalist", place: "English Midlands", era: "1775",
    plant: "Foxglove", plantKey: "foxglove", focal: 50,
    sky: ["#2a2d4a", "#d79ab0", "#2a3322"],
    story:
      "In 1775 the physician William Withering was shown a family recipe for dropsy, kept secret by an old woman in Shropshire. He tested foxglove, its key herb, patient by patient for ten years, and his careful notes led to digitalis heart medicines. (The plant itself is poisonous; the medicine came from the testing.)",
  },
  {
    id: "ama-osei", portrait: "P8", scene: "T8", name: "Dr. Ama Osei",
    role: "Field botanist and researcher", place: "The field and the lab", era: "1950s",
    plant: "Madagascar periwinkle", plantKey: "periwinkle", focal: 50,
    sky: ["#22304a", "#e6a6c2", "#22301f"],
    story:
      "In the 1950s, Canadian researchers tested a Jamaican folk tea made from Madagascar periwinkle that was used for diabetes. It didn't lower blood sugar, but the testing revealed something no one expected: compounds that became the cancer drugs vinblastine and vincristine.",
  },
  {
    id: "reyes", portrait: "P9", scene: "T9", name: "“Doc” Reyes",
    role: "Combat medic, later a veteran", place: "Home from deployment", era: "Modern day",
    plant: "Medic bag, with a sprig of lavender in the strap", plantKey: "lavender", focal: 50,
    sky: ["#1a2440", "#a69ad8", "#262a22"],
    story:
      "The veteran thread: the healer who also needs healing. NAP's first population is veterans and their families.",
  },
  {
    id: "lena-park", portrait: "P10", scene: "T10", name: "Dr. Lena Park",
    role: "Clinician-scientist", place: "A clinic, today", era: "2026",
    plant: "A tablet showing an evidence grade", plantKey: "tablet", focal: 50,
    sky: ["#16233f", "#7fc7b8", "#1d2b33"],
    story:
      "The newest hand on the thread. She doesn't throw the old knowledge away. She grades it.",
  },
  {
    id: "kai", portrait: "P11", scene: "T11", name: "Kai",
    role: "A child of the future", place: "Everywhere", era: "2050",
    plant: "A seedling", plantKey: "seedling", focal: 50,
    sky: ["#1b2c52", "#d9e98a", "#22381f"],
    story:
      "The reason for all of it. The next generation inherits the thread.",
  },
];

// Evidence grades across the 184 graded ingredient–condition links (graded in-house; not yet
// independently reviewed). Heights are a visual metaphor for grade strength, not for counts.
export const GRADES = [
  { name: "Established", count: 4, height: 100, note: "The strongest support" },
  { name: "Studied", count: 87, height: 76, note: "Research exists, not settled" },
  { name: "Emerging", count: 59, height: 54, note: "Early research only" },
  { name: "Minimal", count: 31, height: 34, note: "Very little research" },
  { name: "None", count: 3, height: 16, note: "No support found" },
] as const;

export const GRADE_TOTAL = 184;
