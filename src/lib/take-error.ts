import { Environment } from './environment';

/**
 * A custom error used to distinguish between error thrown by Take
 * and unhandled errors due to bad logic.
 */
export class TakeError extends Error {
  /**
   * Returns whether the given variable is an instance of UserError.
   */
  public static isTakeError(error: any): error is TakeError {
    return error instanceof TakeError;
  }

  public name: string = TakeError.name;

  public constructor(
    private env: Environment,
    message?: any,
    public internalError?: Error | string
  ) {
    super(message);
  }

  /**
   * Outputs the error message to the console.
   *
   * @param outputInternal Whether to also output the internal error if it was given.
   */
  public log(outputInternal: boolean = true) {
    this.env.utils.logError('Error:', this.message);
    if (outputInternal && this.internalError) {
      this.env.utils.logError('Internal error:');
      this.env.utils.logError(this.internalError);
    }
  }
}
