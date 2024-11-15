"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("redis");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield redisClient.connect();
}))();
const SERVICE_API_KEY = process.env.SERVICE_API_KEY;
app.use(express_1.default.json());
// Authentication Middleware
app.use((req, res, next) => {
    const apiKey = req.header('x-api-key');
    if (apiKey !== SERVICE_API_KEY) {
        res.status(401).send('Unauthorized');
        return;
    }
    next();
});
// Proxy to Open Street Map with Redis caching
app.get('/osm', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { q } = req.query;
    if (!q) {
        res.status(400).send('Query parameter is required');
        return;
    }
    const cacheKey = `osm:${q}`;
    try {
        const cachedData = yield redisClient.get(cacheKey);
        if (cachedData) {
            res.send(JSON.parse(cachedData));
            return;
        }
        // Proxy to Open Street Map API
        const response = yield (0, node_fetch_1.default)(`https://nominatim.openstreetmap.org/search?q=${q}&format=json`);
        if (!response.ok) {
            throw new Error('Failed to fetch data from OpenStreetMap');
        }
        const osmResponse = yield response.json();
        // Cache the response
        yield redisClient.set(cacheKey, JSON.stringify(osmResponse), {
            EX: 3600,
        });
        res.send(osmResponse);
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
}));
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
