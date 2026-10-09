---
module: 9
lesson: 4
slug: protecting-data
title: "Protecting Data"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 9: Security, lesson: Protecting Data"
concepts:
  - data-encryption
  - encryption-at-rest
  - encryption-in-transit
  - ssl-tls-certificates
  - aws-kms
  - aws-certificate-manager
  - amazon-macie
---

# Protecting Data

## Objectives

- Give an example of data at rest and data in transit.
- Pick the AWS feature or service that protects data in each state.

## Notes

### Encryption basics

- Encryption is a lock: only holders of the right key can read data such as customers' phone and card details.
- One key can lock and unlock, or separate encryption and decryption keys can split the work.
- **At rest**: idle data, such as records in a database.
- **In transit**: moving data, such as records sent from a database to an app.

### Built-in protection for storage

- AWS offers built-in storage protection plus dedicated protection services.
- **Amazon S3**: new buckets have encryption configured, and uploads are encrypted at rest automatically.
- **Amazon EBS**: volumes and snapshots, boot and data volumes alike, can be encrypted at rest.
- **Amazon DynamoDB**: all table data is encrypted at rest server-side with AWS KMS keys.

### Dedicated data protection services

- **AWS Key Management Service (AWS KMS)**: creates and controls cryptographic keys, the random digit strings that lock and unlock data.
  - You set which IAM users and roles may manage keys and where they are used, keys never leave KMS, and a key can be disabled temporarily.
- **AWS Certificate Manager (ACM)**: central management of SSL/TLS certificates for AWS services and connected on-premises resources.
- **Amazon Macie**: uses machine learning (ML) and automation to find and monitor sensitive data at rest in S3, aiding security posture reviews and compliance.

### Encryption in transit

- Example: the coffee shop app sends a phone number between AWS services to text a customer that an order is ready.
- SSL and its successor TLS use certificates to verify identity, then encrypt the connection.
- A browser padlock and an HTTPS address signal an SSL/TLS certificate.

### Telling similar ideas apart

- Hashing and salting, used for stored passwords, are one-way and cannot be reversed.
- Tokenization and masking protect data without keys.
- A key alone does not secure data in transit, but SSL/TLS does.
- ACM is for certificates, and AWS KMS for general-purpose encryption keys.
- MFA and strong passwords protect access, not data in transit.

## Visuals

- **Data encryption timeline**: lock and key on a customer profile, then at rest versus in transit.
- **Built-in protection flashcards**: S3, EBS and DynamoDB encryption at rest.

## Key takeaways

- Only authorized key holders can unlock encrypted data.
- S3 and DynamoDB encrypt stored data by default, and EBS volumes can be encrypted.
- AWS KMS creates and controls keys, which never leave it.
- SSL/TLS certificates encrypt data in transit, and ACM manages them.
- Amazon Macie uses ML to find sensitive data in S3.

## Scenarios

- Rudy's secret recipe kept in S3: encrypted at rest by default.
- Controlling who may use the keys that lock your data: AWS KMS.
- Finding where personal data sits across S3 buckets: Amazon Macie.

## Terms

- **Encryption**: Making data unreadable without the key.
- **Decryption**: Making encrypted data readable again.
- **Encryption at rest**: Protecting stored data.
- **Encryption in transit**: Protecting moving data.
- **Cryptographic key**: A random digit string that encrypts and decrypts.
- **AWS KMS**: The service for creating and controlling keys.
- **SSL/TLS certificate**: Proof of identity for an encrypted connection, with TLS the newer protocol.
- **HTTPS**: Web traffic secured by an SSL/TLS certificate.
- **AWS Certificate Manager (ACM)**: Central SSL/TLS certificate management.
- **Amazon Macie**: ML-based discovery of sensitive data in S3.
