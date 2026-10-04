/*
  CURRICULUM: the whole roadmap as a tree.
  Phase -> group -> lessons.  Each lesson is [id, title, ready].
  ready = 1 means content/lessons/<id>.js exists. Flip it to 1 when you add a lesson file.
*/
window.CURRICULUM = [
  { id: 'start', num: '0', title: 'Start here', weeks: '', groups: [
    { title: null, lessons: [
      ['welcome', 'Is course ko kaise use karein', 1],
    ]},
  ]},

  { id: 'foundations', num: '1', title: 'Foundations', weeks: 'Weeks 1–2', groups: [
    { title: 'Introduction', lessons: [
      ['what-is-system-design', 'System design kya hai?', 1],
    ]},
    { title: 'Networking', lessons: [
      ['how-the-web-works', 'xyz.com type kiya, page kaise aaya?', 1],
      ['tcp-udp-https', 'TCP, UDP aur HTTPS', 1],
      ['crypto-keys', 'Public key, private key aur key exchange', 1],
      ['ip-and-ports', 'IP address aur ports', 1],
      ['http-versions', 'HTTP/1.1, HTTP/2, HTTP/3', 1],
      ['proxies', 'Forward proxy vs reverse proxy', 1],
    ]},
    { title: 'APIs', lessons: [
      ['what-is-api', 'API kya hai? REST basics', 1],
      ['pagination-idempotency', 'Pagination aur idempotency', 1],
      ['graphql-grpc', 'REST vs GraphQL vs gRPC', 1],
      ['auth-basics', 'AuthN, AuthZ, JWT, OAuth', 1],
    ]},
    { title: 'Qualities of a system', lessons: [
      ['scalability', 'Scalability: vertical vs horizontal', 1],
      ['availability-spof', 'Availability, nines aur SPOF', 1],
      ['latency-throughput', 'Latency, throughput aur p99', 1],
      ['concurrency-parallelism', 'Concurrency vs parallelism', 1],
    ]},
  ]},

  { id: 'blocks', num: '2', title: 'Building blocks', weeks: 'Weeks 3–7', groups: [
    { title: 'Load balancing', lessons: [
      ['load-balancer', 'Load Balancer', 1],
      ['lb-algorithms', 'LB algorithms, L4 vs L7', 1],
    ]},
    { title: 'Caching', lessons: [
      ['caching', 'Cache: hit, miss aur Redis', 1],
      ['caching-strategies', 'Cache strategies aur eviction', 1],
      ['cdn', 'CDN (Content Delivery Network)', 1],
    ]},
    { title: 'Databases', lessons: [
      ['sql-vs-nosql', 'Databases: SQL aur NoSQL family', 1],
      ['db-internals', 'Indexes, B-tree aur LSM tree', 1],
      ['replication', 'Database replication', 1],
      ['sharding', 'Partitioning aur sharding', 1],
      ['consistent-hashing', 'Consistent hashing', 1],
    ]},
    { title: 'Async and real-time', lessons: [
      ['queues', 'Message queues', 1],
      ['kafka', 'Kafka aur event streams', 1],
      ['realtime', 'Polling, SSE, WebSockets, webhooks', 1],
    ]},
    { title: 'More blocks', lessons: [
      ['object-storage', 'Object storage aur pre-signed URLs', 1],
      ['rate-limiting', 'Rate limiting', 1],
      ['unique-ids', 'Unique ID generation', 1],
      ['search', 'Search aur inverted index', 1],
      ['ds-for-scale', 'Bloom filter, HyperLogLog, Geohash', 1],
      ['coordination', 'Leader election, locks, Redis Sentinel', 1],
      ['resilience', 'API gateway, retries, circuit breaker', 1],
    ]},
  ]},

  { id: 'theory', num: '3', title: 'Theory, simply', weeks: 'Weeks 8–9', groups: [
    { title: null, lessons: [
      ['cap', 'CAP aur PACELC', 1],
      ['consistency', 'Consistency models aur quorums', 1],
      ['distributed-tx', 'Sagas aur distributed transactions', 1],
      ['consensus', 'Consensus, Raft aur clocks', 1],
      ['architecture-styles', 'Monolith, microservices, event-driven', 1],
      ['big-data', 'Batch vs stream processing', 1],
      ['operations', 'Observability, deployments, security', 1],
    ]},
  ]},

  { id: 'napkin', num: '4', title: 'Napkin maths', weeks: 'Week 10', groups: [
    { title: null, lessons: [
      ['numbers', 'Yaad rakhne wale numbers', 1],
      ['estimation-recipe', '5-step estimation recipe', 1],
      ['estimation-examples', 'Worked examples', 1],
    ]},
  ]},

  { id: 'decide', num: '5', title: 'Decision playbook', weeks: 'Week 10', groups: [
    { title: null, lessons: [
      ['decide-db', 'SQL ya NoSQL?', 1],
      ['decide-messaging', 'Queue, Kafka ya pub/sub?', 1],
      ['decide-realtime', 'Polling, SSE ya WebSockets?', 1],
      ['decide-cache', 'Cache chahiye? Kaunsi strategy?', 1],
      ['decide-sync-async', 'Sync ya async?', 1],
      ['decide-quick', 'Quick decisions', 1],
      ['decide-servers', 'Kitne servers chahiye?', 1],
    ]},
  ]},

  { id: 'patterns', num: '6', title: 'Repeating patterns', weeks: 'Week 11', groups: [
    { title: null, lessons: [
      ['pattern-reads', 'Scaling reads', 1],
      ['pattern-writes', 'Scaling writes', 1],
      ['pattern-fanout', 'Real-time updates aur fan-out', 1],
      ['pattern-contention', 'Contention: sab ek hi cheez chahte hain', 1],
      ['pattern-multistep', 'Multi-step processes', 1],
      ['pattern-blobs', 'Large blobs (files, videos)', 1],
      ['pattern-long-tasks', 'Long-running tasks', 1],
      ['pattern-spikes', 'Traffic spikes aur hot keys', 1],
      ['pattern-proximity', 'Proximity search ("near me")', 1],
    ]},
  ]},

  { id: 'framework', num: '7', title: 'Design framework', weeks: 'Week 11', groups: [
    { title: null, lessons: [
      ['delivery-framework', 'Kisi bhi system ko design karne ka method', 1],
    ]},
  ]},

  { id: 'systems', num: '8', title: 'Real systems', weeks: 'Weeks 12–20', groups: [
    { title: 'Starter', lessons: [
      ['url-shortener', 'URL shortener (Bitly)', 1],
      ['design-rate-limiter', 'Rate limiter', 1],
      ['design-id-kv', 'Unique ID generator aur KV store', 1],
      ['design-pastebin', 'Pastebin (text share service)', 1],
      ['design-notifications', 'Notification system', 1],
    ]},
    { title: 'Intermediate', lessons: [
      ['design-whatsapp', 'WhatsApp / chat', 1],
      ['design-feed', 'Instagram / Twitter feed', 1],
      ['design-youtube', 'YouTube / Netflix', 1],
      ['design-drive', 'Google Drive / Dropbox', 1],
      ['design-typeahead', 'Search autocomplete', 1],
      ['design-bookmyshow', 'BookMyShow', 1],
      ['design-delivery', 'Zomato / Swiggy', 1],
      ['design-crawler', 'Web crawler', 1],
    ]},
    { title: 'Advanced', lessons: [
      ['design-uber', 'Uber / Ola', 1],
      ['design-maps', 'Google Maps', 1],
      ['design-search', 'Google Search', 1],
      ['design-hotstar', 'JioHotstar live cricket', 1],
      ['design-payments', 'Payments: UPI, Paytm, Razorpay', 1],
      ['design-llm-chat', 'ChatGPT / Claude', 1],
      ['design-docs', 'Google Docs', 1],
      ['design-topk', 'Top-K aur leaderboards', 1],
    ]},
  ]},

  { id: 'resources', num: '+', title: 'Resources', weeks: '', groups: [
    { title: null, lessons: [
      ['blogs', 'Engineering blogs aur papers', 1],
    ]},
  ]},

  /* ---- Track 2: AI Agents (shown under the "AI Agents" tab) ---- */
  { id: 'ai-llm', num: 'A1', track: 'ai', title: 'LLM basics', weeks: '', groups: [
    { title: null, lessons: [
      ['ai-what-is-llm', 'LLM kya hai? Next-token prediction', 1],
      ['ai-tokenization', 'Tokens, tokenization aur embeddings', 1],
      ['ai-buzzwords', 'AI buzzwords, simple bhasha mein', 1],
    ]},
  ]},
  { id: 'ai-transformer', num: 'A2', track: 'ai', title: 'Transformer from scratch', weeks: '', groups: [
    { title: null, lessons: [
      ['ai-transformer-overview', 'Transformer: poori picture', 1],
      ['ai-positional-encoding', 'Positional encoding', 1],
      ['ai-attention', 'Self-attention: Q, K, V haath se', 1],
      ['ai-multihead', 'Multi-head attention, encoder aur decoder', 1],
      ['ai-transformer-e2e', 'End-to-end: ek sentence ka safar', 1],
    ]},
  ]},
  { id: 'ai-training', num: 'A3', track: 'ai', title: 'Training aur efficiency', title_en: 'Training and efficiency', weeks: '', groups: [
    { title: null, lessons: [
      ['ai-training-finetuning', 'Pre-training, fine-tuning, RLHF', 1],
      ['ai-lora', 'LoRA aur QLoRA: matrix maths', 1],
      ['ai-quantization', 'Precision aur quantization (32, 16, 8, 4, 2 bit)', 1],
    ]},
  ]},
  { id: 'ai-context', num: 'A4', track: 'ai', title: 'Prompts aur context', title_en: 'Prompts and context', weeks: '', groups: [
    { title: null, lessons: [
      ['ai-prompts', 'Prompts aur prompt ke types', 1],
      ['ai-context', 'Context window aur context engineering', 1],
      ['ai-rag', 'RAG aur vector search', 1],
    ]},
  ]},
  { id: 'ai-agents', num: 'A5', track: 'ai', title: 'Agents', weeks: '', groups: [
    { title: null, lessons: [
      ['ai-agents', 'Agent kya hai? Loop, tools, MCP', 1],
      ['ai-harness', 'Harness aur harness engineering (playground)', 1],
      ['ai-agent-patterns', 'Multi-agent, evals aur guardrails', 1],
      ['ai-frameworks', 'LangChain, LangGraph, CrewAI aur baaki', 1],
    ]},
  ]},
];

/* What each upcoming lesson will cover, shown on its "coming soon" page. */
window.COMING_SOON_NOTES = {
  'sql-vs-nosql': 'Relational, key-value, document, wide-column, graph aur vector databases, sab access pattern ke hisaab se.',
  'replication': 'Leader-follower, replication lag, read-your-own-writes, failover aur split brain.',
  'sharding': 'Shard key kaise chunein, hot shards, resharding, aur cross-shard queries.',
  'kafka': 'Topics, partitions, offsets, consumer groups, aur queue vs log ka asli farak.',
  'design-uber': 'Location firehose, H3 geo index, matching, trip state machine aur surge pricing.',
  'design-llm-chat': 'GPU scheduling, SSE streaming, token rate limits, prompt orchestration aur vector DB.',
  'design-payments': 'Idempotency keys, double-entry ledger, UPI flow, timeouts aur reconciliation.',
  'design-hotstar': 'Crores of viewers, CDN polling for live score, pre-scaling aur graceful degradation.',
};

/* English titles, used when the reader switches the site to English. */
window.TITLES_EN = {
  'welcome': 'How to use this course', 'what-is-system-design': 'What is system design?', 'how-the-web-works': 'You typed xyz.com. How did the page appear?',
  'tcp-udp-https': 'TCP, UDP and HTTPS', 'crypto-keys': 'Public key, private key and key exchange', 'ip-and-ports': 'IP addresses and ports', 'http-versions': 'HTTP/1.1, HTTP/2, HTTP/3',
  'proxies': 'Forward proxy vs reverse proxy', 'what-is-api': 'What is an API? REST basics', 'pagination-idempotency': 'Pagination and idempotency',
  'graphql-grpc': 'REST vs GraphQL vs gRPC', 'auth-basics': 'AuthN, AuthZ, JWT, OAuth', 'scalability': 'Scalability: vertical vs horizontal',
  'availability-spof': 'Availability, nines and SPOF', 'latency-throughput': 'Latency, throughput and p99', 'concurrency-parallelism': 'Concurrency vs parallelism',
  'load-balancer': 'Load balancer', 'lb-algorithms': 'Load balancing algorithms, L4 vs L7', 'caching': 'Cache: hit, miss and Redis',
  'caching-strategies': 'Cache strategies and eviction', 'cdn': 'CDN (Content Delivery Network)', 'sql-vs-nosql': 'Databases: SQL and the NoSQL family',
  'db-internals': 'Indexes, B-trees and LSM trees', 'replication': 'Database replication', 'sharding': 'Partitioning and sharding',
  'consistent-hashing': 'Consistent hashing', 'queues': 'Message queues', 'kafka': 'Kafka and event streams', 'realtime': 'Polling, SSE, WebSockets, webhooks',
  'object-storage': 'Object storage and pre-signed URLs', 'rate-limiting': 'Rate limiting', 'unique-ids': 'Unique ID generation',
  'search': 'Search and the inverted index', 'ds-for-scale': 'Bloom filter, HyperLogLog, Geohash', 'coordination': 'Leader election, locks, Redis Sentinel',
  'resilience': 'API gateway, retries, circuit breaker', 'cap': 'CAP and PACELC', 'consistency': 'Consistency models and quorums',
  'distributed-tx': 'Sagas and distributed transactions', 'consensus': 'Consensus, Raft and clocks', 'architecture-styles': 'Monolith, microservices, event-driven',
  'big-data': 'Batch vs stream processing', 'operations': 'Observability, deployments, security', 'numbers': 'Numbers worth remembering',
  'estimation-recipe': 'A 5-step estimation recipe', 'estimation-examples': 'Worked examples', 'decide-db': 'SQL or NoSQL?',
  'decide-messaging': 'Queue, Kafka or pub/sub?', 'decide-realtime': 'Polling, SSE or WebSockets?', 'decide-cache': 'Do you need a cache? Which strategy?',
  'decide-sync-async': 'Sync or async?', 'decide-quick': 'Quick decisions', 'decide-servers': 'How many servers do you need?',
  'pattern-reads': 'Scaling reads', 'pattern-writes': 'Scaling writes', 'pattern-fanout': 'Real-time updates and fan-out',
  'pattern-contention': 'Contention: everyone wants the same thing', 'pattern-multistep': 'Multi-step processes', 'pattern-blobs': 'Large blobs (files, videos)',
  'pattern-long-tasks': 'Long-running tasks', 'pattern-spikes': 'Traffic spikes and hot keys', 'pattern-proximity': 'Proximity search ("near me")',
  'delivery-framework': 'A method to design any system', 'url-shortener': 'URL shortener (Bitly)', 'design-rate-limiter': 'Rate limiter',
  'design-id-kv': 'Unique ID generator and KV store', 'design-pastebin': 'Pastebin (text sharing service)', 'design-notifications': 'Notification system',
  'design-whatsapp': 'WhatsApp / chat', 'design-feed': 'Instagram / Twitter feed', 'design-youtube': 'YouTube / Netflix', 'design-drive': 'Google Drive / Dropbox',
  'design-typeahead': 'Search autocomplete', 'design-bookmyshow': 'BookMyShow (ticket booking)', 'design-delivery': 'Zomato / Swiggy', 'design-crawler': 'Web crawler',
  'design-uber': 'Uber / Ola', 'design-maps': 'Google Maps', 'design-search': 'Google Search', 'design-hotstar': 'JioHotstar live cricket',
  'design-payments': 'Payments: UPI, Paytm, Razorpay', 'design-llm-chat': 'ChatGPT / Claude', 'design-docs': 'Google Docs', 'design-topk': 'Top-K and leaderboards',
  'blogs': 'Engineering blogs and papers',
  'ai-what-is-llm': 'What is an LLM? Next-token prediction', 'ai-tokenization': 'Tokens, tokenization and embeddings', 'ai-buzzwords': 'AI buzzwords, in plain words',
  'ai-transformer-overview': 'The Transformer: the big picture', 'ai-positional-encoding': 'Positional encoding', 'ai-attention': 'Self-attention: Q, K, V by hand',
  'ai-multihead': 'Multi-head attention, encoder and decoder', 'ai-transformer-e2e': 'End to end: one sentence\'s journey', 'ai-training-finetuning': 'Pre-training, fine-tuning, RLHF',
  'ai-lora': 'LoRA and QLoRA: the matrix maths', 'ai-quantization': 'Precision and quantization (32, 16, 8, 4, 2 bit)', 'ai-prompts': 'Prompts and types of prompts',
  'ai-context': 'Context window and context engineering', 'ai-rag': 'RAG and vector search', 'ai-agents': 'What is an agent? Loop, tools, MCP',
  'ai-harness': 'Harness and harness engineering (playground)', 'ai-agent-patterns': 'Multi-agent, evals and guardrails', 'ai-frameworks': 'LangChain, LangGraph, CrewAI and more',
};
