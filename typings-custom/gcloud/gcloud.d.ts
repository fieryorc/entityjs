// Copied from https://gist.github.com/yasupeke/6a9a8f2366db09ba10a2eb743d5ad365#file-gcloud-d-ts

/**
 * definitions for v0.30.2
 * docs here:
 * https://googlecloudplatform.github.io/gcloud-node/#/docs/v0.30.2/
 */
declare module GCloud {

    interface GCloudStatic {
        datastore(options?: IConfig): Datastore.IDatastore;
    }

    interface IConfig {
        projectId: string;
        keyFilename?: string;
        email?: string;
        credentials?: ICredentials;
        autoRetry?: boolean;
        maxRetries?: number;
    }

    interface ICredentials {
        client_email: string;
        private_key: string;
    }

    export namespace Datastore {
        interface IOptions extends IConfig {
            apiEndpoint?: string;
            namespace?: string;
        }

        interface IKey {
            id: number;
            name: string;
            path: string[];
            kind: string;
            parent: IKey;
        }

        interface IEntityInstrumentedData {
            name: string;
            value: string | number | boolean | Date | Buffer | any[];
            excludeFromIndexes?: boolean
        }

        interface IEntity<TData> {
            key: IKey,
            method?: string,
            data: TData | IEntityInstrumentedData[],
        }

        interface ITransaction {
            allocateIds(incompleteKey: IKey, n: number, callback: (err: Object, keys: IKey[], apiResponse: any) => void): void;
            delete(key: IKey | IKey[]): void;
            get(keys: IKey | IKey[], callback: (err: any, entity: any | any[]) => void): void;
            insert<T>(entity: IEntity<T>): void;
            rollback(callback: (err: any, apiResponse: any) => void): void;
            runQuery(q: IQuery, callabck: (err: any, entities: any[], nextQuery: IQuery, apiResponse: any) => void): void;
            save(entities: { key: IKey, data: any | any[] } | { key: IKey, data: any | any[] }[]): void;
            update(entities: { key: IKey, data: any | any[] } | { key: IKey, data: any | any[] }[]): void;
            upsert(entities: { key: IKey, data: any | any[] } | { key: IKey, data: any | any[] }[]): void;
        }

        interface IQuery {
            autoPaginate(autoPaginateVal?: boolean): IQuery;
            end(cursorToken: string): IQuery;
            filter(property: string, value: any): IQuery;
            filter(property: string, operator: string, value: any): IQuery;
            groupBy(properties: any[]): IQuery;
            hasAncestor(key: IKey): IQuery;
            limit(n: number): IQuery;
            offset(n: number): IQuery;
            order(property: string, options: { descending: boolean }): IQuery;
            select(fieldNames: string | string[]): IQuery;
            start(cursorToken: string): IQuery;
        }

        interface IStream<TData> extends NodeJS.ReadableStream {
            on(event: "error", callback: (err: any) => void): this;
            on(event: "data", callback: (data: TData) => void): this;
            on(event: "end", callback: () => void): this;
            on(event: string, callback: Function): this;
        }

        interface IDatastore {
            key(path?: string | string[]): IKey;
            key(options: { path?: string | string[]; namespace?: string; }): IKey;
            allocateIds(incompleteKey: IKey, n: number, callback: (err: Object, keys: IKey[], apiResponse: any) => void): void;
            createQuery(kind: string): IQuery;
            createQuery(namespace: string, kind: string): IQuery;
            delete(key: IKey | IKey[], callback: (err: any, apiResponse: any) => void): void;
            double(value: number): any;
            geoPoint(coordinates: { latitude: number, longitude: number }): any;
            get(keys: IKey | IKey[], callback: (err: any, entity: any | any[]) => void): void;
            insert<T>(entity: IEntity<T>, callback: (...args: any[]) => void): void;
            int(value: number): any;
            runInTransaction(fn: (transaction: ITransaction, done: () => void) => void, callback: (err: any) => void): void;
            runQuery<TEntityData>(q: IQuery, callback: (err: any, entities: IEntity<TEntityData>[], nextQuery: IQuery, apiResponse: any) => void): void;
            runQuery<TEntityData>(q: IQuery): IStream<IEntity<TEntityData>>;
            save<TEntityData>(entities: IEntity<TEntityData> | IEntity<TEntityData>[], callback: (err: any, apiResponse: any) => void): void;
            save<TEntityData>(entities: IEntity<TEntityData> | IEntity<TEntityData>[], callback: (err: any, apiResponse: any) => void): void;
            update<TEntityData>(entities: IEntity<TEntityData> | IEntity<TEntityData>[], callback: (err: any, apiResponse: any) => void): void;
            upsert<TEntityData>(entities: IEntity<TEntityData> | IEntity<TEntityData>[], callback: (err: any, apiResponse: any) => void): void;
        }
    }
}

declare module "gcloud" {
    export = gcloud;
}

declare var gcloud: GCloud.GCloudStatic;
