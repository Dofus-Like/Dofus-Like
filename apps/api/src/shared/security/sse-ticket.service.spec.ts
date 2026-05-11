import { ForbiddenException } from '@nestjs/common';
import { RedisContainer } from '@testcontainers/redis';
import type { StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';

import { RedisTestAdapter } from '../redis/testing/redis-test.adapter';

import { SseTicketService } from './sse-ticket.service';

describe('SseTicketService (integration)', () => {
  let container: StartedRedisContainer;
  let client: Redis;
  let service: SseTicketService;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    client = new Redis(container.getConnectionUrl());
  }, 60_000);

  afterAll(async () => {
    client.disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await client.flushdb();
    service = new SseTicketService(new RedisTestAdapter(client) as never);
  });

  it('stores a ticket in Redis with the correct payload and a 60 s TTL', async () => {
    const result = await service.issueTicket({
      userId: 'player-1',
      resourceId: 'session-1',
      resourceType: 'game-session',
    });

    expect(result.ticket).toBeTruthy();
    expect(result.expiresIn).toBe(60);

    const ttl = await client.ttl(`sse-ticket:${result.ticket}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);

    const stored = JSON.parse((await client.get(`sse-ticket:${result.ticket}`))!);
    expect(stored).toEqual({ userId: 'player-1', resourceId: 'session-1', resourceType: 'game-session' });
  });

  it('consumes a valid ticket and deletes it from Redis', async () => {
    const { ticket } = await service.issueTicket({
      userId: 'player-1',
      resourceId: 'session-1',
      resourceType: 'combat',
    });

    const payload = await service.consumeTicket(ticket, 'combat', 'session-1');

    expect(payload).toEqual({ userId: 'player-1', resourceId: 'session-1', resourceType: 'combat' });
    expect(await client.exists(`sse-ticket:${ticket}`)).toBe(0);
  });

  it('rejects consumption of a ticket that does not exist', async () => {
    await expect(service.consumeTicket('ghost-ticket', 'combat', 'session-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects consumption with wrong resource type', async () => {
    const { ticket } = await service.issueTicket({
      userId: 'player-1',
      resourceId: 'session-1',
      resourceType: 'game-session',
    });

    await expect(service.consumeTicket(ticket, 'combat', 'session-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
