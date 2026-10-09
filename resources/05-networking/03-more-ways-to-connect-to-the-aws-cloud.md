---
module: 5
lesson: 3
slug: more-ways-to-connect-to-the-aws-cloud
title: "More Ways to Connect to the AWS Cloud"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 5: Networking, lesson: More Ways to Connect to the AWS Cloud"
concepts:
  - aws-client-vpn
  - aws-site-to-site-vpn
  - aws-privatelink
  - aws-direct-connect
  - aws-transit-gateway
  - nat-gateway
  - amazon-api-gateway
---

# More Ways to Connect to the AWS Cloud

## Objectives

- Say what AWS Client VPN does and when it fits.
- Say what AWS Site-to-Site VPN does and when it fits.
- Say what AWS PrivateLink does and when it fits.
- Say what AWS Direct Connect does and when it fits.

## Notes

### AWS Client VPN

- For people: a fully managed, elastic VPN linking remote staff (and on-premises networks) to AWS that scales with demand.
- It needs no hardware or user-count guessing and adds strong authentication.
- It runs on an OpenVPN-based client over the AWS global network.

### AWS Site-to-Site VPN

- For sites: encrypted links from data centers or branch offices to your VPC, with high availability, private sessions and faster apps.
- It suits app migration and remote-location links, and wins when no dedicated line or extra bandwidth is needed.

### AWS PrivateLink

- For resources: highly available, scalable private access from a VPC to services as if they were inside it, including other VPCs, other clouds and on-premises networks.
- It needs no public IP, NAT device, internet gateway, VPN or Direct Connect, and you pick exactly what is reachable, so traffic stays protected and rules simple.

### AWS Direct Connect

- Shared links can jam, so Direct Connect gives a dedicated private line from your network to a VPC (via a Direct Connect location and a virtual private gateway), cutting costs and raising bandwidth.
- Fits: latency-sensitive apps like video streaming (no internet hop), huge transfers (analytics, backups, broadcast media) and hybrid apps across AWS and on premises.
- Choose it only when you need the bandwidth, since plain site links suit Site-to-Site VPN.

### Other gateways

- **AWS Transit Gateway**: a central hub for VPCs and on-premises networks, with inter-Region peering between transit gateways.
- **NAT gateway**: private instances can start outside connections, but outsiders cannot start ones to them.
- **Amazon API Gateway**: creates APIs at any scale and publishes, secures, monitors and maintains them.

## Visuals

- **Connection options image**: a VPC linked to remote staff, a data center and an office.
- **Client VPN image**: remote workers around a globe.
- **Site-to-Site VPN image**: three sites joined to a virtual private gateway by VPN.
- **Direct Connect image**: the dedicated path from a data center into a VPC.
- **Direct Connect accordion icons**: fast media, data moving to the cloud, hybrid lines.
- **Connectivity flashcards**: PrivateLink and Client VPN fronts are swapped, so trust the backs.
- **Knowledge check image**: a data center on a VPN to a VPC.

## Key takeaways

- People need Client VPN, sites need Site-to-Site VPN, and private access to services or VPCs needs PrivateLink.
- Direct Connect is the dedicated high-bandwidth link, worth it only when you need that bandwidth.
- Transit Gateway is a hub, a NAT gateway lets private instances call out but not be called, and API Gateway manages APIs.

## Scenarios

- An acquired remote workforce needs secure access fast: Client VPN.
- Knowledge check, heavy migration that stays hybrid: Direct Connect, as the VPN options lack bandwidth.
- Knowledge check, only protected traffic from approved networks: a virtual private gateway, not Transit Gateway or API Gateway.

## Terms

- **AWS Client VPN**: managed VPN for remote users.
- **AWS Site-to-Site VPN**: encrypted site-to-VPC link.
- **AWS PrivateLink**: private VPC access to services as if local.
- **Direct Connect location**: the entry point to the Direct Connect path.
- **AWS Transit Gateway**: hub for VPCs and on-premises networks.
- **NAT gateway**: lets private instances call out but blocks calls in.
- **API (application programming interface)**: how software systems agree to interact.
- **Amazon API Gateway**: service for building and managing APIs.
