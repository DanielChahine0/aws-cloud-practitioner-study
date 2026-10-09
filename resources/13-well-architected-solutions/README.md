---
module: 13
slug: well-architected-solutions
title: "Module 13: Well-Architected Solutions"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 13: Well-Architected Solutions"
lessons: 4
assessment_questions: 6
---

# Module 13: Well-Architected Solutions

## What this module covers

This final module tours specialized AWS services in four areas: development, business apps, end-user computing and IoT.
It then introduces the AWS Well-Architected Framework and its six pillars, applies the framework to an online florist, and presents the AWS Well-Architected Tool for reviewing your own workloads.
A closing real-life lesson shows how a few of these services combine into a serverless backend, a serverless contact form and a support line with callbacks.

## Lessons

### Module 13 Introduction

1. **[Introduction to Well-Architected Solutions](01-introduction-to-well-architected-solutions.md)**: why flexible building blocks call for a way to judge design quality.

### AWS Specialized Services and Solutions

2. **[AWS Specialized Services](02-aws-specialized-services.md)**: CodeBuild, CodePipeline, X-Ray, AppSync, Amplify, Amazon Connect, SES, AppStream 2.0, WorkSpaces, WorkSpaces Secure Browser and IoT Core.
3. **[AWS Well-Architected Framework](03-aws-well-architected-framework.md)**: the six pillars, the AWS WA Tool and a florist architecture improved pillar by pillar.

### Cloud in Real Life

4. **[Specialized Use Cases](04-specialized-use-cases.md)**: a serverless backend traced by X-Ray, an S3 site whose form emails through SES, and Amazon Connect callbacks.

## Key takeaways

- Every AWS service is purpose-built for particular use cases.
- CodeBuild runs continuous integration builds, CodePipeline automates the whole CI/CD release, X-Ray lets developers visualize and debug app behavior, AppSync offers managed GraphQL APIs and Amplify speeds up full-stack web and mobile apps.
- Amazon Connect runs AI-powered contact centers, and Amazon SES automates high-volume transactional and marketing email.
- WorkSpaces gives a complete, persistent desktop, AppStream 2.0 streams applications rather than a whole desktop, and WorkSpaces Secure Browser covers browser-only access.
- AWS IoT Core securely links sensor-equipped physical devices to cloud applications.
- The Well-Architected Framework's six pillars run from Operational Excellence through Security, Reliability, Performance Efficiency and Cost Optimization to Sustainability.
- Typical pillar moves include CI/CD automation, least privilege and encryption, multiple Availability Zones, rightsizing, Spot Instances and Savings Plans, and Lambda in place of always-on servers.
- The AWS WA Tool is free, reviews a workload against the pillars and suggests best-practice remediations you can override, but it does not migrate workloads, forecast costs or manage permissions.
- A few managed services such as API Gateway, Lambda, DynamoDB, SES and Amazon Connect can be recombined to solve very different problems.

## What the assessment focuses on

The module assessment has 6 questions.

- Choosing AWS Amplify to add ready-made features to a full-stack app: 1 question.
- Choosing Amazon SES for automated marketing email: 1 question.
- Telling Amazon WorkSpaces (full desktop) apart from Amazon AppStream 2.0 (app streaming) for remote staff: 1 question.
- Using AWS IoT Core to monitor physical equipment: 1 question.
- Applying the Reliability pillar through multiple Availability Zones, with the other pillars as labelled distractors: 1 question.
- Rightsizing an oversized EC2 instance as Performance Efficiency, which means telling it apart from pure cost cutting and from automatic scaling with demand: 1 question.
- Look-alike services recur as distractors, so know where Amazon Connect (3 questions), Amazon AppStream 2.0 (3), AWS AppSync (2) and the AWS Well-Architected Tool (2) fit.

## Summary

The recap lists the purpose-built services under development, business and customer support, although the lessons also covered end-user computing and IoT.
It returns to the six Well-Architected pillars and to the AWS Well-Architected Tool as the way to assess workloads, improve them and bring them in line with best practices.
It ends on serverless designs, where API Gateway, Lambda and DynamoDB scale and run efficiently while keeping infrastructure to a minimum.
In the farewell video the hosts look back on a course that ran from Regions and Availability Zones through EC2 to database migration.
Their advice: do not be daunted by how big AWS is, start from the basics and keep building, even five minutes a day.

## Further reading

- [AWS CodeBuild](https://aws.amazon.com/codebuild/): product page for the managed build service that compiles, tests and packages code.
- [AWS CodePipeline](https://aws.amazon.com/codepipeline/): the release-automation service for setting up and tracking CI/CD pipelines.
- [AWS X-Ray](https://aws.amazon.com/xray/): the service for monitoring application behavior and tracking down bugs.
- [AWS AppSync](https://aws.amazon.com/appsync/): the managed GraphQL service, where one API request can draw on many data sources.
- [AWS Amplify](https://aws.amazon.com/amplify/): the toolkit for getting full-stack apps built, shipped and managed on AWS fast.
- [Amazon Connect](https://aws.amazon.com/connect/): the AI-assisted cloud contact center for running customer service.
- [Amazon SES](https://aws.amazon.com/ses/): automated, high-volume sending for transactional and marketing messages.
- [Amazon AppStream 2.0](https://aws.amazon.com/appstream2/): streaming of desktop and cloud apps to whatever compatible device staff use.
- [Amazon WorkSpaces](https://aws.amazon.com/workspaces-family/workspaces/): secure, managed virtual desktops for a remote workforce.
- [Amazon WorkSpaces Secure Browser](https://aws.amazon.com/workspaces-family/secure-browser/): a protected browser through which employees reach web apps and sites.
- [AWS IoT Core](https://aws.amazon.com/iot-core/): the managed service that safely joins devices to cloud apps for IoT solutions.
- [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/): landing page for the six-pillar approach to building and running secure, resilient, efficient workloads.
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html): the framework's official documentation.
- [What is AWS Well-Architected Tool?](https://docs.aws.amazon.com/wellarchitected/latest/userguide/intro.html): user guide to the tool that gives a repeatable way to measure an architecture against AWS best practices.
- [AWS Architecture Center](https://aws.amazon.com/architecture/): reference architectures and proven guidance for designing on AWS.
- [AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/): AWS articles sharing technical lessons and good practice for building solutions.
