import { fromArrayLike, fromArrayLikeWithScheduler } from './from';
import { IScheduler } from '../Scheduler';
import { isScheduler } from '../util/isScheduler';
import { Observable } from '../Observable';

export function of<T>(item1: T, scheduler?: IScheduler): Observable<T>;
export function of<T>(item1: T, item2: T, scheduler?: IScheduler): Observable<T>;
export function of<T>(item1: T, item2: T, item3: T, scheduler?: IScheduler): Observable<T>;
export function of<T>(item1: T, item2: T, item3: T, item4: T, scheduler?: IScheduler): Observable<T>;
export function of<T>(item1: T, item2: T, item3: T, item4: T, item5: T, scheduler?: IScheduler): Observable<T>;
export function of<T>(item1: T, item2: T, item3: T, item4: T, item5: T, item6: T, scheduler?: IScheduler): Observable<T>;
export function of<T>(...array: Array<T | IScheduler>): Observable<T>;
export function of<T>(...args: Array<T | IScheduler>) {
    const last = args[args.length - 1];
    if (isScheduler(last)) {
        return fromArrayLikeWithScheduler(args.slice(0, args.length - 2), last);
    }
    return fromArrayLike(args);
}