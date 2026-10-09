---
module: 9
lesson: 3
slug: protecting-networks-and-applications
title: "Protecting Networks and Applications"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 9: Security, lesson: Protecting Networks and Applications"
concepts:
  - ddos-attacks
  - udp-flood-attacks
  - security-groups
  - elastic-load-balancing
  - aws-shield-standard
  - aws-shield-advanced
  - aws-waf
  - aws-firewall-manager
---

# Protecting Networks and Applications

## Objectives

- Explain how a DDoS attack takes an app down.
- Match each AWS defense to its role.

## Notes

### DoS versus DDoS

- A denial of service (DoS) attack exhausts an app's capacity so real customers get no answer.
- One machine is not enough, so a distributed (DDoS) attack adds many infected computers, or zombie bots, whose owners have no idea.

### UDP flood example

- Bots ask a helpful public service, like the National Weather Service, for forecasts, forging your address as the sender.
- Small requests trigger big replies, so your server stalls sorting unwanted data.

### Defense built into AWS infrastructure

- AWS's global footprint of Regions, AZs and edge locations absorbs brute-force attacks automatically.
- **Security groups**: virtual firewalls you configure for inbound and outbound traffic, admitting only expected requests, so forecast data on another protocol is dropped.
  - AWS enforces them at network level, so floods meet a Region's capacity, not one instance's.
- **Elastic Load Balancing (ELB)**: meets traffic before your frontend server, also at Region level, so it is not swamped.
- **AWS Regions**: too big to flood affordably.

### Defense through AWS services

- Using AWS managed services helps: an ELB front door, not an EC2 instance, blunts attacks.
- **AWS Shield Standard**: free, automatic, real-time defense against common DDoS attacks, built into ELB, CloudFront and Route 53.
- **AWS Shield Advanced**: paid, with in-depth diagnostics and detection and mitigation of sophisticated DDoS attacks, integrating with CloudFront, Route 53 and ELB.
- Shield plus custom AWS WAF rules can counter complex DDoS attacks.
- **AWS WAF**: a web application firewall that refuses requests from IP addresses blocked in its web ACL (web access control list).
  - It also spots bad actors' signatures and uses machine learning to catch new threats.
- **Exam guide update** (verified_on 2026-10-09, [AWS Firewall Manager](https://aws.amazon.com/firewall-manager/)): AWS Firewall Manager centrally configures and enforces firewall rules, such as AWS WAF rules, security group rules and AWS Network Firewall firewalls, across the accounts in your organization.

## Visuals

- **DoS and DDoS timeline**: one attacker versus many zombie bots.
- **Infrastructure flashcards**: why security groups, ELB and Regions resist floods.

## Key takeaways

- DoS comes from one source, and DDoS from many compromised machines.
- Security groups and ELB use Region-scale capacity against DDoS.
- Shield Standard is free and automatic, and Shield Advanced is paid, for sophisticated attacks.
- AWS WAF blocks listed IP addresses via a web ACL.

## Scenarios

- An EC2 instance as front door: put ELB in front.
- A web app needs infrastructure DDoS defenses: security groups and ELB.
- Web requests from IP addresses you blocked: AWS WAF turns them away.

## Terms

- **DoS attack**: Flooding an app until genuine requests go unanswered.
- **DDoS attack**: A DoS attack from many compromised machines.
- **Zombie bots**: Infected computers attacking unknowingly.
- **UDP flood**: Forging the victim's address so a public service floods it with replies.
- **Security group**: A customer-configured virtual firewall for an EC2 instance's inbound and outbound traffic.
- **Elastic Load Balancing (ELB)**: AWS's managed load balancer, meeting traffic first.
- **AWS Shield**: DDoS protection, free in Standard and paid in Advanced.
- **AWS WAF**: A web application firewall filtering requests by web ACL.
