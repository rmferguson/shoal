// TOKEN_STORE=memory (default) uses a Map.
// TOKEN_STORE=redis uses ioredis; set REDIS_URL (default: redis://localhost:6379).
// Key format: shoal:token:{sessionId}, TTL: 90 days.

import Redis from "ioredis";
import { config } from "../config.js";

export interface TokenStore {
  get(sessionId: string): Promise<string | null>;
  set(sessionId: string, value: string, ttlSeconds: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

class MemoryStore implements TokenStore {
  private map = new Map<string, { value: string; expiresAt: number }>();

  async get(sessionId: string): Promise<string | null> {
    const entry = this.map.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(sessionId);
      return null;
    }
    return entry.value;
  }

  async set(sessionId: string, value: string, ttlSeconds: number): Promise<void> {
    this.map.set(sessionId, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(sessionId: string): Promise<void> {
    this.map.delete(sessionId);
  }
}

class RedisStore implements TokenStore {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: true });
    this.client.on("error", (err) => {
      console.warn("[shoal] Redis error:", err.message);
    });
  }

  async get(sessionId: string): Promise<string | null> {
    return this.client.get(`shoal:token:${sessionId}`);
  }

  async set(sessionId: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`shoal:token:${sessionId}`, value, "EX", ttlSeconds);
  }

  async delete(sessionId: string): Promise<void> {
    await this.client.del(`shoal:token:${sessionId}`);
  }
}

export function createTokenStore(): TokenStore {
  if (config.tokenStore === "redis") {
    if (!process.env.REDIS_URL) {
      console.warn("[shoal] TOKEN_STORE=redis but REDIS_URL is not set; using redis://localhost:6379");
    }
    return new RedisStore(config.redis.url);
  }
  return new MemoryStore();
}
