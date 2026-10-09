---
module: 5
lesson: 5
slug: amazon-vpc-demo
title: "Amazon VPC Demo"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 5: Networking, lesson: Amazon VPC Demo"
concepts:
  - aws-management-console
  - amazon-vpc
  - cidr-blocks
  - public-subnets
  - private-subnets
  - internet-gateway
  - route-tables
---

# Amazon VPC Demo

## Objectives

- Move around the AWS Management Console.
- Follow the steps for creating a VPC.
- Create public and private subnets.
- Create an internet gateway and attach it to the VPC.
- Create a route table, add a route and associate it with the public subnets.

## Notes

### What the demo builds

- In the AWS Management Console, the demo creates a VPC and four subnets (two public, two private) over two AZs, then attaches an internet gateway and routes the public side to it.
- You may never build a VPC yourself, and the narrator says not to memorize the clicks, so focus on what each piece does.

### Step 1: Create the VPC

- Type "VPC" in the console search bar, open the VPC dashboard and choose Create VPC with the "VPC only" option, named My VPC.
- Enter a CIDR (classless inter-domain routing) range, also called a CIDR block, which sets the pool of private IP addresses resources in the VPC can be given.
- The demo uses the IPv4 range 10.0.0.0/16, so every resource gets a unique private address beginning with 10.0.
- This is also when you settle on the Region best placed for your resources.

### Step 2: Create the subnets

- Placing subnets in two AZs is a best practice for high availability, keeping instances reachable if one AZ suffers an outage.
- In the navigation pane on the left, open Subnets in the Virtual private cloud group, then Create subnet and pick My VPC.
- Private-subnet-1 goes in us-east-1a with 10.0.1.0/24, and the second private subnet uses another AZ and 10.0.2.0/24.
- Under Actions, Edit subnet settings, auto-assign public IP stays off for private subnets, since turning it on would hand every resource there a public IP.
- Public-subnet-1 goes in us-east-1a with 10.0.3.0/24, and the second public subnet uses another AZ and 10.0.4.0/24.
- In the same settings, auto-assign public IPv4 address is switched on for public subnets so their resources receive public addresses.
- Naming a subnet "public" does not make it public, because it still needs an attached internet gateway and a route to it.

### Step 3: Create and attach the internet gateway

- Open Internet gateways in the navigation pane, create one named my-ig, then use Actions, Attach to VPC to join it to My VPC.
- Attaching alone does not yet tell instances how to reach the internet.

### Step 4: Route the public traffic

- A route table holds rules, called routes, that decide where network traffic is sent, and every subnet must be associated with one.
- Open Route tables in the navigation pane and create public-route-table in My VPC.
- Its Routes tab starts with a single local route that keeps traffic inside the VPC.
- Choose Edit routes, then Add route, with destination 0.0.0.0/0 and the internet gateway as target.
- On the Subnet associations tab, explicitly associate both public subnets with this table.
- The public subnets now reach the internet through the gateway, while the private subnets lack that route and stay private.

### What comes next

- Next comes traffic filtering through security groups and network ACLs, and security groups reuse CIDR notation to define where traffic may come from or go to.
- Finally, launch resources such as EC2 instances or databases into the subnets.

## Visuals

- **Build timeline**: three steps growing one diagram, from nested AWS Cloud, Region and VPC boxes, to four subnets over two AZs, to a user reaching resources through the internet gateway.

## Key takeaways

- The build order is VPC with a CIDR range, subnets across two AZs, internet gateway, route table, then security and resources.
- A subnet only becomes public when its associated route table sends 0.0.0.0/0 traffic to an attached internet gateway.
- Auto-assign public IPv4 belongs on public subnets only.
- At this level, know what each component does rather than the console clicks.

## Scenarios

- Instances must stay reachable if one AZ has an outage: spread subnets across two AZs.
- A gateway is attached but instances still cannot reach the internet: add the 0.0.0.0/0 route and associate the subnets.

## Terms

- **AWS Management Console**: the AWS interface where you find services (for example through its search bar) and create and configure resources such as VPCs.
- **CIDR (classless inter-domain routing) range**: the notation that defines a block of IP addresses, such as 10.0.0.0/16 for a VPC.
- **Auto-assign public IPv4 address**: a subnet setting that gives every resource launched in it a public IPv4 address.
- **Route table**: a set of routes, associated with subnets, that controls where their traffic is directed.
- **Route**: a single route table rule, such as sending 0.0.0.0/0 traffic to an internet gateway.
