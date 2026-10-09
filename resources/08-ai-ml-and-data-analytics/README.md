---
module: 8
slug: ai-ml-and-data-analytics
title: "Module 8: AI/ML and Data Analytics"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 8: AI/ML and Data Analytics"
lessons: 8
assessment_questions: 10
---

# Module 8: AI/ML and Data Analytics

## What this module covers

This module explains how AI, machine learning, deep learning and generative AI nest inside each other, and which AWS services fill each of the three tiers in the AWS AI/ML stack.
It then turns to data analytics, covering data lakes, ETL and the AWS services behind each phase of an automated data pipeline.
A closing real-life example joins both halves with an e-commerce pipeline that lets data scientists query, and ML engineers retrain on, the same S3 dataset.

## Lessons

### Module 8 Introduction

1. **[Introduction to AI and Machine Learning](01-introduction-to-ai-and-machine-learning.md)**: AI versus ML versus classical programming, plus training and inference, told through the coffee shop.

### AI/ML on AWS

2. **[AI/ML on AWS](02-ai-ml-on-aws.md)**: common ML business uses and the AWS AI/ML stack's three tiers.
3. **[AWS AI/ML Solutions](03-aws-ai-ml-solutions.md)**: a comparison table of the pre-built AI services, then Amazon SageMaker AI and ML frameworks and infrastructure.
4. **[Introduction to Generative AI on AWS](04-introduction-to-generative-ai-on-aws.md)**: deep learning, foundation models, LLMs and the AWS generative AI lineup.
5. **[AWS Generative AI Solutions](05-aws-generative-ai-solutions.md)**: SageMaker JumpStart, Amazon Bedrock, Amazon Q Business and Amazon Q Developer side by side.

### Data Analytics on AWS

6. **[Introduction to Data Analytics](06-introduction-to-data-analytics.md)**: data analytics, data lakes, ETL, ELT, zero-ETL and data pipelines.
7. **[Data Pipelines on AWS](07-data-pipelines-on-aws.md)**: a phase-by-phase table of AWS pipeline services and how to tell look-alikes apart.

### Cloud in Real Life

8. **[Data Analytics and AI/ML](08-data-analytics-and-ai-ml.md)**: an eight-step e-commerce pipeline that feeds one S3 dataset to Athena queries and SageMaker AI retraining.

## Key takeaways

- A hand-written rule is classical programming, while ML learns patterns from history, packages them in a model and applies that model to new data (inference).
- The assessment feedback adds that ML usually demands more compute than classical programming, and that classical code still powers complex systems such as operating systems.
- Deep learning trains layered neural networks, and generative AI is deep learning built on foundation models, which are trained once on huge datasets and then reused for many jobs.
- The AWS AI/ML stack runs from pre-built AI services, through ML services centered on Amazon SageMaker AI (your own models, AWS-run infrastructure), to ML frameworks and infrastructure (full control, infrastructure you manage).
- Match the AI service to the job: Comprehend for sentiment and key phrases, Polly to speak text, Transcribe to write speech, Translate for languages, Kendra for enterprise search, Rekognition for images and video, Textract for document text, Lex for chat and voice bots, Personalize for recommendations.
- For generative AI, SageMaker JumpStart is a hub of ready models, Amazon Bedrock serves many FMs through one API with standard pay-as-you-go pricing, Amazon Q Business helps employees with company data, and Amazon Q Developer suggests code.
- Data analytics mines historical data for insights and stays relevant next to AI/ML, for example when a lender must explain a decision.
- Pipelines automate ETL so the same steps run reliably every time, with less manual effort.
- In a pipeline, Kinesis Data Streams and Data Firehose ingest, S3 (data lake) and Redshift (data warehouse) store, Glue Data Catalog catalogs, Glue and EMR process, Athena and Redshift query, and QuickSight and OpenSearch Service visualize.
- One automated pipeline can serve both analytics and ML training from the same S3 dataset.

## What the assessment focuses on

The module assessment has 10 questions.

- Classical programming versus machine learning: 1 question.
- Picking a pre-built AI service for a task (text to speech, per-customer recommendations): 2 questions.
- Amazon SageMaker AI as the way to build custom models without managing infrastructure: 1 question.
- What defines foundation models: 1 question.
- How Amazon Bedrock exposes foundation models: 1 question.
- Choosing a generative AI assistant that works from company data (Amazon Q Business): 1 question.
- What data pipelines add to ETL: 1 question.
- Real-time data ingestion with Amazon Kinesis Data Streams: 1 question.
- Which services serve as data lake and data warehouse: 1 question.
- Several questions lean on look-alike services as distractors, so know where Amazon Comprehend, Amazon EMR and Amazon Athena fit (3, 3 and 2 questions respectively).

## Summary

Good data feeds two kinds of work: AI/ML points it at the future, while analytics points it at the past.
On the AI/ML side, the module covered AWS services that forecast what comes next and automate processes.
On the analytics side, it covered AWS services that collect, prepare and explore historical data so people can learn from it.

## Further reading

- [Amazon Comprehend](https://aws.amazon.com/comprehend/): pick it when you need sentiment, key phrases or categories from written text.
- [Amazon Polly](https://aws.amazon.com/polly/): pick it when an app or course needs to speak written text aloud.
- [Amazon Transcribe](https://aws.amazon.com/transcribe/): pick it when recordings or calls must become text or subtitles.
- [Amazon Translate](https://aws.amazon.com/translate/): pick it when content must reach readers in other languages.
- [Amazon Kendra](https://aws.amazon.com/kendra/): pick it when staff need direct answers from large internal content stores.
- [Amazon Rekognition](https://aws.amazon.com/rekognition/): pick it when you must recognize what appears in pictures or video.
- [Amazon Textract](https://aws.amazon.com/textract/): pick it when printed or handwritten text has to be lifted from forms and tables.
- [Amazon Lex](https://aws.amazon.com/lex/): pick it when an app needs a chat or voice front end.
- [Amazon Personalize](https://aws.amazon.com/personalize/): pick it when each customer should see recommendations of their own.
- [Amazon SageMaker AI](https://aws.amazon.com/sagemaker-ai/): pick it when you want your own model while AWS runs the servers.
- [Amazon SageMaker JumpStart](https://aws.amazon.com/sagemaker-ai/jumpstart/): pick it when a ready-made vision, NLP or tabular model would get you started fast.
- [Amazon Bedrock](https://aws.amazon.com/bedrock/): pick it when you want several FMs behind one API, customized and fully managed.
- [Amazon Q Business](https://aws.amazon.com/q/business/): pick it when employees need answers grounded in company data.
- [Amazon Q Developer](https://aws.amazon.com/q/developer/): pick it when developers want code suggestions in their IDE.
- [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/): pick it when streaming data must arrive in real time.
- [Amazon Data Firehose](https://aws.amazon.com/firehose/): pick it when near-real-time delivery to lakes or warehouses is enough.
- [Amazon S3](https://aws.amazon.com/s3/): pick it as the data lake for any amount and kind of data.
- [Amazon Redshift](https://aws.amazon.com/redshift/): pick it when structured data needs a warehouse and heavy SQL analysis.
- [AWS Glue Data Catalog](https://docs.aws.amazon.com/prescriptive-guidance/latest/serverless-etl-aws-glue/aws-glue-data-catalog.html): pick it when analytics services need one shared source of metadata.
- [AWS Glue](https://aws.amazon.com/glue/): pick it when you want simple, managed ETL.
- [Amazon EMR](https://aws.amazon.com/emr/): pick it when big data jobs call for frameworks such as Apache Spark.
- [Amazon Athena](https://aws.amazon.com/athena/): pick it when you want SQL over data wherever it already lives.
- [Amazon QuickSight](https://aws.amazon.com/quicksight/): pick it when anyone, expert or not, needs interactive dashboards.
- [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service/): pick it for real-time search and monitoring by keyword or natural language.
