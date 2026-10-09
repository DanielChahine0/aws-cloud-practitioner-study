---
module: 1
lesson: 1
slug: welcome-to-aws-cloud-practitioner-essentials
title: "Welcome to AWS Cloud Practitioner Essentials"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 1: Introduction to the Cloud, lesson: Welcome to AWS Cloud Practitioner Essentials"
concepts:
  - client-server-model
  - coffee-shop-analogy
  - pay-as-you-go-pricing
  - resource-provisioning
---

# Welcome to AWS Cloud Practitioner Essentials

## Objectives

- Explain in simple terms how a client and a server work together.

## Notes

### Where the course starts

- The first section covers what the cloud is, what it does for a business, and how AWS and customers divide security work.
- Instructors Morgan Willis, Rudy Chetty and Alan Meridian teach with analogies, use cases and service demos, starting simple.
- AWS offers storage, databases, compute, content delivery, generative AI and much more, but the course opens with one basic idea.

### The client-server model

- A client asks for something, and a server does the work and sends back the result.
- In the coffee shop, the customer is the client and the barista is the server, which on AWS would be a virtual server.
- One exchange has three steps:
  1. **Request**: the client asks, here for a coffee, though a request can be for any data or analysis a business needs.
  2. **Validation**: the server checks the request is legitimate and allowed, as a barista checks payment and the menu.
  3. **Response**: the server hands back the result, a finished drink.
- The client depends on the server to fulfil requests, and the server does nothing until a client asks.
- Real applications involve many requests and servers, which the course builds up to.

### Where cloud computing fits

- The cloud does not replace the client-server model, which modern applications still use.
- Cloud computing is one version of it, supplying the server side as scalable servers that clients reach over the internet.
- A server usually both stores and processes data, while the client sends requests and shows the replies, and cloud servers scale for both kinds of demand.

### Coffee shop connections

- Later lessons keep mapping shop elements to cloud functions, such as AWS compute instance types to coffee machines each suited to a kind of work.
- The analogy exists to make abstract cloud ideas concrete.

### Paying only for what you use

- You pay only for the AWS resources you consume, just as staff earn wages only for hours on shift.
- A shop owner adds staff on busy days and cuts back on slow ones.
  - Example: ten baristas on all day for a new drink launch cover the rush but sit idle, still paid, in quiet hours.
- An on-premises data center is just as rigid, because its capacity cannot be multiplied at short notice.
- On AWS there is no prepayment, and you need not worry about capacity constraints.
- You provision resources when demand appears and deprovision them as fast when it fades, by hand or automatically through configuration.
- Billing for a resource ends the moment it is deprovisioned.

## Visuals

- The AWS Cloud Practitioner Coffee Shop graphic: four markers, one on how shop elements will stand in for cloud functions and three introducing the instructors.

## Key takeaways

- A client-server exchange runs request, validation, processing and response, with the client relying on the server for the work.
- Cloud computing is a form of the client-server model that provides scalable servers over the internet, and on AWS the server is a virtual server.
- AWS charges only for what you consume, with nothing paid upfront.
- Provision resources when demand rises and deprovision them when it falls, and charges stop as soon as a resource is gone.

## Scenarios

- A customer orders a coffee and the barista checks the order before serving it: the client-server model.
- Ten baristas paid all day for a launch, some of them idle: fixed capacity, which paying only for use avoids.

## Terms

- **Client**: the side that sends requests and displays the responses.
- **Server**: the side that validates requests, stores and processes data, and returns responses.
- **Client-server model**: clients send requests and servers process them and reply, and cloud computing is one form of it.
- **Virtual server**: a server you use on AWS over the internet, in AWS data centers rather than your own.
- **Provisioning**: setting up resources when you need them.
- **Deprovisioning**: releasing unneeded resources, which ends their charges immediately.
- **Coffee shop analogy**: the course's running metaphor mapping coffee shop parts to cloud concepts.
