/** @prettier */

import { UnsubscriptionError } from './util/UnsubscriptionError';
import { SubscriptionLike, TeardownLogic } from './types';

export class Subscription implements SubscriptionLike {
  /**
   * @nocollapse
   * @deprecated This is for internal use only. Use regular {@link Subscription}
   */
  static EMPTY = (() => {
    const empty = new Subscription();
    empty._closed = true;
    return empty;
  })();

  protected _closed = false;

  private _children?: Subscription[];

  protected _parents?: Subscription[];

  get closed() {
    return this._closed;
  }

  constructor(private _teardownLogic?: TeardownLogic) {}

  protected _teardown() {
    const { _teardownLogic } = this;
    if (_teardownLogic) {
      if (typeof _teardownLogic === 'function') {
        _teardownLogic();
      } else {
        _teardownLogic.unsubscribe();
      }
    }
  }

  private _addParent(parent: Subscription) {
    this._parents = this._parents ?? [];
    this._parents.push(parent);
  }

  add(teardown: TeardownLogic): Subscription {
    if (teardown && teardown !== this) {
      if (this.closed) {
        if (typeof teardown === 'function') {
          teardown();
        } else {
          teardown.unsubscribe();
        }
        return this;
      } else {
        const childSubs = teardown instanceof Subscription ? teardown : new Subscription(teardown);
        childSubs._addParent(this);
        this._children = this._children ?? [];
        this._children.push(childSubs);
        return childSubs;
      }
    }
    return this;
  }

  remove(childSubs: Subscription): void {
    if (!this.closed) {
      const { _children } = this;
      if (_children) {
        const index = _children.indexOf(childSubs);
        if (index >= 0) {
          _children.splice(index, 1);
        }
      }
    }
  }

  unsubscribe() {
    if (!this.closed) {
      this._closed = true;
      this._unsubscribe();
    }
  }

  protected _unsubscribe() {
    // Leave parents
    const { _parents, _children } = this;
    let errors: any[] | undefined;
    if (_parents) {
      while (_parents.length > 0) {
        _parents.shift()!.remove(this);
      }
    }

    // Unsub children
    if (_children) {
      while (_children.length > 0) {
        try {
          _children.shift()!.unsubscribe();
        } catch (err) {
          errors = errors ?? [];
          errors.push(err);
        }
      }
    }

    // Execute any wrapped teardown logic
    // or subclass's teardown logic.
    try {
      this._teardown();
    } catch (err) {
      errors = errors ?? [];
      errors.push(err);
    }

    if (errors) {
      throw new UnsubscriptionError(flattenUnsubscriptionErrors(errors));
    }
  }
}

export function isSubscription(value: any): value is Subscription {
  return value && typeof value.add === 'function' && typeof value.unsubscribe === 'function';
}

function flattenUnsubscriptionErrors(errors: any[]) {
  return errors.reduce((errs, err) => errs.concat(err instanceof UnsubscriptionError ? err.errors : err), []);
}
