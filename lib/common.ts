declare module CommonTypes {

    interface IDictionary<T> {
        [key: string]: T;
    }

    // TODO: Delete
    interface PromiseError {
        message: string;
        code: number;
        stack: string;
    }
}
