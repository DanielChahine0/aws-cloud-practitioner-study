---
module: 7
lesson: 5
slug: in-memory-caching-services
title: "In-Memory Caching Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 7: Databases, lesson: In-Memory Caching Services"
concepts:
  - in-memory-caching
  - caching-layer
  - amazon-elasticache
  - database-performance-bottlenecks
  - amazon-elasticache-serverless
  - amazon-elasticache-high-availability
---

# In-Memory Caching Services

## Objectives

- Explain in-memory caching and how it helps databases.
- Describe Amazon ElastiCache, its benefits and use cases.

## Notes

### Why databases slow down

- Growth brings read floods and heavy queries on big datasets, bottlenecking relational back ends like Amazon RDS.
- Read-heavy traffic for data that rarely changes is common, and a caching layer is one of the best remedies.

### In-memory caches

- A cache keeps hot data in RAM, which reads hundreds to thousands of times faster than disk.
- Typical contents: sessions, API responses, query results, anything requested repeatedly.
- Lacking a database's lasting storage and rich queries, a cache complements the database, never replaces it.

### Amazon ElastiCache

- Fully managed caching compatible with Redis OSS, Valkey and Memcached, so existing tools keep working.
- Sub-millisecond reads and writes (the video says microsecond reads).
- You resize the cache with demand, or let the serverless option scale itself, while AWS runs the infrastructure.
- It scales the cache only, not the database's storage.
- Reading from the cache can let you run smaller, cheaper database instances.
- Meant for frequently read data, not cheap storage of cold data, network links or secrets.
- Use cases: session data, faster queries, game leaderboards.

| Benefit | How |
| --- | --- |
| Performance | AWS provisions, patches, monitors; you add or remove nodes |
| High availability | Failed nodes replaced, a replica promoted, usually in minutes |
| Multi-AZ replication | Primary and replicas in separate AZs survive a zone outage |
| Encryption | At rest on disks and backups, in transit via TLS |

### Where ElastiCache sits

- EC2 runs the app, RDS is the database, and ElastiCache sits alongside both.
- The app tries the cache first and returns any hit at once.
- On a miss, it reads RDS, caches the result and replies, so the next request hits.

## Visuals

- **Caching architecture (video)**: a request trying ElastiCache before RDS.
- **Benefits accordion**: the four panels in the table above.

## Key takeaways

- Caching keeps hot data in RAM, checked before the database, for very low latency and less load.
- ElastiCache complements, never replaces, the database.
- A cache can allow smaller database instances.

## Scenarios

- Shoppers flooding one product page: cache it so RDS stops repeating a query.
- A gaming platform: fast leaderboards and real-time analytics.
- A content delivery system: popular data served quickly.
- A knowledge check practises the latency and throughput bottlenecks ElastiCache solves.

## Terms

- **In-memory cache**: a RAM layer holding hot data temporarily.
- **Caching layer**: a cache alongside a database that answers repeat reads.
- **Amazon ElastiCache**: AWS's fully managed in-memory cache.
- **Redis OSS, Valkey and Memcached**: caching tools ElastiCache supports.
- **ElastiCache serverless**: an option that scales with demand by itself.
- **Replica node**: a copy promoted if the primary fails.
- **TLS**: transport layer security for client-to-cache traffic.
