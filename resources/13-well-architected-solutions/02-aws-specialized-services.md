---
module: 13
lesson: 2
slug: aws-specialized-services
title: "AWS Specialized Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 13: Well-Architected Solutions, lesson: AWS Specialized Services"
concepts:
  - aws-codepipeline
  - aws-x-ray
  - aws-amplify
  - amazon-connect
  - amazon-ses
  - amazon-appstream-2-0
  - amazon-workspaces
  - aws-iot-core
---

# AWS Specialized Services

## Objectives

- Match developer needs to AWS services.
- Pick services for contact centers and bulk email.
- Choose among remote desktop and app options.
- Name the IoT device service.

## Notes

### Purpose-built services

- AWS shapes each service around particular jobs, often at customers' request.

### Development services

- CI/CD (continuous integration and continuous delivery) builds, tests and ships each committed change automatically for fast, dependable releases.
- **AWS CodeBuild**: managed CI that compiles, tests and packages code, scales itself and bills only for build time.
- **AWS CodePipeline**: managed CI/CD that spots repository changes and runs build, test and deploy stages, shipping fixes reliably with no servers to provision.
- **AWS X-Ray**: monitors and traces requests so developers can visualize app behavior, find bottlenecks, debug faster and tune efficiency and reliability.
- **AWS AppSync**: managed GraphQL, one secure API merging many backend data sources for frontends.
- **AWS Amplify**: speeds up building, deploying and running secure, scalable full-stack (frontend plus backend) web and mobile apps, adding sign-in, APIs, storage and hosting with little infrastructure work.

### Business application services

- **Amazon Connect**: AI-powered cloud contact center for calls and chats, with call routing, recording, analytics and AWS integrations.
- **Amazon SES**: affordable, scalable email any app can use to automate reliable bulk sends (newsletters, promotions, transactional mail) and improve delivery.

### End-user computing services

- **Amazon AppStream 2.0**: streams desktop and SaaS apps (even desktop apps made SaaS with no code changes) to a browser on any device, so nothing is installed and modest hardware suffices.
- **Amazon WorkSpaces**: fully managed virtual desktop infrastructure, a complete persistent desktop staff reach securely from anywhere and use like an office PC, cost-efficient and easy to run.
- **Amazon WorkSpaces Secure Browser** (formerly WorkSpaces Web): a lightweight managed enterprise browser for web-only users, safely reaching private sites, SaaS apps and the open internet with no client software, infrastructure or VPNs.

### IoT services

- IoT (Internet of Things): physical devices fitted with sensors and software that gather and swap data online and can be watched and controlled remotely, for efficiency, new services and a better quality of life.
- **AWS IoT Core**: managed service that securely links devices to cloud apps and simplifies ingesting, processing and acting on their data, using mutual authentication, end-to-end encryption and a choice of protocols.

## Key takeaways

- CodeBuild does CI builds and CodePipeline the whole release, but only X-Ray visualizes and debugs app behavior.
- AppSync just builds GraphQL data APIs, whereas Amplify is the broad full-stack web and mobile toolkit.
- Calls, routing and analytics mean Amazon Connect; SES is email only and WorkSpaces is a desktop.
- WorkSpaces gives a full desktop, AppStream 2.0 streams apps (the course's pick for staff SaaS access) and Secure Browser suits web-only work.
- IoT needs a sensing physical device, managed with AWS IoT Core; a plain app or software feature does not count.

## Scenarios

- A camera that alerts your phone, a remote pet feeder or irrigation tuned to weather and soil: IoT solutions on AWS IoT Core.

## Terms

- **CI/CD**: Automated build, test and deploy of every code change.
- **AWS CodeBuild**: Managed CI build service.
- **AWS CodePipeline**: Managed CI/CD release automation.
- **AWS X-Ray**: App tracing, debugging and visualization.
- **AWS AppSync**: Managed GraphQL APIs.
- **GraphQL**: API query language, popular in web and mobile, where clients fetch exactly the data they want.
- **AWS Amplify**: Full-stack web and mobile app toolkit.
- **Full-stack application**: App with a frontend and a backend.
- **Amazon Connect**: AI-powered cloud contact center.
- **Amazon SES**: Scalable bulk email service.
- **End-user computing**: Remote staff access to desktops and apps.
- **Amazon AppStream 2.0**: App streaming to any device.
- **SaaS (software as a service)**: Cloud-hosted apps used online with nothing to install or maintain.
- **Amazon WorkSpaces**: Managed persistent cloud desktops.
- **Amazon WorkSpaces Secure Browser**: Managed secure remote browser.
- **IoT**: Internet-connected sensor devices.
- **AWS IoT Core**: Secure device-to-cloud service.
