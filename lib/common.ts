declare module CommonTypes {

    interface IDictionary<T> {
        [key: string]: T;
    }

    interface PromiseError {
        message: string;
        code: number;
        stack: string;
    }
}
