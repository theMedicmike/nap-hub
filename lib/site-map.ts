// One map of the site, shared by the top menu, the phone menu and the footer.
// href: null = page not built yet (shown quietly as "soon", never a dead link).
export type NavItem = { label: string; href: string | null; note: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Learn",
    items: [
      { label: "Traditions", href: "/traditions", note: "The world's healing systems and how they began" },
      { label: "The framework", href: "/framework", note: "The twelve founding documents" },
      { label: "At a glance", href: "/at-a-glance", note: "The whole framework on one page" },
    ],
  },
  {
    label: "Evidence",
    items: [
      { label: "The database", href: "/atlas/brain", note: "Every graded ingredient, side by side with history" },
      { label: "How we grade", href: null, note: "What each grade means and how it is decided" },
    ],
  },
  {
    label: "About",
    items: [
      { label: "Where it stands", href: "/where-it-stands", note: "What exists, what doesn't, what comes next" },
      { label: "Founders", href: "/founders", note: "The people building it" },
      { label: "Who governs NAP", href: null, note: "Governance, funding and conflicts of interest" },
      { label: "Contact", href: null, note: "Reach the team" },
    ],
  },
];

export const LEGAL: NavItem[] = [
  { label: "Privacy", href: null, note: "" },
  { label: "Accessibility", href: null, note: "" },
  { label: "Changelog", href: null, note: "" },
];
