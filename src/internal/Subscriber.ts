/** @prettier */
import { Observer, PartialObserver } from './types';
import { Subscription } from './Subscription';
import { rxSubscriber as rxSubscriberSymbol } from '../internal/symbol/rxSubscriber';
import { config } from './config';
import { hostReportError } from './util/hostReportError';
import { noop } from './util/noop';

export abstract class SubscriberBase<T> extends Subscription implements Observer<T> {
  protected _active = true;

  protected get isStopped() {
    return !this._active;
  }

  constructor() {
    // We need to obscure Subscription's constructor.
    super();
  }

  /** @internal */ syncErrorValue: any = null;
  /** @internal */ syncErrorThrown = false;

  next(value: T) {
    if (this._active) {
      this._next(value);
    }
  }

  protected abstract _next(value: T): void;

  error(err: any) {
    if (this._active) {
      this._active = false;
      this._error(err);
      this.unsubscribe();
    }
  }

  protected abstract _error(err: any): void;

  complete() {
    if (this._active) {
      this._active = false;
      this._complete();
      this.unsubscribe();
    }
  }

  protected abstract _complete(): void;

  unsubscribe() {
    this._active = false;
    super.unsubscribe();
  }
}

const EMPTY_SUBSCRIBER = (() => {
  class EmptySubscriber extends SubscriberBase<any> {
    _next() {
      // noop
    }
    _complete() {
      // noop
    }
    _error(err: any) {
      if (config.useDeprecatedSynchronousErrorHandling) {
        throw err;
      } else {
        hostReportError(err);
      }
    }
  }

  return new EmptySubscriber();
})();

/**
 * Implements the {@link Observer} interface and extends the
 * {@link Subscription} class. While the {@link Observer} is the public API for
 * consuming the values of an {@link Observable}, all Observers get converted to
 * a Subscriber, in order to provide Subscription-like capabilities such as
 * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
 * implementing operators, but it is rarely used as a public API.
 *
 * @class Subscriber<T>
 */
export class Subscriber<T> extends SubscriberBase<T> {
  [rxSubscriberSymbol]() {
    return this;
  }

  /**
   * A static factory for a Subscriber, given a (potentially partial) definition
   * of an Observer.
   * @param {function(x: ?T): void} [next] The `next` callback of an Observer.
   * @param {function(e: ?any): void} [error] The `error` callback of an
   * Observer.
   * @param {function(): void} [complete] The `complete` callback of an
   * Observer.
   * @return {Subscriber<T>} A Subscriber wrapping the (partially defined)
   * Observer represented by the given arguments.
   * @nocollapse
   *
   * @deprecated Subscribers should never be created directly. Do not use.
   */
  static create<T>(next?: (x?: T) => void, error?: (e?: any) => void, complete?: () => void): SubscriberBase<T> {
    return new SafeSubscriber(next, error, complete);
  }

  /**
   * @param {Observer|function(value: T): void} [destinationOrNext] A partially
   * defined Observer or a `next` callback function.
   * @param {function(e: ?any): void} [error] The `error` callback of an
   * Observer.
   * @param {function(): void} [complete] The `complete` callback of an
   * Observer.
   * @deprecated Subscribers should never be created directly. Do not use.
   */
  constructor(protected destination: SubscriberBase<any>) {
    super();
  }

  protected _next(value: T): void {
    this.destination.next(value);
  }

  protected _error(err: any): void {
    this.destination.error(err);
    this.unsubscribe();
  }

  protected _complete(): void {
    this.destination.complete();
    this.unsubscribe();
  }

  /** @deprecated This is an internal implementation detail, do not use. */
  protected _teardownAndReset(): Subscriber<T> {
    const { _parents } = this;
    this._parents = undefined;
    this.unsubscribe();
    this._closed = false;
    this._active = true;
    this._parents = _parents;
    return this;
  }
}

function defaultErrorHandler(err: any) {
  if (config.useDeprecatedSynchronousErrorHandling) {
    throw err;
  } else {
    hostReportError(err);
  }
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
export class SafeSubscriber<T> extends SubscriberBase<T> {
  private _destination: Partial<Observer<T>>;

  constructor(
    observerOrNext: PartialObserver<T> | ((value: T) => void) | null | void,
    error?: ((e?: any) => void) | null | void,
    complete?: (() => void) | null | void
  ) {
    super();

    if (observerOrNext != null && typeof observerOrNext === 'object') {
      this._destination = observerOrNext;
    } else {
      this._destination = {
        next: observerOrNext || noop,
        error: error || defaultErrorHandler,
        complete: complete || noop,
      };
    }
  }

  protected _next(value: T) {
    this._destination.next?.(value);
  }

  protected _error(err: any) {
    this._destination.error!(err);
  }

  protected _complete() {
    this._destination.complete?.();
  }
}
