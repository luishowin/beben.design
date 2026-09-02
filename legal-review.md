# Advocate review brief: Standard Terms of Engagement v1.0

**Status:** the draft at `docs/legal/terms-of-engagement/` is `noindex`, is not linked from the
footer, and carries a banner saying it is not in force. None of it is contractual until reviewed.

**Entity:** Beben Design is a **sole proprietorship** trading in Westlands, Nairobi. Not a limited
company. There is no separate legal person, so the proprietor's personal assets are not shielded by
the entity. This is the single most important fact for the liability drafting below.

**Not legal advice.** This brief and the draft were prepared by the studio, not by a lawyer.

---

## 1. Clauses drafted from scratch, needing review

| # | Clause | Where | The question for you |
|---|---|---|---|
| 1 | Revision allowance and overage | ToE 03 | Two rounds per deliverable, overage priced per additional round as a fixed line item. Is "one consolidated set of written feedback" a workable definition of a round? |
| 2 | Client delay and rescheduling | ToE 04 | 10 working days to delay, 30 days to a rescheduling fee, 90 days to deemed cancellation. Are these enforceable, and is the fee a genuine pre-estimate rather than a penalty? |
| 3 | Suspension for non-payment | ToE 02 | 14 days overdue, then 7 days notice. Does this survive alongside the ADR ladder in clause 11? |
| 4 | Cancellation fee | ToE 05 | **Highest risk item.** 25% of the unearned balance. Under Kenyan law a sum payable on breach that is not a genuine pre-estimate of loss risks being struck down as a penalty. Is 25% defensible for a studio reserving capacity, and should it be framed as liquidated damages? |
| 5 | Interim licence before payment | ToE 06 | Revocable licence for review, testing and staging only, revoking on non-payment at 30 days. Does the revocation bite in practice once a client has the files? |
| 6 | Background IP carve-out | ToE 06 | The studio retains component systems and libraries and grants a perpetual licence to use them inside the deliverable. Does this conflict with the "transfer is exclusive" position the previous terms took? |
| 7 | Third-party boundary | ToE 07 | Nine named categories rather than named vendors, so the clause survives a supplier change. Is naming categories sufficient to exclude liability? |
| 8 | Data protection annexe | ToE 10 | Processor obligations under the Data Protection Act 2019, ss. 41, 42, 48: purpose limitation, confidentiality, security, sub-processor consent, assistance, 48-hour breach notice, audit, return or deletion. Is anything required by the Act missing? |

## 2. Defects carried over from the previous terms

1. **Late-payment interest.** The old text delegated the rate to the Law of Contract Act, Cap 23,
   which prescribes no commercial late-payment rate. The draft now states 1.5% per month. Confirm
   this is enforceable and not usurious.
2. **Consumer Protection Act 2012.** The draft scopes engagements as business-to-business and
   excludes the Act. But `docs/shop/index.html` promises a consumer storefront and a product drop.
   Retail sales will need separate terms of sale, a refund position and an end-user licence. **Not
   yet drafted.**
3. **ADR ladder.** 30 days negotiation then 60 days NCIA mediation. The draft adds a carve-out for
   urgent injunctive relief and undisputed-debt recovery, so the new suspension right is not trapped
   behind roughly 90 days. Confirm the carve-out is effective.
4. **Tax and currency.** Fees are quoted in USD by a Kenyan sole proprietorship. The draft makes tax
   and FX the client's burden but does not address VAT at 16%, withholding tax, or who bears an
   adverse exchange movement. **Needs your position.**
5. **Liability cap for a sole proprietorship.** The cap is total fees paid for the engagement. With
   no corporate veil, consider whether professional indemnity cover should be a stated condition and
   whether an explicit no-personal-liability clause is worth attempting.

## 3. Values still to be set (Scope of Work variables)

Shown in the draft in a boxed monospace style. Current defaults, all changeable:

| Variable | Default in draft |
|---|---|
| Payment split | 50% deposit, balance on handoff |
| Invoice due | 14 days |
| Late interest | 1.5% per month |
| Suspension trigger / notice | 14 days overdue / 7 days notice |
| Revision rounds | 2 per deliverable |
| Revision overage | per-round fixed fee, amount TBC |
| Client delay window | 10 working days |
| Rescheduling fee | after 30 days, amount TBC |
| Deemed cancellation | 90 days |
| Cancellation fee | 25% of unearned balance |
| Warranty period | 30 days after handoff |
| Breach notification | 48 hours |
| Interim licence revocation | 30 days overdue |

## 4. Not drafted, and needed before the shop launches

- Terms of sale for retail purchases (consumer, so the CPA 2012 applies).
- Refund and returns position for digital goods.
- End-user licence for downloadable products.
- A Scope of Work template. The ToE is written to be incorporated by reference at a version, so the
  template needs: parties, deliverables, milestones, acceptance criteria, the variables above, and
  the sentence incorporating these Terms at v1.0.

## 5. What was already fixed and needs no review

Removed from the published site as factually untrue rather than legally risky: a claim of ODPC
registration as a data controller (not registered), and five statements describing analytics,
cookies and IP logging that this site does not do.

---

## Parked

The drafted Terms of Engagement now live in `legal-draft/terms-of-engagement/`, outside `docs/`, so
nothing unreviewed is served from the domain. `docs/legal/index.html` is back to being a single
self-sufficient Terms of Service covering services, IP, liability and confidentiality, which is what
the site had before and is adequate until the review happens.

To resume: move the folder back under `docs/legal/`, re-add the pointers from `/legal/`, add the
footer link and the sitemap entry.
