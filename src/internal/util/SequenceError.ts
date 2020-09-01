/** @prettier */
import { createErrorClass } from './createErrorClass';

export interface SequenceError extends Error {}

export interface SequenceErrorCtor {
  new (message: string): SequenceError;
}

/**
 * An error thrown when something is wrong with the sequence of
 * values arriving on the observable.
 *
 * @see {@link operators/single}
 *
 * @class SequenceError
 */
export const SequenceError: SequenceErrorCtor = createErrorClass('SequenceError', function (message: string) {
  this.message = message;
});
