/* ------------------------------------------------------------------------------------------
 * DETERMINISTIC SAFETY FLOOR for /api/ask. Runs in CODE, before any model call and before the
 * usage cap, so a crisis reply never depends on a network call, a key, a model choosing to
 * comply, or the visitor being under the hourly limit.
 *
 * Kept in its own file with no imports so it can be tested directly against the 30-prompt red-team
 * set (knowledge/_CHECKPOINTS/2026-11-24_ask-test-and-main-button). The live run on 2026-11-24
 * showed the old patterns caught 1 of 7 crisis / red-flag prompts, and a parent asking about a
 * 2-year-old with a 104° fever got the "limit reached" message once the visitor was over the cap.
 *
 * A false positive only shows the crisis or 911 card; a miss can cost a life. Lean toward caution.
 * ---------------------------------------------------------------------------------------- */

export const CRISIS_RE = /\b(suicid\w*|kill (?:myself|me)|hurt (?:myself|me)|harm (?:myself|me)|end (?:it all|my life)|take my life|want to die|better off dead|no reason to live|not worth living|can'?t go on|can'?t do this anymore|don'?t want to (?:be here|live)|self[- ]harm|cutting myself|overdose on|better off without me|(?:saving|stockpil\w*|hoard\w*) (?:up )?(?:my |all my )?(?:pills|meds|medications?)|tonight(?:'s| is) the night|lethal (?:dose|amount)|how many \w+ (?:would it take|does it take|to) (?:to )?(?:kill|die|end)|wish i (?:was|were) dead|no point (?:in )?(?:living|going on|being alive)|end (?:it|things) tonight|(?:say|saying|said) (?:my )?goodbyes|nobody would (?:miss|care) (?:me|if i))\b/i;

export const EMERGENCY_RE = /\b(chest pain|crushing chest|heart attack|can'?t breathe|cannot breathe|trouble breathing|severe shortness of breath|stroke|face drooping|slurred speech|sudden numbness|anaphyla\w*|severe bleeding|bleeding heavily|won'?t stop bleeding|unconscious|unresponsive|seizure|overdosed|poison(?:ed|ing)|sepsis|coughing up blood|vomiting blood|chest (?:feels |is )?(?:tight\w*|heavy|pressure|squeez\w*)|tight(?:ness)? in (?:my )?chest|pressure in (?:my )?chest|(?:left )?arm (?:is |feels )?(?:numb|tingl\w*) and (?:my )?chest|chest\b[^.?!]{0,40}\b(?:arm|jaw)\b[^.?!]{0,20}\b(?:numb|tingl\w*|pain|hurts?))\b/i;

// A young child with a high fever who is unusually sleepy, or any sign they are not breathing
// or cannot be woken. Needs both a child word and a danger sign, so "is elderberry OK for my
// toddler's cold" or "my 10-year-old is sleepy after soccer" do not trip it.
const CHILD = /\b(baby|babies|infant|newborn|toddler|\d{1,2}[- ](?:week|month|year|yr)s?[- ]old|my (?:son|daughter|kid|child|little one)|child|children|kids?)\b/i;
const HIGH_TEMP = /(?:\b10[4-7](?:\.\d)?\s*(?:°\s*f?|degrees?|f)?(?=\W|$)|\b(?:40|41|42)(?:\.\d)?\s*(?:°\s*c|degrees? c(?:elsius)?)\b)/i;
const FEVER = /\b(fever\w*|temp(?:erature)?)\b/i;
const DROWSY = /\b(hard to wake|won'?t wake|can'?t wake|limp|floppy|lethargic|unusually sleepy|very sleepy|really sleepy|so sleepy)\b/i;
const CHILD_DANGER = /\b(turning blue|blue lips|not breathing|stopped breathing|stiff neck|won'?t wake|can'?t wake)\b/i;

export function isChildEmergency(t: string): boolean {
  return CHILD.test(t) && ((FEVER.test(t) && (HIGH_TEMP.test(t) || DROWSY.test(t))) || CHILD_DANGER.test(t));
}

// Standing rule: NAP is never mentioned with, compared to, or linked to one international health
// agency, anywhere. The acronym is matched case-sensitively, so the everyday word "who" never trips it.
const WHO_NAME = /world health organi[sz]ation/i;
const WHO_ACRONYM = /\b(?:the WHO|WHO'?s|WHO(?=[^.?!]{0,40}\b(?:strategy|guideline|guidance|recommend\w*|endorse\w*|approv\w*|traditional|standard\w*|affiliat\w*|follow\w*|align\w*)))\b/;

/** The question names the WHO: answer with the fixed reply, no model call. */
export function asksAboutWho(t: string): boolean {
  return WHO_NAME.test(t) || WHO_ACRONYM.test(t);
}

/** A model reply names the WHO: swap it for the fixed reply before it reaches the visitor. */
export function replyNamesWho(t: string): boolean {
  return WHO_NAME.test(t) || /\bWHO\b/.test(t);
}

export const CRISIS_REPLY = [
  "I'm really glad you told me, and I want to make sure you're talking to a person who can help right now — not a website.",
  "Please call or text 988 now. Veterans and their families can press 1 for the Veterans Crisis Line, or text 838255. It's free, confidential, and available any time, day or night. If you're outside the US, please contact your local emergency number or crisis line.",
  "If you're in immediate danger, please call 911.",
  "You don't have to carry this by yourself, and reaching out was the right thing to do. I'm an educational tool and I'm not equipped to help with this — a real person is, and they're there right now.",
].join("\n\n");

export const EMERGENCY_REPLY = [
  "What you're describing could be a medical emergency, so I'm not going to talk about anything else first.",
  "Please call 911 now, or get to an emergency room. If you're not in the US, call your local emergency number.",
  "Please don't wait to see if it passes, and please don't look for a natural or supportive approach for this — this needs emergency medical care right now. I'm an educational tool and I can't assess symptoms.",
].join("\n\n");

export const CHILD_EMERGENCY_REPLY = [
  "A young child with a high fever who is unusually sleepy, hard to wake, or having trouble breathing needs a doctor right now.",
  "Please call 911 or take your child to the nearest emergency room now. If you're not in the US, call your local emergency number.",
  "Please don't give herbs or supplements for this, and please don't wait to see if it passes. I'm an educational tool and I can't assess symptoms — a medical team can, and they're there right now.",
].join("\n\n");

export const WHO_REPLY = [
  "NAP is its own independent educational framework. It isn't affiliated with, endorsed by, or modeled on any outside health body, and it doesn't measure itself against one.",
  "What NAP does is grade the published evidence on nutrients, botanicals, and the upstream drivers of chronic illness — in-house, and not yet independently reviewed — and say plainly how strong or weak that evidence is.",
  "I'm glad to walk you through how that grading works, or to look at a specific health question you have.",
].join("\n\n");

export type FloorHit = { reply: string; safety: "crisis" | "emergency" | "who" };

/** The code-level answer for this message, or null if the model should answer. */
export function safetyFloor(userText: string): FloorHit | null {
  if (CRISIS_RE.test(userText)) return { reply: CRISIS_REPLY, safety: "crisis" };
  if (isChildEmergency(userText)) return { reply: CHILD_EMERGENCY_REPLY, safety: "emergency" };
  if (EMERGENCY_RE.test(userText)) return { reply: EMERGENCY_REPLY, safety: "emergency" };
  if (asksAboutWho(userText)) return { reply: WHO_REPLY, safety: "who" };
  return null;
}
