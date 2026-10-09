---
module: 5
lesson: 4
slug: subnets-security-groups-and-network-access-control-lists
title: "Subnets, Security Groups, and Network Access Control Lists"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 5: Networking, lesson: Subnets, Security Groups, and Network Access Control Lists"
concepts:
  - subnets
  - packets
  - network-acls
  - security-groups
  - stateless-packet-filtering
  - stateful-packet-filtering
  - shared-responsibility-model
---

# Subnets, Security Groups, and Network Access Control Lists

## Objectives

- Explain how traffic moves through a VPC.
- Explain how security groups filter traffic and why that makes them stateful.
- Explain how network ACLs filter traffic and why that makes them stateless.
- State who secures subnets with these controls under the AWS Shared Responsibility Model.

## Notes

### Security inside the VPC

- Gateways guard the edge of the VPC, yet perimeter defense is only one slice of network security.
- AWS also offers tools for other layers, among them firewalls, encryption and DDoS (distributed denial-of-service) protection, which the course's security section covers later.
- This lesson looks inward at two flexible traffic controls: network ACLs and security groups.

### Subnets

- A subnet groups resources by security or operational needs and is either public or private.
- Public subnets hold what the public must reach, such as an online store's website.
- Private subnets hold what only your private network should reach, such as a database of customer details and order histories.
- A main reason to have subnets is to decide who gets to the gateways: public subnets can use the internet gateway, private ones cannot.
- Rules can let subnets talk to each other, for example public EC2 instances querying private databases.

### Packets and the subnet check

- A packet is one unit of data on a network, and a customer's request arrives as packets through the internet gateway.
- Each packet crossing a subnet edge, in either direction, is judged by that subnet's network ACL on who sent it and how it is trying to communicate.
- The check looks only at whether the sender is approved, never at what the packet carries.

### Network ACLs

- Picture the network ACL as the subnet's border guard: a virtual firewall judging everything that enters or leaves the whole subnet.
- Analogy: airport passport control inspects travelers (packets) on arrival and on departure, turning away anyone missing from the approved list or named on a banned list.
- Every AWS account comes with a default network ACL that lets everything through until you edit its rules.
- A custom network ACL starts the other way round: nothing passes until you add allow rules.
- Each network ACL also ends in an explicit deny rule that rejects any packet no other rule matched.
- **Stateless**: it has no memory, so even the reply to a request that already left is checked from scratch.
- Its inbound and outbound lists are separate and may differ, so being admitted does not guarantee the reply can leave.
- Blind spot: it works only at the subnet edge, so per-instance decisions are beyond it.

### Security groups

- Instances in one subnet may need different rules about who may contact them and on which ports, which calls for instance-level control.
- A security group is the instance's own virtual firewall, filtering traffic to and from one resource such as an EC2 instance, and every instance gets one at launch.
- Out of the box it blocks every inbound port and sender address and lets all outbound traffic go.
- You open it with allow rules, such as accepting only HTTPS on a web server, with separate inbound and outbound rules, and anything not allowed stays blocked.
- Analogy: a building's door attendant checks the guest list as people arrive but lets them leave without looking.
- **Stateful**: it remembers an outgoing request and lets the matching reply back in whatever the inbound rules say.
- Instances in one VPC can share a security group or each use their own.

### A packet's round trip

- Instance A in subnet 1 sends a packet to instance B in subnet 2 of the same VPC.
- Outbound leg: A's security group lets it out by default, subnet 1's network ACL applies its own outbound list no matter what the security group decided, then subnet 2's network ACL and B's security group check it on the way in.
- Return leg: B's security group passes the reply because it saw the request, both network ACLs consult their lists again, and A's security group lets the reply in unchecked.
- All these checks are built into AWS networking and happen without noticeable delay.

### Security groups versus network ACLs

| Aspect | Security groups | Network ACLs |
| --- | --- | --- |
| Works on | Individual EC2 instances | Whole subnets |
| Memory | Stateful | Stateless |
| Rules | Allow only | Allow and deny |
| Replies | Let through automatically when the request was allowed | Need rules permitting them in each direction |
| Best for | Fine-grained, per-instance control | Broad control at the subnet edge |

### Shared responsibility

- Under the AWS Shared Responsibility Model, setting up network ACLs and security groups for your subnets and resources is your job.
- That is security IN the cloud, the traffic protection around your own applications.
- AWS owns security OF the cloud, meaning the software, hardware, data centers and facilities behind its services.

## Visuals

- **Subnets diagram**: a VPC with an internet gateway, a public subnet of EC2 instances and a private subnet of databases, showing the public and private split.
- **Packet permission image**: the network ACL stopping an arriving packet at the subnet edge, showing where subnet checks happen.
- **Default network ACL cartoon**: passport officers waving everyone in and out, the default allow-all setting.
- **Custom network ACL cartoon**: officers checking a custom list both ways, showing deny-until-allowed and the catch-all deny rule.
- **Stateless cartoon**: the network ACL rechecking a packet it has already seen.
- **Security group guard cartoons**: guards blocking all entry but never checking exits, the default inbound-deny, outbound-allow setting.
- **Stateful cartoon**: the security group recognizing a returning packet and skipping its rules.
- **Shared responsibility image**: a reminder that these controls are the customer's to configure.

## Key takeaways

- Network ACLs work at the subnet level, are stateless, and support both allow and deny rules.
- Security groups work at the instance level, are stateful, support allow rules only, and by default deny all inbound and allow all outbound traffic.
- The default network ACL allows everything, a custom one denies everything until you add rules, and an explicit deny rule catches unmatched packets.
- A packet between subnets passes both security groups and both network ACLs, and only the network ACLs recheck the return trip.
- Configuring security groups and network ACLs is the customer's responsibility, as part of security in the cloud.

## Scenarios

- An online store's website in a public subnet with customer data in a private subnet: subnets split by security needs.
- A web server that should accept only HTTPS: a security group rule.
- Several instances in one subnet needing different port rules: instance-level security groups.
- Knowledge checks practiced picking a control for fine-grained per-instance rules and naming the stateless filter.

## Terms

- **Packet**: a unit of data traveling across a network.
- **Network access control list (network ACL)**: a subnet-level virtual firewall that filters traffic entering and leaving the subnet.
- **Default network ACL**: the network ACL every AWS account has, which allows all traffic until modified.
- **Custom network ACL**: a network ACL you create, which denies all traffic until you add allow rules.
- **Explicit deny rule**: the final network ACL rule that rejects any packet not matched by another rule.
- **Stateless packet filtering**: checking every packet in both directions with no memory of earlier traffic.
- **Security group**: an instance-level virtual firewall for a resource such as an EC2 instance.
- **Stateful packet filtering**: remembering earlier decisions so replies to allowed requests pass automatically.
