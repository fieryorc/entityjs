import { IDataCache } from "./interfaces";

interface CacheData<V> {
    time: Date;
    data: V;
}

/**
 * A simple timeout based cache. Data older than timeout will be purged from cache.
 */
export class TimedCache<K, V> implements IDataCache<K, V> {
    // timeout in seconds.
    private timeout: number;
    private dataCache: Map<K, CacheData<V>>;

    /**
     * Creates new instance of TimedCache.
     * @param timeout Timeout in milliseconds.
     */
    public constructor(timeout: number) {
        this.timeout = timeout;
        this.dataCache = new Map<K, CacheData<V>>();
    }

    public get(key: K): V {
        var cacheData = this._get(key);
        return cacheData && cacheData.data;
    }

    public set(key: K, value: V): void {
        this.dataCache.set(key, { 
            time: new Date(),
            data: value
        });
    }

    public has(key: K): boolean {
        var cacheData = this._get(key);
        return !!cacheData;
    }

    public delete(key: K): void {
        if (this.dataCache.has(key)) {
            this.dataCache.delete(key);
        }
    }

    private _get(key: K): CacheData<V> {
        var cacheData = this.dataCache.get(key);
        if (!cacheData) {
            return null;
        }
        var now = new Date().getTime();

        if (now - cacheData.time.getTime() > this.timeout) {
            this.dataCache.delete(key);
            return null;
        }

        return cacheData;
    }
}