import { SubscriberBase } from '../Subscriber';
import { hostReportError } from './hostReportError';

export const subscribeToPromise = <T>(promise: PromiseLike<T>) => (subscriber: SubscriberBase<T>) => {
  promise.then(
    (value) => {
      if (!subscriber.closed) {
        subscriber.next(value);
        subscriber.complete();
      }
    },
    (err: any) => subscriber.error(err)
  )
  .then(null, hostReportError);
  return subscriber;
};
