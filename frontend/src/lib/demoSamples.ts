/**
 * demoSamples.ts — sample content texts for the "Load sample" dropdown on
 * ContentPage when VITE_DEMO_MODE=true. Texts match demo/2_content_review/
 * and demo/3_red_team/ exactly.
 */

export interface DemoSample {
  title: string
  channel: string
  body: string
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    title: 'NimbusDesk Homepage Copy',
    channel: 'web',
    body: `Heading: Join Over 40,000 Happy Customers

Body copy:
Nimbus Desk helps support teams deliver exceptional customer experiences at any scale.
With a median first response time of 4 minutes, your agents can resolve issues before customers even notice them.

Starting at just $19 per agent per month, NimbusDesk fits the budget of startups and enterprises alike.

Why teams choose us:
- Over 120+ integrations with the tools you already use
- SOC 2 Type II certified security
- 14-day free trial, no credit card required

Ready to see the difference? Start your free trial today.`,
  },
  {
    title: 'NimbusDesk Press Release',
    channel: 'press',
    body: `FOR IMMEDIATE RELEASE

NimbusDesk Surpasses 50,000 Customer Milestone

PUNE, India — NimbusDesk, the award-winning help desk platform, today announced it has
surpassed 50,000 customers worldwide, including enterprises across 40 countries.

The company, which has been building support infrastructure since its founding in 2016, also
confirmed its ISO 27001 certified status and announced 120+ integrations with leading
enterprise platforms.

Pricing remains competitive at $19 per agent per month for the Starter plan.

NimbusDESK is also previewing its upcoming analytics suite, codenamed Project Heron,
ahead of its planned release. Separately, a second NimbusDESK product announcement is
expected later this quarter.

"We are delighted to reach this milestone," said CEO Maya Rao.

###`,
  },
  {
    title: 'Red Team Sample 1 — Risky Claims',
    channel: 'web',
    body: `Subject: Why Nimbus Desk is the guaranteed choice for enterprise support

NimbusDesk is the only platform that guarantees 100% uptime, no exceptions.
Your data is always safe — we never fail, period.

We are proud to be ISO 27001 certified, with the audit completed ahead of schedule.
Project Heron, our next-generation AI engine, will be available to all customers next month.

With over 50,000 customers trusting us daily, the choice is clear.`,
  },
  {
    title: 'Red Team Sample 2 — Trust & Ratings',
    channel: 'social',
    body: `Trusted by over 40,000 support users across 30 countries.

Nimbus Desk has earned a 4.5-star rating on G2 and was named an award-winning platform
three years running. Our users love us for our reliability — we never fail when it matters most.

With 50,000+ enterprise clients and growing, we are the #1 choice for modern support teams.`,
  },
]
