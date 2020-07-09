import { SubscriberBase } from '../Subscriber';

export function subscribeToAsyncIterable<T>(asyncIterable: AsyncIterable<T>) {
  return (subscriber: SubscriberBase<T>) => {
    process(asyncIterable, subscriber).catch(err => subscriber.error(err));
  };
}

async function process<T>(asyncIterable: AsyncIterable<T>, subscriber: SubscriberBase<T>) {
  for await (const value of asyncIterable) {
    subscriber.next(value);
  }
  subscriber.complete();
}