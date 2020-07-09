import { SubscriberBase } from './Subscriber';
import { TeardownLogic } from './types';

/***
 * @deprecated Internal implementation detail, do not use.
 */
export interface Operator<T, R> {
  call(subscriber: SubscriberBase<R>, source: any): TeardownLogic;
}
