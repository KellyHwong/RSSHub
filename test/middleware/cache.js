const supertest = require('supertest');
const Parser = require('rss-parser');
const parser = new Parser();
const wait = require('../../lib/utils/wait');
let server;

beforeAll(() => {
    process.env.CACHE_EXPIRE = 1;
    process.env.CACHE_CONTENT_EXPIRE = 3;
});

afterEach(() => {
    delete process.env.CACHE_TYPE;
    jest.resetModules();
    server.close();
});

afterAll(() => {
    delete process.env.CACHE_EXPIRE;
});

describe('cache', () => {
    it('memory', async () => {
        process.env.CACHE_TYPE = 'memory';
        server = require('../../lib/index').server;
        const request = supertest(server);

        const response1 = await request.get('/test/cache');
        const response2 = await request.get('/test/cache');

        const parsed1 = await parser.parseString(response1.text);
        const parsed2 = await parser.parseString(response2.text);

        delete parsed1.lastBuildDate;
        delete parsed2.lastBuildDate;
        expect(parsed2).toMatchObject(parsed1);

        expect(response2.status).toBe(200);
        expect(response2.headers['x-koa-memory-cache']).toBe('true');
        expect(response2.headers).not.toHaveProperty('x-koa-redis-cache');

        await wait(1 * 1000 + 100);
        const response3 = await request.get('/test/cache');
        expect(response3.headers).not.toHaveProperty('x-koa-redis-cache');
        expect(response3.headers).not.toHaveProperty('x-koa-memory-cache');
        const parsed3 = await parser.parseString(response3.text);

        await wait(3 * 1000 + 100);
        const response4 = await request.get('/test/cache');
        const parsed4 = await parser.parseString(response4.text);

        expect(parsed1.items[0].content).toBe('Cache1');
        expect(parsed2.items[0].content).toBe('Cache1');
        expect(parsed3.items[0].content).toBe('Cache1');
        expect(parsed4.items[0].content).toBe('Cache2');
    });

    it('redis', async () => {
        process.env.CACHE_TYPE = 'redis';
        server = require('../../lib/index').server;
        const request = supertest(server);

        const response1 = await request.get('/test/cache');
        const response2 = await request.get('/test/cache');

        const parsed1 = await parser.parseString(response1.text);
        const parsed2 = await parser.parseString(response2.text);

        delete parsed1.lastBuildDate;
        delete parsed2.lastBuildDate;
        expect(parsed2).toMatchObject(parsed1);

        expect(response2.status).toBe(200);
        expect(response2.headers['x-koa-redis-cache']).toBe('true');
        expect(response2.headers).not.toHaveProperty('x-koa-memory-cache');

        await wait(1 * 1000 + 100);
        const response3 = await request.get('/test/cache');
        expect(response3.headers).not.toHaveProperty('x-koa-redis-cache');
        expect(response3.headers).not.toHaveProperty('x-koa-memory-cache');
        const parsed3 = await parser.parseString(response3.text);

        await wait(3 * 1000 + 100);
        const response4 = await request.get('/test/cache');
        const parsed4 = await parser.parseString(response4.text);

        expect(parsed1.items[0].content).toBe('Cache1');
        expect(parsed2.items[0].content).toBe('Cache1');
        expect(parsed3.items[0].content).toBe('Cache1');
        expect(parsed4.items[0].content).toBe('Cache2');
    });

    it('redis with quit', async () => {
        process.env.CACHE_TYPE = 'redis';
        server = require('../../lib/index').server;
        const client = require('../../lib/index').cache;
        await client.quit();
        const request = supertest(server);

        const response1 = await request.get('/test/cache');
        const response2 = await request.get('/test/cache');

        const parsed1 = await parser.parseString(response1.text);
        const parsed2 = await parser.parseString(response2.text);

        expect(response2.status).toBe(200);
        expect(response2.headers).not.toHaveProperty('x-koa-redis-cache');
        expect(response2.headers).not.toHaveProperty('x-koa-memory-cache');

        expect(parsed1.items[0].content).toBe('Cache1');
        expect(parsed2.items[0].content).toBe('Cache2');
    });

    it('redis with error', async () => {
        process.env.CACHE_TYPE = 'redis';
        process.env.REDIS_URL = 'redis://wrongpath:6379';
        server = require('../../lib/index').server;
        const request = supertest(server);

        const response1 = await request.get('/test/cache');
        const response2 = await request.get('/test/cache');

        const parsed1 = await parser.parseString(response1.text);
        const parsed2 = await parser.parseString(response2.text);

        expect(response2.status).toBe(200);
        expect(response2.headers).not.toHaveProperty('x-koa-redis-cache');
        expect(response2.headers).not.toHaveProperty('x-koa-memory-cache');

        expect(parsed1.items[0].content).toBe('Cache1');
        expect(parsed2.items[0].content).toBe('Cache2');
    });

    it('no cache', async () => {
        process.env.CACHE_TYPE = '';
        server = require('../../lib/index').server;
        const request = supertest(server);

        const response1 = await request.get('/test/cache');
        const response2 = await request.get('/test/cache');

        const parsed1 = await parser.parseString(response1.text);
        const parsed2 = await parser.parseString(response2.text);

        expect(response2.status).toBe(200);
        expect(response2.headers).not.toHaveProperty('x-koa-redis-cache');
        expect(response2.headers).not.toHaveProperty('x-koa-memory-cache');

        expect(parsed1.items[0].content).toBe('Cache1');
        expect(parsed2.items[0].content).toBe('Cache2');
    });
});