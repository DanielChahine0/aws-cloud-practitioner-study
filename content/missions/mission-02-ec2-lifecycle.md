---
id: mission-02
title: "Launch, stop and terminate an EC2 instance"
modules: [2, 6]
services: ["Amazon EC2", "Amazon VPC"]
expectedCredits: "a few cents; public IPv4 is charged by the hour"
keep: false
maxLiveHours: 2
canUseCredits: ["EC2 instance hours", "public IPv4 address hours", "EBS volume storage"]
leftovers: ["the launch-wizard security group", "any EBS volume left available after termination"]
sources:
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-launch-parameters.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/deleting-security-group.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-linux-inst-eic.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-prerequisites.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-methods.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-stop-start-works.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/terminating-instances.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesShuttingDown.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/preserving-volumes-on-termination.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-deleting-volume.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/vpc/pricing/", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/ec2/pricing/on-demand/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/tag-editor/latest/userguide/find-resources-to-tag.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/differences-billing-data-cost-explorer-data.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/free/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html", verified_on: "2026-10-10" }
---

## Goal

Take one small web server on Amazon EC2 from launch to termination, and see what each lifecycle step keeps and what it throws away.
You serve a one-line page from user data, open a browser shell with EC2 Instance Connect and no key pair, watch the public IPv4 address change across a stop and start, and see which volumes outlive the instance.

## Before you start

- Mission 0 is done and its Verify holds, and your Plan status form says the free plan offers Amazon EC2 and Amazon VPC; if either is unticked, stop here.
- Sign in to the console as `ccp-admin`, never as the root user, and work only in the home Region you picked in Mission 0.
- Run every CLI command with `--profile ccp-admin`.
- Tag every resource you can with `ccp:mission=mission-02`, that is the key `ccp:mission` and the value `mission-02`.
- Three things can use credits: the instance's running hours, its public IPv4 address, and the storage of both EBS volumes until they are deleted.
- A public IPv4 address is charged by the hour whether it is in use or idle.
- On the free plan these charges count against your credits, and nothing is billed to you unless you upgrade to the Paid plan.
- Finish Cleanup within 2 hours of pressing Start.

## Steps

### Launch one instance with a page in its user data

- In the EC2 console, choose **Launch instance**, name it `ccp-m02-web`, and under **Add additional tags** add `ccp:mission=mission-02` for the instance, volumes and network interfaces.
- Pick the Amazon Linux 2023 AMI marked **Free tier eligible** from Quick Start; its standard edition comes with EC2 Instance Connect installed, which is why you can skip the key pair.
- Choose `t3.micro`, which the EC2 free tier page lists for accounts created on or after July 15, 2025, and check that the console marks it **Free tier eligible**.
- Under **Key pair (login)**, choose to proceed without a key pair.
- Under **Network settings**, keep the default VPC, its default subnet and **Auto-assign public IP** on **Enable**, the default in a default subnet.
- Choose **Edit**, let the wizard create a new security group, and swap its default SSH rule from anywhere for these two inbound rules:
  - SSH on port 22 from the prefix list `com.amazonaws.REGION.ec2-instance-connect`, with your Region code for `REGION`, because a console connection arrives from the EC2 Instance Connect service, not from your Mac.
  - HTTP on port 80 from your own public IPv4 address with the `/32` suffix.
- If the wizard will not take the prefix list, give SSH your `/32` address for now and switch it to the prefix list in the group's inbound rules before you connect.
- Under **Configure storage**, add one extra 1 GiB `gp3` volume and leave its **Delete on termination** at the console default, which is **No** for a data volume added at launch.
- Under **Advanced details**, paste this into **User data**; the first line marks it as cloud-init directives.

```text
#cloud-config
packages:
  - httpd
runcmd:
  - [ sh, -c, "echo 'Mission 2 web page is up' > /var/www/html/index.html" ]
  - systemctl start httpd
  - systemctl enable httpd
```

- Launch exactly 1 instance, then add `ccp:mission=mission-02` to the new security group as well, because the wizard did not tag it.
- Wait for `running` and passed status checks, then a few minutes more: user data runs as root during the first boot only, and it slows that boot down.

### Connect with EC2 Instance Connect

- Select the instance, choose **Connect**, open the **EC2 Instance Connect** tab, keep **Connect using a Public IP** and the user `ec2-user`, and choose **Connect**.
- A browser terminal opens, because the service pushed a public key to the instance that lasts only 60 seconds.
- Check the page and the end of the user data log, then close the tab.

```bash
curl -s http://localhost/
sudo tail -n 5 /var/log/cloud-init-output.log
```

### Stop and start once

- Write down the public and private IPv4 addresses, then choose **Instance state**, **Stop instance**.
- While it is stopped, the instance bills nothing, but its EBS volumes still bill for storage.
- Choose **Instance state**, **Start instance**, and compare: the stop released the public IPv4 address and the start gave a new one, while the private address stayed.
- Each start bills at least one minute, so do this once.
- The page still loads, because `httpd` is enabled at boot even though user data does not run again.

## Verify

- From your Mac, load the page over plain `http` at the new address and see `Mission 2 web page is up`.

```bash
curl -s http://PUBLIC_IPV4_ADDRESS/
```

- Use the instance's current public IPv4 address or public DNS name; if the request hangs, check the HTTP rule against your Mac's current address.
- On the instance's **Storage** tab, the **Block devices** table shows **Delete on termination** as **Yes** for the root volume and **No** for the 1 GiB volume.

## Cleanup

- Terminate the instance first, because a security group still tied to an instance and a volume still attached to one cannot be deleted: choose **Instance state**, **Terminate (delete) instance**, and confirm; instance charges stop at `shutting-down`.
- In **Volumes**, confirm that the root volume is gone, since it was set to delete on termination.
- Delete any EBS volume left available after termination: the 1 GiB `gp3` volume now shows **Available**, so choose **Actions**, **Delete volume**, and type `delete`, because a preserved volume bills until deleted.
- Delete the launch-wizard security group created for `ccp-m02-web`, and never the VPC's `default` group.
- The terminated instance stays listed for a short while and then vanishes on its own; the docs give no exact time and suggest contacting Support only after several hours.
- In Tag Editor, select every Region and **All resource types**, search for the tag key `ccp:mission`, and see 0 results.

## Usage check

- On the next study day, open Cost Explorer with daily granularity, grouped by Service.
- Cost Explorer splits Amazon EC2 into **EC2 - Instances** and **EC2 - Other**, and EBS storage lands in **EC2 - Other**.
- Compare both of those and Amazon VPC, whose pricing page lists the public IPv4 charge, with the day before Start, not with zero; if one is still higher, go back to Cleanup.
- Note your remaining credit balance and record it with the usage button on this page.

## Never do

- Never upgrade the account to the Paid plan, and never change the Support plan.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs, and never give this instance an Elastic IP.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced, order Direct Connect, register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
- Never create access keys, for the root user or for `ccp-admin`.
- Never enable IAM Identity Center or create or join an AWS organization, because on a free-plan account creating an organization upgrades it to the Paid plan and the credits expire at once.
- Never set up an AWS Control Tower landing zone or join the AWS Partner Network, because each of these upgrades a free-plan account.
- Never accept an agreement in AWS Artifact, such as the Business Associate Addendum (BAA), because designating the account as HIPAA compliant upgrades it.
- Never sign a Professional Services contract or an Enterprise Agreement, or buy an AWS Skill Builder Team subscription, because each of these upgrades it too.
- Never launch a second instance or one not marked **Free tier eligible**, and never open SSH or HTTP to `0.0.0.0/0`.
- Never leave the instance stopped instead of terminated, because its volumes keep billing.
