/** @prettier */
import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';

import { OperatorFunction } from '../types';
import { lift } from '../util/lift';

/**
 * Compares all values of two observables in sequence using an optional comparator function
 * and returns an observable of a single boolean value representing whether or not the two sequences
 * are equal.
 *
 * <span class="informal">Checks to see of all values emitted by both observables are equal, in order.</span>
 *
 * ![](sequenceEqual.png)
 *
 * `sequenceEqual` subscribes to two observables and buffers incoming values from each observable. Whenever either
 * observable emits a value, the value is buffered and the buffers are shifted and compared from the bottom
 * up; If any value pair doesn't match, the returned observable will emit `false` and complete. If one of the
 * observables completes, the operator will wait for the other observable to complete; If the other
 * observable emits before completing, the returned observable will emit `false` and complete. If one observable never
 * completes or emits after the other completes, the returned observable will never complete.
 *
 * ## Example
 * figure out if the Konami code matches
 * ```ts
 * import { from, fromEvent } from 'rxjs';
 * import { sequenceEqual, bufferCount, mergeMap, map } from 'rxjs/operators';
 *
 * const codes = from([
 *   'ArrowUp',
 *   'ArrowUp',
 *   'ArrowDown',
 *   'ArrowDown',
 *   'ArrowLeft',
 *   'ArrowRight',
 *   'ArrowLeft',
 *   'ArrowRight',
 *   'KeyB',
 *   'KeyA',
 *   'Enter', // no start key, clearly.
 * ]);
 *
 * const keys = fromEvent(document, 'keyup').pipe(map(e => e.code));
 * const matches = keys.pipe(
 *   bufferCount(11, 1),
 *   mergeMap(
 *     last11 => from(last11).pipe(sequenceEqual(codes)),
 *   ),
 * );
 * matches.subscribe(matched => console.log('Successful cheat at Contra? ', matched));
 * ```
 *
 * @see {@link combineLatest}
 * @see {@link zip}
 * @see {@link withLatestFrom}
 *
 * @param {Observable} compareTo The observable sequence to compare the source sequence to.
 * @param {function} [comparator] An optional function to compare each value pair
 * @return {Observable} An Observable of a single boolean value representing whether or not
 * the values emitted by both observables were equal in sequence.
 * @name sequenceEqual
 */
export function sequenceEqual<T>(
  compareTo: Observable<T>,
  comparator: (a: T, b: T) => boolean = (a, b) => a === b
): OperatorFunction<T, boolean> {
  return (source: Observable<T>) =>
    lift(source, function (this: Subscriber<boolean>, source: Observable<T>) {
      const subscriber = this;
      // The state for the source observable
      const aState = createState<T>();
      // The state for the compareTo observable;
      const bState = createState<T>();

      /** A utility to emit and complete */
      const emit = (isEqual: boolean) => {
        subscriber.next(isEqual);
        subscriber.complete();
      };

      /**
       * Creates a subscriber that subscribes to one of the sources, and compares its collected
       * state -- `selfState` -- to the other source's collected state -- `otherState`. This
       * is used for both streams.
       */
      const createSubscriber = (selfState: SequenceState<T>, otherState: SequenceState<T>) => {
        const sequenceEqualSubscriber = new SequenceEqualSubscriber(
          subscriber,
          (a: T) => {
            const { buffer, complete } = otherState;
            if (buffer.length === 0) {
              // If there's no values in the other buffer...
              if (complete) {
                // ... and the other stream is complete, we know
                // this isn't a match, because we got one more value.
                emit(false);
              } else {
                // Otherwise, we push onto our buffer, so when the other
                // stream emits, it can pull this value off our buffer and check it
                // at the appropriate time.
                selfState.buffer.push(a);
              }
            } else {
              // If the other stream *does* have values in it's buffer,
              // pull the oldest one off so we can compare it to what we
              // just got.
              const b = buffer.shift()!;

              // Call the comparator. It's a user function, so we have to
              // capture the error appropriately.
              let result: boolean;
              try {
                result = comparator(a, b);
              } catch (err) {
                subscriber.error(err);
                return;
              }

              if (!result) {
                // If it wasn't a match, emit `false` and complete.
                emit(false);
              }
            }
          },
          () => {
            // Or observable completed
            selfState.complete = true;
            const { complete, buffer } = otherState;
            if (complete) {
              // If the other observable is also complete, and there's
              // still stuff left in their buffer, it doesn't match, if their
              // buffer is empty, then it does match. This is because we can't
              // possibly get more values here anymore.
              emit(buffer.length === 0);
            }
            // Be sure to clean up our stream as soon as possible if we can.
            sequenceEqualSubscriber?.unsubscribe();
          }
        );

        return sequenceEqualSubscriber;
      };

      // Subscribe to each source.
      source.subscribe(createSubscriber(aState, bState));
      compareTo.subscribe(createSubscriber(bState, aState));
    });
}

/**
 * A simple structure for the data used to test each sequence
 */
interface SequenceState<T> {
  /** A temporary store for arrived values before they are checked */
  buffer: T[];
  /** Whether or not the sequence source has completed. */
  complete: boolean;
}

/**
 * Creates a simple structure that is used to represent
 * data used to test each sequence.
 */
function createState<T>(): SequenceState<T> {
  return {
    buffer: [],
    complete: false,
  };
}

// TODO: Combine with other implementations that are identical.
class SequenceEqualSubscriber<T> extends Subscriber<T> {
  constructor(destination: Subscriber<any>, protected _next: (value: T) => void, protected _complete: () => void) {
    super(destination);
  }
}
