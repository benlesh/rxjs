import { Observable } from '../Observable';
import { ISchedulerLike } from '../types';
import { Subscription } from '../Subscription';

export function scheduleArray<T>(input: ArrayLike<T>, scheduler: ISchedulerLike) {
  return new Observable<T>(subscriber => {
    const sub = new Subscription();
    let i = 0;
    sub.add(scheduler.schedule(function () {
      if (i === input.length) {
        subscriber.complete();
        return;
      }
      subscriber.next(input[i++]);
      if (!subscriber.closed) {
        sub.add(this.schedule());
      }
    }));
    return sub;
  });
}
