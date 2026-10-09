---
module: 5
lesson: 6
slug: global-networking
title: "Global Networking"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 5: Networking, lesson: Global Networking"
concepts:
  - edge-networking
  - domain-name-system
  - amazon-route-53
  - route-53-routing-policies
  - amazon-cloudfront
  - edge-locations
  - aws-global-accelerator
---

# Global Networking

## Objectives

- Explain what the Domain Name System (DNS) does.
- Describe the benefits and uses of Amazon Route 53.
- Describe the benefits and uses of Amazon CloudFront.
- Explain edge networking and where AWS Global Accelerator fits.

## Notes

### Edge networking

- Edge networking pushes compute and storage toward where data is created and used, giving user-facing apps secure, speedy networking.
- Processing or caching near users lowers latency and keeps the organization in control of its infrastructure.
- Route 53 is one of many services hosted at the edge, building on edge locations from an earlier module.

### DNS

- DNS is the internet's phone book, turning names people read into IP (Internet Protocol) addresses computers use.
- Resolution: the browser hands the name to a customer DNS resolver, which asks the company's DNS server, which replies with the IP address (192.0.2.0 for AnyCompany).

### Amazon Route 53

- Route 53 is a reliable, low-cost DNS service whose worldwide, auto-scaling DNS servers route users to apps in AWS (EC2 instances, load balancers) or outside it.
- Routing policies: weighted round robin, latency-based, geolocation and geoproximity.
- Geolocation routes by where the customer is, so North America goes to a North American Region and Ireland to the Dublin Region.
- It also runs health checks, registers new domains and takes over DNS records from other registrars, so all your domains live in one place.

### Amazon CloudFront

- CloudFront is a CDN (content delivery network) that securely serves static and dynamic web content from edge locations near customers, for faster loads, lower cost and reliability.
- Analogy: a global truck fleet parks copies of your content in local depots, so requests stop trekking to the single main warehouse (your origin server).
- Example: a Seattle visitor to a site hosted in Oregon gets its images and GIFs from CloudFront's Seattle location, and shorter trips mean faster delivery.
- Use cases: smooth workout videos at peak hours, fast store pages in busy seasons (fewer abandoned carts) and quick map loads in a travel app.

### Route 53 and CloudFront together

- Route 53 resolves AnyCompany's domain to 192.0.2.0, the request goes to the nearest CloudFront edge location, and CloudFront hands it to an Application Load Balancer that passes it to an EC2 instance.

### AWS Global Accelerator

- Global Accelerator moves app traffic off crowded public routes onto the AWS private global network for better availability, performance and security.
- The assessment adds static IP addresses and a best-endpoint choice based on endpoint health, user location and your policies.
- Fast failover when one app location fails is the clue that separates it from Route 53 (DNS, domains, health checks) and CloudFront (content caching).
- Use cases: even gameplay for gamers in Tokyo, London and New York, and a banking app that stays fast at peaks or on poor local networks.

## Visuals

- **DNS process graphic**: three markers tracing a lookup from laptop to resolver to company DNS server.
- **CloudFront trucks image**: trucks hauling content around a globe.
- **Route 53 and CloudFront graphic**: four markers from customer to Route 53, an edge location, a load balancer and EC2.
- **Edge services flashcards**: one card each for Route 53, CloudFront and Global Accelerator.

## Key takeaways

- Edge networking brings computing and storage near users to cut latency.
- DNS maps domain names to IP addresses through a resolver and a DNS server.
- Route 53 resolves names, routes with policies, runs health checks, and registers or consolidates domains.
- CloudFront caches static and dynamic content at edge locations near users.
- Global Accelerator offers static IPs and health-aware routing over the AWS global network with fast failover.

## Scenarios

- Gamers and banking customers worldwide needing low lag: Global Accelerator.
- Knowledge checks practiced picking a CDN for global training media and a DNS service to consolidate domains.

## Terms

- **Edge networking**: placing compute and storage near data sources and users.
- **Domain Name System (DNS)**: the system that translates website names into IP addresses.
- **DNS resolution**: turning a domain name into an IP address.
- **Customer DNS resolver**: takes the browser's lookup and queries the company DNS server.
- **Amazon Route 53**: the AWS DNS service, highly available and scalable.
- **Routing policy**: a Route 53 rule for picking an endpoint.
- **Amazon CloudFront**: the AWS CDN service.
- **Content delivery network (CDN)**: a network serving copies of content from near users.
- **AWS Global Accelerator**: carries app traffic on the AWS global network to healthy endpoints.
- **Application Load Balancer**: here, passes requests from CloudFront to EC2.
