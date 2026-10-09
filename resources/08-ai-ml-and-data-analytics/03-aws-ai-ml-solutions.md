---
module: 8
lesson: 3
slug: aws-ai-ml-solutions
title: "AWS AI/ML Solutions"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 8: AI/ML and Data Analytics, lesson: AWS AI/ML Solutions"
concepts:
  - aws-ai-services
  - amazon-comprehend
  - amazon-polly
  - amazon-translate
  - amazon-lex
  - amazon-personalize
  - amazon-sagemaker-ai
  - ml-frameworks-and-infrastructure
---

# AWS AI/ML Solutions

## Objectives

- Describe each stack tier's purpose, benefits and services.

## Notes

### Tier 1: pre-built AI services

- Ready-made and fastest to deploy; later tiers add customization and need more skill.
- Groups: language (text or speech), vision and search (answers from files, images, video), conversation and personalization (talk to apps, tailored picks).

| Amazon service | Does | Pick it for |
| --- | --- | --- |
| Comprehend | NLP for key phrases, language, sentiment in documents | Classifying, compliance, sentiment in lots of customer comments |
| Polly | Text to lifelike speech; many languages, genders, accents | Assistants, e-learning, visually impaired users, studio-free narration |
| Transcribe | Speech to text; many languages, speaker ID, custom vocabulary, real time | Calls, subtitles, media metadata |
| Translate | Live or batch translation for global communication | Documents, multilingual apps |
| Kendra | Intent-aware NLP search of company content; answers, not keyword hits | Smart search, chatbots, in-app search |
| Rekognition | "Video analysis": people, objects, scenes, activities, text in S3 images and video | Moderation, ID checks, media, home automation |
| Textract | Typed or handwritten text from documents, forms, tables | Financial, healthcare, government forms |
| Lex | Lifelike voice or text chat via NLU and ASR (language understanding, speech recognition) | Assistants, FAQ search, app bots, pre-built support chat |
| Personalize | Per-customer picks from historical data | Streaming, product, trending picks |

### Tier 2: Amazon SageMaker AI

- You build, train and deploy your own models while AWS runs the infrastructure.
- IDE: access control, visibility, experiments, data visualization, debugging, monitoring; plus hundreds of fast-deploy pre-trained models.
- Benefits: tool choice for innovation (IDE for data scientists, no-code for analysts), fast, cheap managed infrastructure, and standardized MLOps and governance for audits.

### Tier 3: ML frameworks and infrastructure

- Full training control for specialized needs, using in-house skill, on infrastructure you manage.
- An ML framework is a tool or software library that hands experienced practitioners optimized, pre-built components for model building.
- It is not a pre-trained service like Tier 1: the team still trains its own model with it.
- AWS supports frameworks such as PyTorch, Apache MXNet and TensorFlow.
- Infrastructure: ML-optimized EC2, Amazon EMR, Amazon ECS.

## Key takeaways

- Tier 1: pre-trained and ready to use.
- Tier 2: your own models, no infrastructure to run.
- Tier 3: full control, and you manage the infrastructure.

## Terms

- **Amazon Comprehend**: Text insights, such as sentiment.
- **Amazon Polly**: Text to speech.
- **Amazon Transcribe**: Speech to text.
- **Amazon Translate**: Text translation.
- **Amazon Kendra**: Enterprise search.
- **Amazon Rekognition**: Image and video analysis.
- **Amazon Textract**: Document text extraction.
- **Amazon Lex**: Conversational app interfaces.
- **Amazon Personalize**: Personalized recommendations.
- **ML framework**: A tool or software library, such as PyTorch, that gives experienced practitioners optimized, pre-built components for building their own models.
