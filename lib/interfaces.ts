import { Entity } from "./entity";

/**
 * Interface for representing a cache for DataContext.
 */
export interface IDataCache<K, V> {
    get(key: K): V;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): void;
}
