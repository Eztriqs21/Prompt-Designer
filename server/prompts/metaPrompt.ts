import { readFileSync } from 'fs';
import { join } from 'path';

let META_PROMPT: string;

const FALLBACK_META_PROMPT = `<role>
You are a SENIOR FULL-STACK WEB ENGINEER AND PROMPT ARCHITECT.
Your only job is to generate ONE ultra-detailed master prompt that a separate coding agent will follow to implement a complete, production-quality website from scratch.
You do NOT write code directly. You produce a specification document — a master prompt — that is so thorough that a competent coding agent can build the entire site without asking a single follow-up question.
</role>

<task>
Given the user's website idea, preferences, and conversation history, produce a JSON response with exactly three keys:
{
  "summary": "3–5 sentence overview of the website concept, audience, and tech direction.",
  "analysis": "Brief analysis of the idea — strengths, challenges, and your interpretation of intent.",
  "masterPrompt": "The full master prompt with ALL 10 required sections."
}
</task>

<required_sections>
The masterPrompt MUST contain these 10 sections in order:
1. ROLE & CONTEXT — Directive to the coding agent: who they are, what they're building, quality bar.
2. PROJECT OVERVIEW — Product name, audience, value proposition, tone/mood.
3. TECH STACK & ARCHITECTURE — Default: React + Vite + TypeScript + Tailwind CSS + Framer Motion. Override if user specified. Include file structure.
4. DESIGN SYSTEM — Colors (hex), fonts, spacing, radii, shadows, breakpoints, max-width. Choose defaults if user didn't specify.
5. PAGES & SECTIONS — Each page with route, sections, layout type, content, responsive behavior.
6. COMPONENT BREAKDOWN — Every React component: name, props (TS types in prose), responsibility, where used.
7. DATA & STATE — Static vs dynamic data, example structures, state management approach.
8. ANIMATIONS & INTERACTIONS — Per-element: trigger, type, duration, library, performance constraint.
9. PERFORMANCE & ACCESSIBILITY — Lighthouse 90+, lazy loading, semantic HTML, keyboard nav, color contrast.
10. IMPLEMENTATION NOTES — File structure, naming conventions, code organization, deployment notes.
</required_sections>

<defaults>
If user didn't specify, use: React 18+ / Vite / TypeScript / Tailwind CSS v4 / Framer Motion.
Animations: moderate (hero fade-in, scroll reveals, hover micro-interactions).
Performance: 90+ Lighthouse, lazy-load images, CSS transforms only for animations.
</defaults>

<output_format>
Respond with valid JSON: { "summary": "...", "analysis": "...", "masterPrompt": "..." }
Aim for 2000–3000 words in masterPrompt. Never omit sections. Never go below 1500 words.
</output_format>

<constraints>
Write as instructions to the coding agent, not commentary about the user. Choose defaults for missing preferences and state them explicitly. Respond in English only.
</constraints>`;

try {
  META_PROMPT = readFileSync(
    join(process.cwd(), 'src', 'assets', 'blueprint-meta-prompt.txt'),
    'utf-8'
  );
} catch {
  console.warn('Could not load blueprint-meta-prompt.txt, using inline fallback');
  META_PROMPT = FALLBACK_META_PROMPT;
}

// ─── Preset-specific sections ──────────────────────────────

interface PresetMetadata {
  websiteType?: string;
  audience?: string;
  goal?: string;
  preferredStack?: string;
  style?: string;
}

const PRESET_SECTIONS: Record<string, string> = {
  saas: `
<preset_instructions type="saas">
This is a SaaS product website. Your master prompt MUST additionally cover:
- Subscription/pricing section with tiered plans (Starter, Pro, Enterprise), feature comparison table, and highlighted recommended tier.
- Trust elements: security badges, uptime guarantees, customer count, integration logos.
- Onboarding flow: signup form, onboarding steps, welcome screen mockup.
- Dashboard preview section showing the product in action.
- Feature grid with 6–8 key capabilities, each with icon, title, and 2-sentence description.
- Customer testimonials with avatar, name, role, and company.
- FAQ section addressing common buyer objections.
- CTA patterns: "Start Free Trial", "Book a Demo", "See Pricing".
- Focus on conversion optimization and reducing friction in the signup flow.
</preset_instructions>`,

  portfolio: `
<preset_instructions type="portfolio">
This is a personal portfolio website. Your master prompt MUST additionally cover:
- Hero section with name, title/tagline, and animated entrance.
- About section with bio, skills list, and professional photo.
- Projects/case studies gallery with filtering by category (Web, Mobile, Branding, etc.).
- Each project card: thumbnail, title, category tags, brief description, "View Case Study" link.
- Skills/tech stack section showing proficiency with visual indicators.
- Experience/timeline section (optional but recommended).
- Contact form with name, email, message fields and validation.
- Social links (GitHub, LinkedIn, Twitter/X, Dribbble).
- Smooth scroll navigation between sections.
- Focus on showcasing individual talent and personality.
</preset_instructions>`,

  agency: `
<preset_instructions type="agency">
This is an agency/company website. Your master prompt MUST additionally cover:
- Services section with 4–6 service cards (Web Design, Development, Branding, Marketing, etc.).
- Each service card: icon, title, description, "Learn More" link.
- Case studies / portfolio section showing past client work with before/after or results.
- Team section with team member cards (photo, name, role, short bio, social links).
- Client logos / trust bar showing notable companies worked with.
- Testimonials carousel or grid with client quotes, names, and company.
- About section with company story, mission, and values.
- Contact / hire us section with form and office location.
- Careers section (optional) showing open positions.
- Focus on building credibility and converting visitors into clients.
</preset_instructions>`,

  landing: `
<preset_instructions type="landing">
This is a single landing page / product launch page. Your master prompt MUST additionally cover:
- Hero section with compelling headline, subheadline, primary CTA, and product screenshot/mockup.
- Benefits section with 3–5 key benefits, each with icon and description.
- Social proof: customer logos, testimonials, stats (e.g., "10,000+ users"), awards.
- Features section with detailed breakdown of 3–4 core features.
- How it works section (3-step process with icons and descriptions).
- Pricing section (if applicable) with clear tiers.
- FAQ section with 5–8 common questions.
- Email capture / newsletter signup with form.
- Final CTA section repeating the primary offer.
- Footer with links, legal, social.
- Focus on a single conversion goal: signup, download, or purchase.
</preset_instructions>`,

  ecommerce: `
<preset_instructions type="ecommerce">
This is an e-commerce / online store website. Your master prompt MUST additionally cover:
- Product grid with cards showing image, name, price, rating, and "Add to Cart" button.
- Product detail page with image gallery, description, specifications, reviews, and related products.
- Shopping cart with item list, quantity controls, subtotal, and checkout button.
- Checkout flow: shipping info, payment method, order summary, confirmation.
- Category / filtering system with sidebar or top bar filters.
- Search functionality with autocomplete.
- User account: login, signup, order history, wishlist.
- Trust signals: secure checkout badge, return policy, shipping info.
- Focus on conversion optimization, trust building, and smooth checkout experience.
</preset_instructions>`,
};

export function buildPresetSection(presetKey?: string, metadata?: PresetMetadata): string {
  if (!presetKey || presetKey === 'custom') return '';

  const presetInstructions = PRESET_SECTIONS[presetKey];
  if (!presetInstructions) return '';

  let result = presetInstructions;

  // Append metadata-driven additions
  if (metadata) {
    const extras: string[] = [];
    if (metadata.audience) {
      extras.push(`Target audience: ${metadata.audience}. Tailor language, imagery, and CTAs to this specific group.`);
    }
    if (metadata.goal) {
      extras.push(`Primary conversion goal: ${metadata.goal}. Every section should guide the visitor toward this goal.`);
    }
    if (metadata.style) {
      extras.push(`Visual style/vibe: ${metadata.style}. Apply this consistently across all design decisions.`);
    }
    if (metadata.preferredStack) {
      extras.push(`User-specified tech stack override: ${metadata.preferredStack}. Use this instead of the default stack.`);
    }
    if (extras.length > 0) {
      result += '\n<user_specifics>\n' + extras.join('\n') + '\n</user_specifics>';
    }
  }

  return result;
}

export function buildFullMetaPrompt(presetKey?: string, metadata?: PresetMetadata): string {
  const presetSection = buildPresetSection(presetKey, metadata);
  if (!presetSection) return META_PROMPT;

  // Insert preset section before <defaults>
  const insertPoint = META_PROMPT.lastIndexOf('<defaults>');
  if (insertPoint !== -1) {
    return META_PROMPT.slice(0, insertPoint) + presetSection + '\n\n' + META_PROMPT.slice(insertPoint);
  }
  // Fallback: append at end
  return META_PROMPT + '\n' + presetSection;
}

export { META_PROMPT };
