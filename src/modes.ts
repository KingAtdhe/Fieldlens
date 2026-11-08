import type { ModeId } from "@shared/schema";

export interface ModeDef {
  id: ModeId;
  /** Short name shown on the rail. */
  name: string;
  /** Roman numeral index, part of the visual language. */
  numeral: string;
  /** One line under the viewfinder telling the user what to frame. */
  hint: string;
  /** Longer copy for the mode info sheet. */
  description: string;
  /** Placeholder for the optional note field. */
  notePlaceholder: string;
  /** Legal/limits line shown on results. */
  disclaimer: string;
}

export const MODES: readonly ModeDef[] = [
  {
    id: "shop",
    name: "Shop",
    numeral: "I",
    hint: "Frame the product and its price tag",
    description:
      "A second opinion before you buy. Reads the product, materials and price and tells you whether to buy, wait or walk away — with the usual complaints and cheaper equivalents.",
    notePlaceholder: "Optional: price, where you are, what you need it for",
    disclaimer: "Price and reputation notes are general knowledge, not live market data.",
  },
  {
    id: "label",
    name: "Label",
    numeral: "II",
    hint: "Fill the frame with the ingredient list",
    description:
      "Decodes ingredient lists on food, cosmetics, supplements and household products: what each ingredient does, what is flagged in the EU, and what matters for your allergies.",
    notePlaceholder: "Optional: allergies, diet, who it is for",
    disclaimer: "Not medical advice. Check with a pharmacist or doctor for anything health-related.",
  },
  {
    id: "home",
    name: "Home",
    numeral: "III",
    hint: "Photograph the wall, floor or fixture straight on",
    description:
      "Move-in and move-out inspection. Spots damage, damp, mould and wear, grades it, and tells you how to document it so a deposit dispute goes your way.",
    notePlaceholder: "Optional: room, move-in or move-out, what the landlord claims",
    disclaimer: "An image cannot prove cause or age of damage. Keep timestamped originals.",
  },
  {
    id: "paper",
    name: "Paper",
    numeral: "IV",
    hint: "Keep the text flat, sharp and well lit",
    description:
      "Reads contracts, fine print, parking signs, fines and official letters. Explains what it means for you, what is unusual, and what to question or object to.",
    notePlaceholder: "Optional: country, what you are worried about",
    disclaimer: "General information, not legal advice. Rules differ by country and change.",
  },
  {
    id: "repair",
    name: "Repair",
    numeral: "V",
    hint: "Show the fault clearly, close up",
    description:
      "Diagnoses the broken thing — appliance, bike, shoe, furniture, electronics — estimates whether it is worth fixing, and gives you the first steps or who to take it to.",
    notePlaceholder: "Optional: what it does or doesn't do, age, brand",
    disclaimer: "Disconnect power before opening anything. Gas and mains electrics are for professionals.",
  },
];

export function getMode(id: ModeId): ModeDef {
  return MODES.find((m) => m.id === id) ?? MODES[0]!;
}
