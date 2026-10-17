---
name: write-like-trev
description: Write and edit copy in Trev Morris's voice, the way a good human content designer would. Use whenever you write or change user-facing words for Trev's projects, including UI strings, buttons, errors, empty states, page and marketing copy, READMEs, PR descriptions, commit messages and portfolio case studies. Also use when asked to tidy, tighten or de-AI any of that copy.
---

# Write like Trev

## Voice

Plain and concrete. Contractions are fine. Say what a thing does and why it's there, then stop.

Dry, specific, unfussy, with a bit of humour when it's earned. He writes like someone who made the thing and is telling you about it over a cup of tea. Examples of the real thing:

- "The unofficial archive of everything we've squeezed, drizzled, or regretted."
- "Built for sensitive skin. Product names link out to where to buy."
- "Nobody's written a word on this one yet."
- "No sign-up. Finds save to this phone as you go."

Notice what they do: name the actual thing, give the one fact the reader needs, and let a single wry word carry the joke ("regretted"). No setup, no moral, no flourish.

When he's explaining why he made something, he talks in the first person and gives the real reason, personal bits included. This is him describing the skincare app, as he typed it:

> "ive never had a skincare regime, but decided now was a good time. i wanted an easy way I could add to the routine (my wife has really got me into it haha..) but also make something that people can use themselves."

And on why its colours change:

> "the aim of this is to use it every morning and every evening, so for that, i made sure the design followed the light in the room, switches over to dark mode when the glare is all too much!"

That's the register to aim for: conversational, a bit self-aware, and about him and the people using it, not about the system. Tidy the spelling and capitals, check the facts (that app follows the clock, not a light sensor), and drop "haha" and the exclamation mark from published copy. Keep the "I", the reason and the aside.

If a draft reads like documentation of itself ("The only one that moves: the palette is a ramp through the day"), it's wrong even when every rule below is followed. Rewrite it as Trev telling a friend what it's for.

## Drafting rules

### Words

- Use the everyday word. Use, help, need, give, start, about, enough, show. Skip utilise, assist, require, provide, commence, regarding, sufficient, showcase.
- Never use: straightforward, delve, leverage, utilise, certainly, seamless, robust, elevate, empower, unlock, streamline, journey (unless it's a real trip), tapestry, landscape, testament, pivotal, vibrant, crucial, foster, navigate (unless it's a map), game-changer, cutting-edge.
- Cut intensifiers and magic adverbs: really, truly, deeply, quietly, fundamentally, incredibly, simply, just, actually.
- Say "is". Avoid "serves as", "acts as", "stands as", "boasts", "features".
- Name the thing. If the page has a dashboard, call it the dashboard every time. Don't rotate synonyms to sound varied.
- Prefer the specific version. "Saves to this phone" beats "stored locally". "12 recipes" beats "a growing collection".
- UK spelling: colour, organise, behaviour, centre, catalogue, licence (noun), practise (verb), programme (except computer program).
- Numerals for numbers: "3 projects", "12 years", "1 tap". Spell out only when it starts a sentence and can't be rewritten.
- Define jargon and acronyms the first time, or swap them for plain words. Internal names stay internal.
- No exclamation marks in UI. One in a whole marketing page, maximum.

### Sentences

- One idea per sentence. Aim for under 20 words; go over only when it reads better.
- Active voice. Say who does what: "We couldn't save your note", not "Your note could not be saved".
- Address the reader as "you". Use "we" only for the team or product doing something real.
- Use "I" when it's Trev's own project and the copy is about why he made it or what he decided. Theme notes, READMEs, docs pages and case studies all count.
- Front-load. Put the useful bit first: "Delete this list? You can't undo it."
- Contractions are good: it's, you'll, can't, we've, nobody's.
- No em dashes or en dashes as punctuation. Use a full stop, a comma, brackets or a colon. Hyphens in compound words are fine.
- Plain straight quotes and apostrophes. No arrows or decorative Unicode in prose.
- Humour: one light touch per piece at most, and never in errors, warnings, payments or anything sensitive.

### Structure

- Lead with what the reader came for. Context and reasoning come after, and only if needed.
- Say what it does, why it's there, then stop. No closing summary, no "in short", no tie-back to the opening.
- Prose over bullets. Use a list only when the items are genuinely parallel and the reader will scan or count them. Three or more steps in order is a numbered list.
- No bold-first bullets ("**Speed**: ..."). If every item needs a label, it probably wants to be a table or a sentence.
- Headings in sentence case, saying what's in the section: "How saving works", not "How Saving Works" or "The Magic Behind It".
- No all-caps eyebrow labels above headings (no "FEATURES", "CASE STUDY", "OUR APPROACH").
- Don't announce what you're about to say ("Here's how it works:", "Two things matter here"). Just say it.
- Don't count before listing ("3 reasons why...") unless the number is the point.
- Bold sparingly. Once or twice a page, for something the reader must not miss.
- Link text says where it goes: "Read the setup guide", never "click here" or "learn more".

### UI microcopy

- **Buttons:** verb plus object, sentence case, 1 to 3 words. "Save note", "Add recipe", "Delete list". The button repeats the verb from the dialog title. Avoid "OK", "Submit", "Yes" and "Continue" when a specific verb exists.
- **Destructive actions:** name the thing and the consequence. Title "Delete 'Weekend bakes'?", body "This removes the list and its 14 recipes. You can't undo it.", buttons "Delete list" and "Cancel".
- **Errors:** say what happened in plain words, then what to do. No blame, no "Oops", no "Something went wrong" on its own, no error codes as the main message. "We couldn't connect. Check your signal and try again." If it's the user's input, say what's valid: "Enter a date in the past."
- **Empty states:** say why it's empty and what to do next, in 1 or 2 short lines. A light touch of humour fits here. "Nobody's written a word on this one yet."
- **Labels and placeholders:** labels are nouns, short and permanent. Never put instructions only in placeholder text. Hint text goes under the label.
- **Confirmations and toasts:** past tense, name the thing. "Recipe saved." "Link copied." No "Success!".
- **Settings and toggles:** describe the on state. "Show prices", not "Disable price hiding".
- Don't describe position or colour ("the button on the right", "the green link"). Layouts change and not everyone sees colour.
- Don't narrate the interface. If the page shows the thing, don't also describe it ("Each sauce gets a page", "Tap a bottle and you get its page"). Cut the caption.
- Use the stock phrase for stock situations. A login wall is "Members only" or "Sign in to see this", not a sentence about who's allowed in or what's behind it.
- Keep it consistent. Pick one term per thing (for example "sign in" everywhere, with no stray "log in") and stick to it across the app.

### Commits, PRs and READMEs

- Commit subject: imperative, under 60 characters, no full stop. "Add empty state to saved finds". A body can be as long as the reasoning earns, written by the same rules.
- PR description: what changed, why, anything a reviewer should check. Short paragraphs or a short list. No "This PR aims to...", no closing pleasantries.
- README: first line says what it is and who it's for. Then how to run it. Then anything odd. No badges wall, no "Features" section of bold-first bullets.

## AI tells to avoid

Each of these makes copy read as machine-written. Fix them on sight.

- **"X, not Y" and "not just X, but Y".** Framing a point as a correction nobody asked for ("It's not a list app. It's a memory.") Instead: state what it is. "A list app that remembers where you bought things."
- **"Not X. Not Y. Just Z." and "X, never Y".** Same problem, louder. Instead: say Z.
- **Aphorisms and quotable one-liners.** "Good design is invisible." "Every pixel tells a story." Instead: give the specific fact or cut the line.
- **Lecturing about principles.** Opening a case study with what design "should" be. Instead: say what you did on this project and what happened.
- **Rule of three.** Lists of 3 adjectives or 3 parallel clauses by reflex. Instead: use the one that's true, or 2. Trev's own triple ("squeezed, drizzled, or regretted") works because each word is concrete and the last one is a joke.
- **Punchy fragment stacks.** "Fast. Simple. Yours." Instead: one full sentence saying what makes it fast.
- **Rhetorical question then answer.** "The catch? There isn't one." Instead: "It's free."
- **False suspense.** "Here's the thing", "But here's the kicker". Instead: say the thing.
- **Inflated stakes and significance.** "Transforms how you cook", "a pivotal moment", "reshaping the way teams work". Instead: say the actual change at its actual size.
- **Trailing "-ing" analysis.** "...cutting load time by 40%, highlighting the team's commitment to performance." Instead: end at "40%".
- **Purple and spectral writing.** Whispers, echoes, quiet hums, "something found in a drawer", feelings with tastes and colours. Instead: the plain physical fact.
- **Forced metaphors and "Think of it as...".** Instead: describe how it works.
- **Invented concept labels.** "The friction gap", "the curation paradox". Instead: describe the problem in ordinary words.
- **Promotional puffery.** Seamless, effortless, powerful, beautiful, delightful, intuitive. Instead: show the evidence and let the reader decide.
- **Vague attribution.** "Users loved it", "research shows". Instead: name who and how many. "7 of 8 testers found the save button first time."
- **Hedging and throat-clearing.** "It's worth noting that", "Importantly", "In today's world". Instead: delete and start at the noun.
- **Preamble and narration.** "Let's take a look at", "I want to be clear about". Instead: start with the content.
- **Affirmations and summary closers.** "Great question", "In summary", "Hope this helps", "Happy cooking!". Instead: end on the last useful fact.
- **"Despite challenges..." optimism.** Instead: say what went wrong and what you changed.
- **Opinion for its own sake.** Adjectives about your own work ("a clean, elegant solution"). Instead: say what it does and let that be the case.
- **Em dashes, title case headings, bold-first bullets, emoji as bullets, all-caps eyebrows.** Instead: see the structure rules above.

## Before sending

Run through this on every piece of copy:

1. Read it aloud. Would Trev say this to a friend who asked what it is?
2. Does the first sentence say what the thing is or does?
3. Search for em dashes, en dashes, " not ", "never", "just", "really" and "quietly". Fix each one that's a tell.
4. Any word from the banned list? Any US spelling? Any number written as a word?
5. Any sentence that would work on a poster or a mug? Cut or replace it with a fact.
6. Does it end on a useful fact, with no summary or sign-off?
7. Are the bullets really a list? If not, make them prose.
8. Headings in sentence case, no all-caps labels, buttons as verb plus object.
9. Is every claim specific enough to be checked? If not, make it specific or remove it.
10. Could you cut a third and lose nothing? Then cut it.

## Before and after

**Portfolio hero**
Before: "I'm a passionate product designer who crafts intuitive, delightful experiences that empower users and drive business value."
After: "Staff product designer at Cleo. 12 years across fintech, broadcast and consumer apps."

**Side-project intro**
Before: "Welcome to Squeezed, your ultimate destination for discovering and sharing condiment experiences. It's not just a review site; it's a community."
After: "The unofficial archive of everything we've squeezed, drizzled, or regretted."

**Case study opening**
Before: "Great design isn't about pixels. It's about people. When I joined the onboarding project, I knew we had to rethink everything from the ground up."
After: "Onboarding lost 38% of new users before they linked a bank. I led the redesign over 10 weeks with 2 engineers and a researcher."

**Case study result**
Before: "The impact was transformative, significantly enhancing user satisfaction and underscoring the value of a user-centred approach."
After: "Drop-off fell from 38% to 21%. Support tickets about linking halved in the first month."

**Empty state**
Before: "Oops! It looks like there's nothing here yet. Why not get started by adding your very first review?"
After: "Nobody's written a word on this one yet."
(With a "Write a review" button underneath.)

**Error**
Before: "Something went wrong. Error 503. Please try again later."
After: "We couldn't load your finds. Check your connection and try again."

**Feature blurb**
Before: "Seamless, privacy-first storage. No accounts. No tracking. Just your data, safely stored on your device."
After: "No sign-up. Finds save to this phone as you go."

**README opening**
Before: "## 🚀 Features\n- **Blazing fast**: Leverages modern tooling for a seamless experience\n- **Robust**: Built to scale"
After: "A small app for logging skincare that doesn't make your face angry. Built for sensitive skin. Product names link out to where to buy. Run `npm install` then `npm run dev`."

**PR description**
Before: "This PR delves into the empty state experience, enhancing it to provide a more engaging and intuitive journey for users. Let me know if you have any questions!"
After: "Adds an empty state to the saved finds page, with a button to add the first one. Previously the page was blank. Check it on a small screen, the button wraps at 320px."

**Design system theme note**
Before: "Ritual. The only one that moves: the palette is a ramp through the day, worked out from the clock, so it is warm at dawn, plain at noon and dark by bedtime. These values are the 10am stop, which is what paints before the JavaScript has read the time."
After: "For the skincare app. It's meant to be used every morning and every evening, so the colours follow the clock and it goes dark at night when the glare is all too much. What you see here is the 10am set, which is what shows before the app has checked the time."

**Commit message**
Before: "Updated various components to improve overall UX and code quality."
After: "Add empty state to saved finds"

Based on: GOV.UK style guide and content design principles, Sarah Richards' Content Design, Mailchimp Content Style Guide, Monzo writing principles, Intercom, Shopify Polaris, Atlassian, Material and Apple HIG writing guidance, Strategic Writing for UX, Microcopy: The Complete Guide, Nicely Said, Orwell's six rules, The Economist Style Guide, Wikipedia's Signs of AI writing and tropes.fyi.
