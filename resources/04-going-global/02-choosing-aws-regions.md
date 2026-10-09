---
module: 4
lesson: 2
slug: choosing-aws-regions
title: "Choosing AWS Regions"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 4: Going Global, lesson: Choosing AWS Regions"
concepts:
  - aws-regions
  - region-selection
  - regulatory-compliance
  - latency
  - aws-govcloud-regions
  - regional-pricing
  - gdpr
---

# Choosing AWS Regions

## Objectives

- Explain what to weigh when selecting one or more AWS Regions.

## Notes

### Regions are isolated

- Isolation is a security feature: each Region is walled off from all others, and data crosses that line only with your explicit permission.
- Data in a Region is bound by the host country's laws.

### The four factors

| Factor | What to check |
|---|---|
| Compliance | Laws and data protection rules on where data may live |
| Proximity | Distance to most users, as nearer means lower latency and snappier apps |
| Feature availability | Whether needed services exist there yet, since features roll out gradually |
| Pricing | Operating and energy costs, local taxes and tax incentives |

- Check compliance first, since a legal rule can settle the Region alone, but most businesses have none and move on to the rest.
- Under GDPR, the EU privacy law, an EU online shop must get consent before collecting personal data and let people see or erase it.
- A distant Region adds delay, which can hurt user satisfaction and overall efficiency.
- AWS GovCloud Regions carry strict physical, operational and personnel controls for US government bodies and contractors.
- AWS pricing is transparent and granular, yet each Region has its own rates.
- Data sovereignty laws may force data to stay in the country, which touches both compliance and cost.
- Uptime and performance are broadly equal across Regions, and licensing or hardware specs are on-premises concerns.

## Key takeaways

- The four factors are compliance, proximity, feature availability and pricing.
- Compliance comes first and can decide alone; the other three have no fixed ranking.
- Regions are isolated, follow local law, and differ in services and prices.

## Scenarios

- Frankfurt financial data that German law keeps in-country -> compliance decides.
- UK-only or China-only data -> the London Region or a Region in China.
- Customers mostly in Singapore -> the Singapore Region, not Virginia.
- EU online retailer -> GDPR compliance.
- US government workload -> AWS GovCloud Regions.
- The knowledge check practised weighing compliance and proximity for a public-sector workload.

## Terms

- **Latency**: The delay as data travels between users and the hosting site.
- **General Data Protection Regulation (GDPR)**: The EU regulation protecting personal data and privacy.
- **AWS GovCloud Regions**: Regions with strict security controls for US government agencies and their contractors.
- **Data sovereignty laws**: Laws requiring data to be stored locally.
