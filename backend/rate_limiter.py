"""
CredVerify — Rate Limiting Middleware
Protects public verification and authentication endpoints against brute-force attacks and scraping.
Implements sliding-window rate limiting with standard RFC headers:
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  - X-RateLimit-Reset
  - Retry-After (on 429 HTTP response)
"""

import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Route-specific rate limits: (max_requests, window_seconds)
ROUTE_LIMITS: Dict[str, Tuple[int, int]] = {
    "/api/auth/login": (15, 60),      # 15 login attempts per minute per IP
    "/api/verify": (60, 60),          # 60 public verification checks per minute per IP
}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # client_ip -> route_prefix -> list of timestamps
        self.request_history: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))
        self._last_cleanup = time.time()

    def _get_client_ip(self, request: Request) -> str:
        # Check standard reverse proxy headers
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        if request.client:
            return request.client.host
        return "127.0.0.1"

    def _cleanup_old_records(self, now: float):
        """Purge entries older than 2 minutes to prevent unbounded memory growth."""
        if now - self._last_cleanup < 120:
            return
        self._last_cleanup = now
        cutoff = now - 120
        ips_to_delete = []
        for ip, routes in list(self.request_history.items()):
            for route, timestamps in list(routes.items()):
                self.request_history[ip][route] = [t for t in timestamps if t > cutoff]
            if not any(self.request_history[ip].values()):
                ips_to_delete.append(ip)
        for ip in ips_to_delete:
            del self.request_history[ip]

    async def dispatch(self, request: Request, call_next):
        # Only rate-limit configured sensitive endpoints
        path = request.url.path
        matched_prefix = None
        limit_config = None

        for prefix, config in ROUTE_LIMITS.items():
            if path == prefix or path.startswith(prefix + "/"):
                matched_prefix = prefix
                limit_config = config
                break

        if not limit_config or request.method == "OPTIONS":
            return await call_next(request)

        max_requests, window_seconds = limit_config
        now = time.time()
        self._cleanup_old_records(now)

        client_ip = self._get_client_ip(request)
        history = self.request_history[client_ip][matched_prefix]

        # Purge entries outside current sliding window
        window_start = now - window_seconds
        valid_timestamps = [t for t in history if t > window_start]
        self.request_history[client_ip][matched_prefix] = valid_timestamps

        remaining = max_requests - len(valid_timestamps)
        reset_time = int(valid_timestamps[0] + window_seconds - now) if valid_timestamps else window_seconds
        reset_time = max(1, reset_time)

        if len(valid_timestamps) >= max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Rate limit exceeded to ensure service security and prevent abuse.",
                    "limit": max_requests,
                    "window_seconds": window_seconds,
                    "retry_after_seconds": reset_time,
                },
                headers={
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + reset_time)),
                    "Retry-After": str(reset_time),
                },
            )

        # Record this request
        valid_timestamps.append(now)

        # Process downstream request
        response: Response = await call_next(request)

        # Attach informational rate limit headers
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining - 1))
        response.headers["X-RateLimit-Reset"] = str(int(now + window_seconds))

        return response
