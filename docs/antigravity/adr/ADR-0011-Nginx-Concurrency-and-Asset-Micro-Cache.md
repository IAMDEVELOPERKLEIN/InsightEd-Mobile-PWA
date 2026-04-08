# ADR-0011: Nginx Concurrency Optimization & Binary Asset Micro-Cache

## Status
Accepted

## Context
The InsightEd VM (`20.24.58.49`) runs four Node.js backend processes under PM2, proxied by a single Nginx instance. As the platform scales toward concurrent multi-user access from Division Engineers (potentially hundreds of simultaneous sessions during DepEd reporting periods), three structural inefficiencies were identified:

### 1. Connection Ceiling
`worker_connections 768` with no `worker_rlimit_nofile` directive meant Nginx could not open more than the OS default of 1024 file descriptors per worker — effectively capping the server at ~768 simultaneous connections regardless of available CPU. Under load, new connections would be silently dropped.

### 2. Upstream TCP Thrash
All proxy_pass directives pointed to hardcoded `http://localhost:PORT/` without upstream keepalive. Nginx established and tore down a new TCP connection to Node.js **for every single proxied request**. On a server where Node.js and Nginx share the same loopback interface, this is measurable overhead — especially for high-frequency dashboard polling.

### 3. Binary Asset Read Amplification
The `GET /api/asset/:id` endpoint (introduced in ADR-0008) reads binary blobs from PostgreSQL's `unified_binaries` table and streams them to clients. Each read involves: Nginx → Node.js → pg driver → PostgreSQL heap → Node.js buffer → Nginx → client. For PDF previews and school photos, the same asset ID is frequently requested by multiple users. Without caching, every request triggers the full DB read cycle.

### 4. Disk I/O from Unbuffered Logging
Nginx's default unbuffered `access_log` performs a synchronous `write()` syscall per request. On a constrained 29 GB Azure disk already near capacity, this exacerbates both IOPS pressure and contributes to disk exhaustion when logs grow unchecked.

### 5. Broken Keepalive Map
The existing `$connection_upgrade` map used `'' close`, which set `Connection: close` on all non-WebSocket upstream requests. This **defeated keepalive** at the upstream level even if it had been configured — the upstream connection was explicitly closed after every response.

## Decision

### nginx.conf Changes
```nginx
worker_processes       auto;
worker_rlimit_nofile   8192;

events {
    worker_connections 4096;
    multi_accept       on;
    use                epoll;
}

# Fix keepalive map — '' was "close", now ""
map $http_upgrade $connection_upgrade {
    default  upgrade;
    ''       "";            # Empty = keepalive for plain HTTP
}

# Binary asset micro-cache
proxy_cache_path /var/cache/nginx/binary_cache
    levels=1:2 keys_zone=binary_cache:10m
    max_size=500m inactive=30m use_temp_path=off;

# Global proxy buffers (large binary transfers)
proxy_buffers              4 256k;
proxy_buffer_size          128k;
proxy_busy_buffers_size    256k;

# Buffered logging — 32 KB ring buffer, flushed every 1 minute
access_log /var/log/nginx/access.log combined buffer=32k flush=1m;
```

### stride.conf Changes

**Upstream Pools (keepalive 32)**
```nginx
upstream stride_backend     { server 127.0.0.1:3002; keepalive 32; }
upstream opdash_backend     { server 127.0.0.1:3001; keepalive 32; }
upstream staging_backend    { server 127.0.0.1:5001; keepalive 32; }
upstream production_backend { server 127.0.0.1:5000; keepalive 32; }
```
`keepalive 32` instructs each Nginx worker to maintain a pool of 32 idle keepalive connections to each upstream. On a loopback interface, this eliminates essentially all TCP connection overhead.

**Asset Micro-Cache Locations**
Added three regex location blocks (staging prefix, production prefix, legacy `/api/` prefix):
```nginx
location ~ ^/insighted-staging/api/asset/(.*)$ {
    proxy_pass            http://staging_backend/api/asset/$1;
    proxy_cache           binary_cache;
    proxy_cache_valid     200 10m;
    proxy_cache_valid     404 1m;
    proxy_cache_use_stale error timeout updating;
    proxy_cache_lock      on;       # Collapse concurrent identical requests
    proxy_cache_methods   GET;      # Only cache GET, not POST/PUT
    proxy_cache_key       "$request_uri";
    add_header            X-Cache-Status $upstream_cache_status;
    proxy_http_version    1.1;
    proxy_set_header      Connection "";   # Explicit keepalive for asset proxy
}
```
The `proxy_cache_lock on` directive is important: if 50 users request the same `asset/:id` simultaneously (a common pattern for shared school photos), only **one** request is forwarded to Node.js/PostgreSQL; the other 49 wait and receive the cached response.

**stub_status Monitoring Endpoint**
```nginx
location = /nginx_status {
    stub_status;
    allow 127.0.0.1;
    deny  all;
    access_log off;
}
```
Powers `check_nginx_concurrency.sh`.

## Alternatives Considered

**Redis-based caching**: A Redis layer in front of Node.js would cache at the application level. Rejected because Nginx-level caching requires zero application code changes and is faster (serves from disk/memory without invoking Node.js at all for cache hits).

**CDN (Azure CDN)**: Binary assets could be pushed to Azure CDN. Appropriate long-term, but rejected for immediate implementation because (a) assets in PostgreSQL binary storage do not have stable public URLs, and (b) the CDN integration requires changes to the asset serving pipeline.

**Larger worker_connections only**: Raising connections without fixing the keepalive map would have increased the FD ceiling but not eliminated TCP thrash. Both changes are necessary for the improvement to be effective.

## Consequences

- **Pros**:
  - Nginx can now handle ~4096 × `worker_count` concurrent connections (18 workers observed post-reload = ~73,728 theoretical maximum)
  - Repeated binary asset reads (school photos, PDF previews) served from Nginx memory after first request — zero PostgreSQL load on cache hits
  - Disk I/O reduced: access log writes batched in 32 KB buffer, flushed at most once per minute
  - `proxy_cache_lock` collapses stampede requests on the same asset ID
  - `use_temp_path=off` avoids double disk write for cache population

- **Cons / Risks**:
  - Cache max_size is 500 MB. At 93% disk usage, this needs monitoring — the cache will self-limit to 500 MB but must be accounted for in capacity planning.
  - 10-minute asset cache means a binary update (e.g., replaced school photo) won't be visible for up to 10 minutes. For the current use case (official DepEd documents) this is acceptable.
  - Ports 3001 (opdash) and 3002 (stride-dashboard) have upstream blocks but no active PM2 processes. Nginx will return `502 Bad Gateway` for those routes until the services are provisioned.

## Operational Scripts Added
- `check_nginx_concurrency.sh` — active connection count, cache stats, disk alerts, error log scan, endpoint sanity
- `diag_server.sh` — general PM2 + disk + endpoint health (introduced in server recovery)

## Files Changed
- `tmp_nginx.conf` → `/etc/nginx/nginx.conf` (applied live)
- `tmp_stride.conf` → `/etc/nginx/sites-enabled/stride.conf` (applied live)
- `check_nginx_concurrency.sh` (new, deployed to staging dir)
