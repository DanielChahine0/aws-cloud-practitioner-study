---
module: 3
lesson: 2
slug: aws-lambda
title: "AWS Lambda"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 3: Exploring Compute Services, lesson: AWS Lambda"
concepts:
  - aws-lambda
  - serverless-computing
  - lambda-functions
  - lambda-triggers
  - lambda-runtimes
  - event-driven-architecture
  - lambda-pricing
  - amazon-sqs
---

# AWS Lambda

## Objectives

- Recall what AWS Lambda is and does as a serverless compute service.
- Identify its parts: functions, triggers, runtimes and scaling.

## Notes

### What Lambda is

- Lambda is a serverless compute service, also called Function as a Service.
- Deploying an app like the narrator's crab classifier would otherwise mean provisioning, scaling and keeping servers available.
- Instead, you deploy a function holding your code, and it runs whenever its trigger fires.
- Lambda plugs easily into other AWS services, so whole apps can run without managing servers.

### Triggers

- They range from simple events, like an upload or a finished classification, to heavier ones like a live data stream or resizing one image into several resolutions.

### Scaling and limits

- It is highly available and scales up or down by itself, from one trigger to thousands.
- AWS patches, updates and secures the underlying environment and allocates its resources.
- A run lasts 15 minutes at most, so work that cannot be split into such chunks may fit elsewhere.
- Good fits are brief jobs kicked off by events, such as producing expense reports, crunching data in batches or serving web requests.

### Runtimes

- The course says Lambda supports any language: Java, Python and Node.js come built in, and you can build a custom runtime.
- Each runtime is a go-between for one language: it hands your function the invocation event and context details, then returns the function's reply to Lambda.

### How Lambda works

1) Upload code, which becomes a function.
2) Set an event source, such as an AWS service, mobile app or HTTP request.
3) Code runs only on events, while Lambda handles servers and scaling.
4) You pay for compute time only, per millisecond, priced by allocated memory.

- Memory size is also how you tune performance.

### Use cases

- Three industry cases, in social media, news and gaming, show the same payoffs: a bill only for real usage, elastic scale and less ops work.

### Demo: SQS triggers Lambda

- Each new SQS message invokes a function built from an SQS blueprint.
- An execution role lets the function read the queue.
- The queue emptied almost at once, and CloudWatch logs confirmed each message was processed.

### Your share

- You own the code and the IAM roles and permissions the function uses to reach other services.

## Visuals

- **How Lambda works**: four markers from code upload to trigger, event-only execution and pay-per-use billing.
- **SQS demo architecture**: a queue invoking a function per message, showing event-driven flow and the permissions it needs.

## Key takeaways

- Lambda runs code on events with no servers to manage.
- Functions, triggers and runtimes are its core parts.
- AWS handles automatic scaling, availability and patching.
- You pay per millisecond of compute, priced by memory.
- The 15-minute cap suits short, event-driven tasks.
- You still own your code and its IAM permissions.

## Scenarios

- Crab classifier: photo uploads trigger classification and user alerts with no servers to run (functions and triggers).
- Social media app: each upload is resized, filtered and stored, paying only for the processing time per image (event-driven Lambda).
- News aggregator: articles are personalized when users open the app or search, scaling with traffic and saving cost by running only on interaction (pay-per-use).
- Online game: thousands of real-time player events update scores and state, with costs tracking usage at peak times (real-time Lambda).

## Terms

- **AWS Lambda**: AWS's event-driven, serverless way to run code.
- **Function as a Service**: Lambda's model of running your functions on demand.
- **Lambda function**: the uploaded code Lambda runs when triggered.
- **Trigger**: the event, such as an upload, queue message or HTTP request, that invokes a function.
- **Runtime**: a per-language go-between that feeds a function its event and context data and passes the reply back to Lambda.
- **Custom runtime**: a runtime you build yourself instead of a built-in one.
- **Blueprint**: a ready-made function template with code and runtime preset.
- **Execution role**: the IAM role granting a function access to other services.
- **CloudWatch Logs**: the log groups and streams recording each run of a function.
