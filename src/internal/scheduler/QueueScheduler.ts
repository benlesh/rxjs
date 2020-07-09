/** @prettier */
import { AsyncScheduler } from './AsyncScheduler';
import { QueueAction } from './QueueAction';
import { SchedulerAction } from '../types';

export class QueueScheduler extends AsyncScheduler {
  protected createAction<T>(work: (this: SchedulerAction<T>, state?: T) => void) {
    return new QueueAction(this, work);
  }
}
