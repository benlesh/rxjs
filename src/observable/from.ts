import { Observable } from '../Observable';
import { Observer } from '../Observer';
import { TeardownLogic } from '../Subscription';
import { empty, emptyWithScheduler } from './empty';
import { isArrayLike } from '../util/isArrayLike';
import { isArray } from '../util/isArray';
import { IScheduler } from '../Scheduler';
import { Subscription } from '../Subscription';
import { observable as Symbol_observable } from '../symbol/observable';

export type SubscriberFunction<T> = (observer: Observer<T>) => TeardownLogic;

export const getScalarSubscriber = <T>(value: T) => (observer: Observer<T>) => {
    observer.next(value);
    observer.complete();
};

export const getArrayLikeSubscriber = <T>(arr: ArrayLike<T>) => (observer: Observer<T>) => {
    for (let i = 0; i < arr.length && !observer.closed; i++) {
        observer.next(arr[i]);
    }
    observer.complete();
};

export const getPromiseSubscriber = <T>(promise: PromiseLike<T>) => {
    let resolvedSubscriber: SubscriberFunction<T>;
    return (observer: Observer<T>) => {
        if (resolvedSubscriber) {
            return resolvedSubscriber(observer);
        }
        promise.then(
            value => {
                resolvedSubscriber = getScalarSubscriber(value);
                observer.next(value);
                observer.complete();
            },
            err => observer.error(err)
        )
        .then(undefined, err => {
            setTimeout(() => { throw err; });
        });
    };
};

export const getIterableSubscriber = <T>(iterable: Iterable<T>) => (observer: Observer<T>) => {
    const iterator = iterable[Symbol.iterator]();
    let result: IteratorResult<T>;
    while (!observer.closed && !(result = iterator.next()).done) {
        observer.next(result.value);
    }
    observer.complete();
};

export const getObservableSubscriber = <T>(input: any) => (observer: Observer<T>) => {
    const source = input[Symbol_observable]();
    if (typeof source.subscribe !== 'function') {
        observer.error(new TypeError('Provided object does not correctly implement Symbol.observable'));
        return;
    }
    return source.subscribe(observer);
};

export function from<T>(input: any, scheduler?: IScheduler): Observable<T> {
    if (input instanceof Observable) {
        return fromRxObservable(input);
    }

    if (input && typeof input[Symbol_observable] === 'function') {
        return fromObservable(input);
    }

    if (isArray(input) || typeof input === 'string' || isArrayLike(input)) {
        return (scheduler)
            ? fromArrayLikeWithScheduler(input, scheduler)
            : fromArrayLike(input);
    }

    if (input[Symbol.iterator]) {
        return (scheduler)
            ? fromIterableWithScheduler(input, scheduler)
            : fromIterable(input);
    }

    throw new Error('input is not Observable');
}

export function fromRxObservable<T>(input: Observable<T>) {
    return input;
}

export function fromObservable<T>(input: any) {
    return new Observable<T>(getObservableSubscriber(input));
}

export function fromArrayLike<T>(input: ArrayLike<T>): Observable<T> {
    switch (input.length) {
        case 0:
            return empty() as Observable<T>;
        case 1:
            return fromScalar(input[0]);
        default:
            return new Observable(getArrayLikeSubscriber(input));
    }
}

export function fromIterable<T>(input: Iterable<T>) {
    return new Observable<T>(getIterableSubscriber(input));
}

export function fromPromise<T>(input: PromiseLike<T>) {
    return new Observable(getPromiseSubscriber(input));
}

export function fromScalar<T>(value: T) {
    return new Observable(getScalarSubscriber(value));
}

export function fromScalarWithScheduler<T>(value: T, scheduler: IScheduler) {
    return new Observable(observer => {
        return scheduler.schedule(() => {
            observer.next(value);
            observer.complete();
        });
    });
}

export function fromArrayLikeWithScheduler<T>(values: ArrayLike<T>, scheduler: IScheduler) {
    if (values.length === 0) {
        return emptyWithScheduler(scheduler);
    }

    if (values.length === 1) {
        return fromScalarWithScheduler(values[0], scheduler);
    }
    return new Observable(observer => {
        let i = 0;
        let subscription = new Subscription();

        const scheduleNext = () => subscription.add(scheduler.schedule(() => {
            if (!observer.closed) {
                const index = i++;
                if (index < values.length) {
                    observer.next(values[index]);
                    scheduleNext();
                } else {
                    observer.complete();
                }
            }
        }));

        scheduleNext();

        return subscription;
    });
}

export function fromIterableWithScheduler<T>(input: Iterable<T>, scheduler: IScheduler) {
    return new Observable<T>(observer => {

        const iterator = input[Symbol.iterator]();
        const subscription = new Subscription();

        const scheduleNext = () => subscription.add(scheduler.schedule(() => {
            if (!observer.closed) {
                const result = iterator.next();
                if (!result.done) {
                    observer.next(result.value);
                    scheduleNext();
                } else {
                    observer.complete();
                }
            }
        }));

        scheduleNext();

        return subscription;
    });
}