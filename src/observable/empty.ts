import { Observable } from '../Observable';
import { Observer } from '../Observer';
import { IScheduler } from '../Scheduler';

const emptySubscriber = <T>(observer: Observer<T>) => observer.complete();

export const EMPTY_OBSERVABLE = new Observable<any>(emptySubscriber);

export const emptyWithScheduler = <T>(scheduler: IScheduler) =>
    new Observable(observer => scheduler.schedule(() => observer.complete()));

export const empty = <T>(scheduler?: IScheduler) =>
    scheduler
        ? emptyWithScheduler<T>(scheduler)
        : EMPTY_OBSERVABLE;