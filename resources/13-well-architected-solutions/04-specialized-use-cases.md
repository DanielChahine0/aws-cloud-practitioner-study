---
module: 13
lesson: 4
slug: specialized-use-cases
title: "Specialized Use Cases"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 13: Well-Architected Solutions, lesson: Specialized Use Cases"
concepts:
  - serverless-computing
  - amazon-api-gateway
  - aws-lambda
  - amazon-dynamodb
  - aws-x-ray
  - s3-static-website-hosting
  - amazon-ses
  - amazon-connect
---

# Specialized Use Cases

## Objectives

- See how mixing a few specialized AWS services solves concrete business problems.

## Notes

### Serverless web backend with X-Ray

- Building blocks: API Gateway in front, Lambda for logic, DynamoDB for data and X-Ray for tracing, a developer favorite.
- A client makes an HTTP call, API Gateway checks it and starts Lambda, Lambda talks to DynamoDB and the reply heads back.
- Work is split across services instead of one web server, so X-Ray follows each request through every hop to show which one failed.

### Static S3 website with a contact form

- The site sits in an S3 bucket: upload the files, switch on website hosting and it is live.
- A submitted Contact Us form calls API Gateway, which runs Lambda to email the owner through Amazon SES, so no server is needed.
- Same services as the backend, new purpose, since Lambda runs whatever code you give it.

### Contact center with callbacks

- Phone calls land in Amazon Connect's interactive voice response (IVR) system, and text messages come in through CloudFront.
- Connect first tries to put the customer through to a live agent.
- If the queue is long, the caller can pick a callback and hang up, or continue by text with a Lambda function handling the switch.
- Chat or email can also serve as the alternate channel.
- Connect, Lambda and CloudFront together make a smarter support desk.

### Common thread

- Recombining a handful of managed services covers very different, complex problems.

## Visuals

- Serverless backend diagram (markers: receive traffic, trigger Lambda, monitor traffic): X-Ray watching the whole request path.
- Static website diagram (markers: customer input, request intake, email): a form-to-email flow with no web server.
- Amazon Connect diagram (markers: first contact, agent connection, long-wait options): a callback or text sparing customers a long hold.

## Key takeaways

- API Gateway, Lambda and DynamoDB form a fully serverless web backend.
- X-Ray locates failures in distributed designs by tracing requests end to end.
- Changing only the Lambda code turns the same pattern from storing data into sending SES email.
- Amazon Connect lets callers skip a long wait through a callback or a switch to text.

## Scenarios

- Contact form on a static site with no server: S3, API Gateway, Lambda and SES.
- Long support hold times: Amazon Connect callbacks.

## Terms

- **Serverless architecture**: A design of managed services that needs no server of your own and minimal infrastructure.
- **Distributed environment**: An app spread over several services rather than one web server.
- **Interactive voice response (IVR)**: Amazon Connect's voice front end, the first stop for calls before a live agent is tried.
- **Agent callback**: Hanging up and letting an agent call back instead of waiting on hold.
