import { Observable } from '../Observable';
import { SchedulerLike } from '../types';
import { executeSchedule } from '../util/executeSchedule';

export function schedulePromise<T>(input: PromiseLike<T>, scheduler: SchedulerLike): Observable<T> {
  return new Observable((subscriber) => {
    return executeSchedule(subscriber, scheduler, () => {
      input.then(
        (value) => {
          executeSchedule(subscriber, scheduler, () => {
            subscriber.next(value);
            executeSchedule(subscriber, scheduler, () => subscriber.complete());
          });
        },
        (err) => {
          executeSchedule(subscriber, scheduler, () => subscriber.error(err));
        }
      );
    });
  });
}
