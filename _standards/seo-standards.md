# SEO Standards: Every Client Site

Use with design-standards.md and the Website Brief Reference. Covers classic search (SEO), answer engines like Google's AI answers and voice assistants (AEO), and AI chat tools that summarize and cite sites (GEO). The same rule runs through all three: write clear, specific, true answers in the client's words, and mark them up so machines can read them.

Every fact used for SEO comes from the brief. Never invent keywords disguised as claims ("#1 groomer in San Diego"), review counts, ratings or awards.

---

## 1. Titles

- One unique `<title>` per page or view. 30–60 characters.
- Pattern: `Primary topic + place | Business name`. Home: `What they do in Area | Business name`.
  - Home: `Mobile Dog Grooming in North County SD | Salty Paws`
  - Services: `Grooming Services & Prices | Salty Paws`
- Use words a customer would type, from the brief's own wording. No keyword stuffing, no ALL CAPS.

## 2. Meta descriptions

- One unique description per page or view. 70–160 characters.
- Says what the page answers, where, and the next step. Written as a sentence, not a keyword list.
  - `Mobile dog and cat grooming in Carlsbad, Encinitas and Del Mar. One groomer, one pet, right in your driveway. Book online.`
- In the single-file draft, each view carries `data-seo-title` and `data-description`; the script updates `<title>`, `meta[name=description]` and `og:` tags when the view changes. At go-live each becomes a real page with its own tags.

## 3. Headings

- Exactly one `h1` per page or view, stating what the page is about in plain words, including the service and place where natural.
- `h2` for each section, `h3` inside sections. Don't skip levels for styling; style with CSS instead (a visually hidden `h2` is fine where a section has no visible title).
- Headings that are questions (FAQ, "Do I need to be home?") are good for AEO.

## 4. Content and copy

- The first paragraph on each page answers "what is this, for whom, where" in 1–2 sentences. Answer engines lift this paragraph.
- Use the client's exact service names consistently everywhere (page, schema, buttons).
- Name the towns or areas served in body text, not only in a list or map.
- Specifics beat adjectives: prices, durations, service days, credentials, years, policies, all from the brief.
- Every service gets at least a one-line description; services the client cares most about get a short paragraph.

## 5. FAQ format (AEO)

- Use the client's real FAQs. Each question is a heading or `<summary>`, the answer is 1–3 plain sentences that start with the direct answer ("Yes." / "Most grooms take 60–90 minutes.").
- Answers are visible on the page (not hidden behind JavaScript after load). `<details>` is fine.
- Add `FAQPage` schema with every question and answer, text matching the page word for word.
- Never invent FAQs. If the client gave none, leave the FAQ page out.

## 6. Structured data (schema.org JSON-LD)

Required on every site, built only from brief facts:

| Type | When | Must include |
|---|---|---|
| `LocalBusiness` or the closest subtype (e.g. `Restaurant`, `Dentist`, `HomeAndConstructionBusiness`, `BeautySalon`, `ProfessionalService`) | Always | name, description, telephone, email, url (at go-live), address per the address rule (city only = `addressLocality` + `addressRegion`, no street), `areaServed` (towns) for service-area businesses, `openingHoursSpecification`, `sameAs` (social links), `priceRange` or `makesOffer` only if prices are shown, `logo` and `image` once real files exist |
| `FAQPage` | When the site has FAQs | Every question and answer, matching the page |
| `Service` or `Offer` entries | When services are listed | Service name, description, starting price if shown |
| `BreadcrumbList` | At go-live (multi-page) | Page hierarchy |
| `Person` | Optional, when team bios are featured | name, jobTitle, from the brief only |

Never add `aggregateRating` or `review` schema unless the client supplies the real rating source; Google penalizes self-made rating markup.

## 7. Local SEO

- Name, phone and city written identically everywhere on the site, in schema, and on the Google Business Profile (NAP consistency).
- Click-to-call phone link in the header or footer on every page.
- Hours on the site match the brief exactly and match the Business Profile.
- Service-area businesses: a section naming every town served; at go-live, one page per main town only if the client approves and there is real, specific content for each (no copy-paste town pages).
- Embed or link the Google map at go-live.

## 8. Images

- Descriptive alt text on every image saying what's in it, with the service or place when natural ("Groomer trimming a small white dog"). Never stuff keywords; never name a real person on a stock photo.
- Descriptive file names at go-live (`full-groom-doodle-after.webp`, not `IMG_4827.jpg`).
- Compressed, right-sized, `srcset` for large images, lazy-load below the fold.
- An `og:image` (1200px wide) for link previews.

## 9. Links and structure

- Every page reachable in two taps from the home page. Header has 4–6 links; footer lists every page.
- Link text says where it goes ("See grooming prices"), never "click here".
- Internal links between related pages (services → pricing → booking).

## 10. GEO (AI chat tools)

- A short, factual "about" summary near the top of the About page: who, what, where, since when, what makes them different, in plain sentences an AI can quote.
- Consistent facts everywhere (an AI that sees two different years of experience trusts neither). Flag contradictions in the brief to the client.
- Credentials, policies and guarantees stated plainly as text, not only in images.

## 11. Technical

- `<html lang="en">`, viewport tag, HTTPS (automatic on GitHub Pages and GHL).
- Fast on a phone: one CSS file inline, no heavy libraries, fonts limited to the weights used.
- No sideways scroll, readable without zoom, tap targets ≥ 44px.
- Drafts: `noindex, nofollow`. Live sites: remove noindex.

---

## Go-live SEO checklist

Done by Claude at launch:
- [ ] Split the single-file draft into real pages (`/`, `/services/`, `/pricing/`, `/about/`, `/faq/`, `/contact/`, …), each with its own title, description, `h1`, Open Graph tags
- [ ] Remove `noindex`; add `robots.txt` allowing all and pointing to the sitemap
- [ ] `sitemap.xml` listing every page
- [ ] Canonical URL on every page using the client's domain
- [ ] `BreadcrumbList` schema; `url`, `logo` and `image` filled in on the business schema
- [ ] Real booking, social and map links connected; preview toasts and demo booking removed
- [ ] Privacy policy page; SMS consent line on any form that texts customers
- [ ] Descriptive image file names; real client photos in place of samples
- [ ] Re-run QA on the live URL

Done by Cam (Claude drafts the instructions and checks the result):
- [ ] Submit the site and sitemap in Google Search Console (verify the domain)
- [ ] Create or update the client's Google Business Profile: same name, phone, hours, service area, website link, categories, photos
- [ ] Optional: Bing Places and Apple Business Connect with the same details
