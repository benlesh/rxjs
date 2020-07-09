import { AsyncAction } from './AsyncAction';
import { AsyncScheduler } from './AsyncScheduler';
import { AnimationFrameAction } from './AnimationFrameAction';
import { SchedulerAction } from '../types';

export class AnimationFrameScheduler extends AsyncScheduler {
  protected createAction<T>(work: (this: SchedulerAction<T>, state?: T) => void) {
    return new AnimationFrameAction(this, work);
  }

  public flush(action?: AsyncAction<any>): void {

    this.active = true;
    this.scheduled = undefined;

    const {actions} = this;
    let error: any;
    let index: number = -1;
    action = action || actions.shift()!;
    let count: number = actions.length;

    do {
      if (error = action.execute(action.state, action.delay)) {
        break;
      }
    } while (++index < count && (action = actions.shift()));

    this.active = false;

    if (error) {
      while (++index < count && (action = actions.shift())) {
        action.unsubscribe();
      }
      throw error;
    }
  }
}
