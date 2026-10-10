---
id: mission-07
title: "A two-tier VPC with no NAT gateway"
modules: [5]
services: ["Amazon VPC"]
expectedCredits: "$0"
keep: false
maxLiveHours: 2
canUseCredits: []
leftovers: []
sources:
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/create-vpc.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-getting-started.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/creating-security-groups.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/vpc/pricing/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/delete-vpc.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/tag-editor/latest/userguide/find-resources-to-tag.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/vpc/latest/userguide/default-network-acl.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_TagSpecification.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateTags.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeSecurityGroups.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeNetworkAcls.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html", verified_on: "2026-10-10" }
---

## Goal

Build the classic two-tier network by hand: one public subnet that reaches the internet through an internet gateway, and one private subnet that has no way out.
Put a web security group in front that takes ports 80 and 443 from anywhere, and an app security group that only the web group can reach.
Nothing runs inside the network, so you study the routes and the rules themselves, and then you delete all of it.

## Before you start

- Mission 0 is done and its Verify holds.
- Your Plan status form says the free plan offers Amazon VPC; if it is unticked, stop here.
- Sign in to the console as `ccp-admin`, never as the root user, and keep the Region selector on the home Region you picked in Mission 0.
- Run every CLI command with `--profile ccp-admin`, and run `aws login --profile ccp-admin` first if the session has expired.
- Tag every resource that takes tags with the key `ccp:mission` and the value `mission-07`, written `ccp:mission=mission-07` on this page.
- Nothing here should use credits: a VPC has no additional charge, an internet gateway has no charge, and security groups have no additional charge.
- The parts of Amazon VPC that do bill, such as NAT gateways and public IPv4 addresses, are exactly what this mission's guardrails keep out: no instances, no Elastic IPs, no public IPv4 addresses and no NAT gateway.
- Write down the time you start, and finish Cleanup within 2 hours of it.

## Steps

### Create the VPC with the wizard

- In the VPC console, choose **Create VPC**, then **VPC and more** under **Resources to create**.
- Keep **Name tag auto-generation** selected and enter `ccp-m07`, so each piece gets a readable Name tag.
- Enter `10.0.0.0/16` as the **IPv4 CIDR block**, add no IPv6 block, and keep **Tenancy** at **Default**.
- The VPC guide lists NAT gateways and the S3 gateway endpoint as optional choices but never says what the form starts with, so before you touch **NAT gateways** and **VPC endpoints**, note what each one shows.
- Then set every field in the table below, even one that already shows that value.

| Field | Set it to | Why |
|---|---|---|
| Number of Availability Zones (AZs) | 1 | One AZ is enough for a test network; production wants two or more |
| Number of public subnets | 1 | The web tier |
| Number of private subnets | 1 | The app tier |
| NAT gateways | None | A NAT gateway bills for every hour and every GB, and a public one needs an Elastic IP |
| Egress only internet gateway | No | This network has no IPv6 |
| VPC endpoints | None | Keep the network to the parts drawn below |
| DNS options | leave as shown | Both are on by default and nothing here uses them |

- Expand **Additional tags**, choose **Add new tag**, and enter the key `ccp:mission` with the value `mission-07`.
- Read the **Preview** pane: it should list one VPC, one public and one private subnet and one internet gateway, with no NAT gateway and no endpoint.
- Choose **Create VPC**.

### Picture the network

```text
                       internet
                          |
                 +------------------+
                 | internet gateway |
                 +------------------+
                          |
+-------------------------|-----------------------------------+
|                         |  VPC ccp-m07, 10.0.0.0/16         |
|                         |                                   |
|  +----------------------+---+    +------------------------+ |
|  | public route table       |    | private route table    | |
|  | 10.0.0.0/16 -> local     |    | 10.0.0.0/16 -> local   | |
|  | 0.0.0.0/0   -> igw-...   |    | (no other route)       | |
|  +------------+-------------+    +-----------+------------+ |
|               | associated                   | associated   |
|  +------------+-------------+    +-----------+------------+ |
|  | public subnet            |    | private subnet         | |
|  | web tier                 |    | app tier               | |
|  +--------------------------+    +------------------------+ |
+-------------------------------------------------------------+
```

- The wizard gives the public subnet its own route table with a default route to the internet gateway, which is what makes that subnet public.
- The private subnet has no route to the internet gateway, so even an instance with a public address could not reach the internet from it.
- Every route table holds the local route for traffic inside the VPC, and a subnet uses exactly one route table at a time.
- The private subnet may sit on a table the wizard made or on the VPC's main route table; either way that table should list only the local route, and Verify checks it.

### Tag what the wizard made

- The guide documents **Additional tags** as tagging the VPC, so tag the subnets, route tables and internet gateway as well.
- Every new VPC also comes with a default security group, named `default`, and a default network ACL, and both take tags, so tag them too.
- Run these lines in one terminal and keep it open for Verify.

```bash
VPC=$(aws ec2 describe-vpcs --filters Name=tag:ccp:mission,Values=mission-07 --query 'Vpcs[0].VpcId' --output text --profile ccp-admin)
echo "$VPC"
SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC --query 'Subnets[].SubnetId' --output text --profile ccp-admin)
TABLES=$(aws ec2 describe-route-tables --filters Name=vpc-id,Values=$VPC --query 'RouteTables[].RouteTableId' --output text --profile ccp-admin)
IGW=$(aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=$VPC --query 'InternetGateways[].InternetGatewayId' --output text --profile ccp-admin)
SGS=$(aws ec2 describe-security-groups --filters Name=vpc-id,Values=$VPC --query 'SecurityGroups[].GroupId' --output text --profile ccp-admin)
ACLS=$(aws ec2 describe-network-acls --filters Name=vpc-id,Values=$VPC --query 'NetworkAcls[].NetworkAclId' --output text --profile ccp-admin)
aws ec2 create-tags --resources $SUBNETS $TABLES $IGW $SGS $ACLS --tags Key=ccp:mission,Value=mission-07 --profile ccp-admin
```

- The `echo` line prints an ID that starts with `vpc-`; if it prints `None`, add the tag on the VPC's **Tags** tab and run the lines again.

### Create the two security groups

- In the VPC console, choose **Security groups**, then **Create security group**.
- Name it `ccp-m07-web`, give it a short description, and choose the `ccp-m07` VPC.
- Add two inbound rules, **HTTP** on port 80 and **HTTPS** on port 443, each with the source `0.0.0.0/0`.
- Leave the single outbound rule that a new group starts with, which lets all outbound traffic out.
- Choose **Add new tag**, enter `ccp:mission` and `mission-07`, and choose **Create security group**.
- Create a second group named `ccp-m07-app` in the same VPC with one inbound rule: **Custom TCP**, port 8080, and as the source the `sg-` ID of `ccp-m07-web`.
- Port 8080 stands in for the app's port; one port is enough, so do not open a range.
- Tag it the same way and create it.
- A rule whose source is a security group admits traffic from the private addresses of whatever belongs to that group, and it does not copy that group's own rules.
- A new group admits no inbound traffic until you add a rule, so nothing on the internet can reach `ccp-m07-app`.

## Verify

- In the VPC console, open **Your VPCs**, select `ccp-m07`, and open the **Resource map** tab: it shows the two subnets, the VPC's route tables and one internet gateway, matching your drawing, and no NAT gateway.
- Under **Route tables**, select the public subnet's table: its **Routes** tab lists exactly `10.0.0.0/16` to `local` and `0.0.0.0/0` to an ID that starts with `igw-`.
- That table's **Subnet associations** tab lists the public subnet and no other.
- Select the private subnet's table: its **Routes** tab lists only `10.0.0.0/16` to `local`, and its **Subnet associations** tab lists the private subnet, either as an explicit association or as a subnet without one.
- Under **Subnets**, the public subnet shows **Auto-assign public IPv4 address** as **No**; if it shows **Yes**, turn it off with **Edit subnet settings**.
- Under **Security groups**, `ccp-m07-web` shows inbound 80 and 443 from `0.0.0.0/0`, and `ccp-m07-app` shows one inbound rule whose source is the `sg-` ID of `ccp-m07-web`.
- In the terminal from the tagging step, each of these three commands prints `[]`: no network interface in the VPC, so no public IPv4 address, no NAT gateway, and no Elastic IP.

```bash
aws ec2 describe-network-interfaces --filters Name=vpc-id,Values=$VPC --query 'NetworkInterfaces[].NetworkInterfaceId' --output json --profile ccp-admin
aws ec2 describe-nat-gateways --query 'NatGateways[].NatGatewayId' --output json --profile ccp-admin
aws ec2 describe-addresses --query 'Addresses[].PublicIp' --output json --profile ccp-admin
```

## Cleanup

- This mission lists no leftovers in its frontmatter, so nothing has to go first.
- In the VPC console, open **Your VPCs**, select `ccp-m07`, and choose **Actions**, **Delete VPC**.
- The VPC guide says that a console delete also removes the VPC's subnets, route tables, internet gateways, security groups, network ACLs, gateway endpoints, egress-only internet gateways and DHCP options, so both security groups and the internet gateway go with it.
- If the console instead lists something you must remove first, such as an instance or a NAT gateway, a guardrail slipped: delete that, then try again.
- Type `delete` in the confirmation box and choose **Delete**.
- Check that the VPC is gone: `aws ec2 describe-vpcs --filters Name=tag:ccp:mission,Values=mission-07 --query 'Vpcs[].VpcId' --output json --profile ccp-admin` prints `[]`.
- In Tag Editor, choose all Regions and **All resource types**, enter the tag key `ccp:mission`, and choose **Search resources**: the search returns 0 results.

## Usage check

- On the next study day, open Cost Explorer with **Daily** granularity, grouped by **Service**.
- Compare Amazon VPC on the day after Start with the day before Start, not with zero: the two match.
- If Amazon VPC went up, look for a NAT gateway or a public IPv4 address that outlived Cleanup, delete it, and repeat the Tag Editor search.
- Note your remaining credit balance and record it with the usage button on this page.

## Never do

- Never upgrade the account to the Paid plan, and never change the Support plan.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs; here that means **NAT gateways** stays at **None** in the wizard.
- Never launch an instance into either subnet, and never turn on auto-assign public IPv4 for the public subnet.
- Never add a VPC endpoint in this mission, and never open `ccp-m07-app` to `0.0.0.0/0` or add SSH or RDP rules from anywhere.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced or order Direct Connect.
- Never register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
- Never create access keys, for the root user or for `ccp-admin`, because `aws login` hands the CLI temporary credentials instead.
- Never enable IAM Identity Center or create or join an AWS organization, because on a free-plan account creating an organization upgrades it to the Paid plan and its credits expire at once.
- Never create a landing zone in AWS Control Tower, join the AWS Partner Network, accept an agreement in AWS Artifact such as the Business Associate Addendum (BAA), sign a Professional Services contract or an Enterprise Agreement, or buy an AWS Skill Builder Team subscription, because each of these upgrades a free-plan account to the Paid plan.
