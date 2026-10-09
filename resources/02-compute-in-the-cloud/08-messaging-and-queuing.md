---
module: 2
lesson: 8
slug: messaging-and-queuing
title: "Messaging and Queuing"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud, lesson: Messaging and Queuing"
concepts:
  - messaging-and-queuing
  - loose-coupling
  - monolithic-vs-microservices
  - amazon-sqs
  - amazon-sns
  - publish-subscribe
  - amazon-eventbridge
  - event-driven-architecture
---

# Messaging and Queuing

## Objectives

- Show how Amazon SQS buffers messages between components.
- Explain how Amazon SNS sends messages out through publish-subscribe.
- Distinguish tight from loose coupling.
- Explain why a queue between components makes their communication sturdier.

## Notes

### Why direct handoffs break

- A cashier handing paper orders straight to a barista works only while both are free at the same moment.
- If the barista is busy or on break, the cashier is stuck and orders slow down or get dropped.
- Posting orders to an order board removes that dependency, and buffering messages this way is called messaging and queuing.

### Tight versus loose coupling

- **Tightly coupled**: components talk directly, so a failure or change in one hurts the others or the whole system, as when Application B goes down and Application A starts failing.
- **Loosely coupled**: a message queue sits between them, so A keeps sending while B is down and messages wait until B handles them.
- Loose coupling contains failures instead of letting them cascade, and it is the target for AWS architectures.

### From monoliths to microservices

- Reliability and resilience come from a service-oriented design.
- A traditional monolith tightly couples its database logic, web servers, user interface and business logic, so one failure can take down the whole application.
- Microservices loosely couple those parts, so the rest keep working and talking when one fails, adding availability, resilience and flexibility.

### Amazon EventBridge

- EventBridge, SNS and SQS all support scalable event-driven or message-based communication between application parts.
- EventBridge is serverless: custom apps, AWS services or third-party software feed it events, and it forwards them to the applications that need them.
- It handles the event pipeline end to end: intake, filtering, transformation and delivery.
- **Food delivery example**: one meal order must trigger payment, a restaurant alert, an inventory check and driver dispatch at once.
- EventBridge routes events like "order placed" to each service, copes with peaks, keeps services independent and holds events for a service that is down until it recovers.

### Amazon SQS

- SQS is a message queue: producers drop messages in, and a consumer later picks each one up, processes it and deletes it.
- It moves any volume of messages between components without losing them, and the receiver need not be available at send time.
- In the coffee shop, the order board is the queue and each order is a message whose contents (name, drink, time) are the payload.
- Queues need little setup and grow automatically while staying reliable.
- **Customer support example**: instead of waiting on a busy specialist, the agent adds tickets to an SQS queue and the specialist works through the backlog.

### Amazon SNS

- SNS is publish-subscribe: publishers send a message to a topic, and subscribers such as web servers, email addresses and Lambda functions receive it.
- Unlike SQS, SNS does not park messages for later, so in the coffee shop it is the barista calling out a finished drink, not the order board.
- It can also reach people directly, fanning out by text message, email or mobile push, for example to say an order is ready.
- **Product updates example**: one email on every topic left customers unhappy and disengaged, so the company split updates into topics for new products, offers and events, and customers subscribe only to what they want.

## Visuals

- **Decoupling timeline**: a fragile monolith, then resilient microservices.
- **EventBridge food delivery graphic**: the four services one order triggers.
- **SQS customer support tabs**: scenario, challenge and queue-based fix.
- **SNS product updates graphic**: topics, subscriptions, then tailored notifications.

## Key takeaways

- Tight coupling lets one failure spread, while loose coupling keeps components independent.
- Amazon SQS holds messages until a consumer is ready, so senders never wait on receivers.
- Amazon SNS pushes each message to topic subscribers immediately, including people by push, SMS and email.
- Amazon EventBridge routes events to many services and holds them for a service that is down.
- Use SQS when work can be processed later and SNS when recipients must hear at once.

## Scenarios

- Work arrives while the processing service is busy or offline: queue it in Amazon SQS.
- Customers want only some kinds of updates: separate Amazon SNS topics.

## Terms

- **Messaging and queuing**: passing messages between applications through a buffer.
- **Tightly coupled architecture**: components that depend directly on each other, so one failure spreads.
- **Loosely coupled architecture**: independent components, so one failure stays contained.
- **Monolithic application**: an application whose components are tightly coupled.
- **Microservices architecture**: an application design with loosely coupled components.
- **Amazon Simple Queue Service (Amazon SQS)**: a queue service that reliably holds messages between components.
- **Payload**: the data inside a message.
- **Amazon Simple Notification Service (Amazon SNS)**: a publish-subscribe service that pushes messages to topic subscribers.
- **SNS topic**: the channel publishers send to and subscribers sign up for.
- **Fan out**: pushing one notification to many end users via mobile push, SMS or email.
- **Amazon EventBridge**: a serverless event router between applications and services.
