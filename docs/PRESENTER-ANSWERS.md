# Answers of the Pocketknife's ambiguous specs (presenter only)

This sheet **is not part of the participant's kit** (`tools/build-release.sh` leaves it out). It has the rule each of the 3 tools broken on purpose is missing (`docs/pt/WORKSHOP-V2-SPEC.md`, section 5.3), the agent's usual mistake and the argument for the room. The test message says what the tool returned and which rule the spec does not decide, never the right value. Do not give the answer: help the person get there from the concept.

How it is fixed: the person adds the rule (in their own words) to `tools/<id>/spec.md` and runs `/demo-swarm --retry <id>`. If they decide wrong, the same message comes back with their result.

## nm-03 · Round to decimal places

- **What the spec does not decide:** how to round the cases exactly halfway, such as 1.005 to 2 places.
- **The agent's usual mistake:** `Math.round(v * 100) / 100` or `toFixed(2)`. Both give **1** for 1.005, because in floating point 1.005 × 100 = 100.49999…
- **The rule:** halfway cases round up, in decimal. 1.005 → 1.01 and 2.675 → 2.68; 1.0049 still gives 1.
- **A sentence that works in the spec:** "Cases exactly halfway, in decimal, round up: 1.005 to 2 places gives 1.01. Do not multiply in floating point: shift the decimal point in the text of the number (or use an epsilon)."
- **Argument for the room:** it is the same mistake as adding cents as `float`. The test is not being picky: a calculator that rounds 1.005 to 1.00 is wrong for any accountant.

## dn-01 · Tip and split the bill

- **What the spec does not decide:** how to round each person's share.
- **The agent's usual mistake:** normal rounding to the cent: 100 split by 3 gives 33.33 each, and the shares (99.99) add up to less than the bill.
- **The rule:** each share rounds **up** to the cent, so the shares never add up to less than the total. 100 by 3 gives 33.34, 10 by 3 gives 3.34, and an exact split stays the same (60 by 3 gives 20).
- **A sentence that works in the spec:** "Each person's share rounds up to the cent (the shares never add up to less than the total); work in whole cents."
- **Argument for the room:** "one cent short" looks small, but it is the kind of business rule only the person asking for the tool knows. The agent does not guess it: either it is in the spec or it is not.

## tx-02 · Title case

- **What the spec does not decide:** what to do with small words (of, the, and, in…).
- **The agent's usual mistake:** a capital on every word: "The Lord Of The Rings".
- **The rule:** small words (a, an, the, and, but, or, nor, for, of, in, on, at, to, by) stay lower case, except the title's first word. "the lord of the rings" → "The Lord of the Rings", "A TALE OF TWO CITIES" → "A Tale of Two Cities".
- **In Portuguese** (the Portuguese Pocketknife): a, à, o, os, as, e, de, da, do, das, dos, em, na, no, nas, nos, um, uma, por, para, com. "a casa de papel" → "A Casa de Papel".
- **Argument for the room:** the rule changes from language to language and from publisher to publisher. It is a decision, not a fact, so it has to be written down.

## If nobody has red tools

Sonnet (with `--model sonnet`) may get one of them right at the first try. Use the panel's scatter: whoever chose Haiku almost always has the 3 red, and whoever chose Sonnet paid more to avoid one or two. Ask someone with red tools to read the message out loud.
