import { spawn } from 'child_process';
import { Environment } from './environment';
import { IShellOptions } from './options';
import { TakeError } from './take-error';

// since this class is purely for mixing into the TakefileEnv object,
// the private members are all prefixed with `__` to reduce the pollution
// of the object.
/**
 * Provides various utilities that Takefiles can make use of.
 */
export class Utils {
  public constructor(
    // tslint:disable-next-line:variable-name
    private __env: Environment
  ) { }

  /**
   * Executes a given command, respecting `shellOptions.echo`.
   */
  public exec(...cmd: string[]): Promise<number> {
    return this.__exec(cmd);
  }

  /**
   * Executes a given command, supressing the command echo to the console
   * *regardless* of what `shellOptions.echo` is set to.
   */
  public execs(...cmd: string[]): Promise<number> {
    return this.__exec(cmd, false);
  }

  /**
   * Executes a given command, forcing the command echo to the console
   * *regardless* of what `shellOptions.echo` is set to.
   */
  public execo(...cmd: string[]): Promise<number> {
    return this.__exec(cmd, true);
  }

  /**
   * Provides a promise-based version of child_process.spawn that takes into
   * account the current `shellOptions`. The `opts` object will both be passed
   * to spawn to allow detailed config, and will be used to override the current
   * `shellOptions`.
   *
   * @param cmd The command to execute.
   * @param args The arguments to pass to spawn. If this is not an array, it will be used as
   * the `opts` parameter, and the actual `opts` parameter will be ignored.
   * @param opts The options to pass to spawn and to use to override `shellOptions`. Ignored if
   * `args` is not an array.
   */
  public shell(cmd: string, args?: string[] | Partial<IShellOptions>, opts?: Partial<IShellOptions>): Promise<number> {
    // if the opts argument was passed in second, reorganise parameters
    if (!Array.isArray(args)) {
      opts = args;
      args = undefined;
    }

    // build options object
    const copts = Object.assign({}, this.__env.options.shell); // make a copy so future assigns don't affect it
    if (opts) {
      // overwrite base options if others were given
      Object.assign(copts, opts);
    }

    // setup stdio
    copts.stdio = [
      process.stdin
    ];
    if (!copts.stdio[1]) { // only set it if we weren't given it
      if (this.__env.options.shell.printStdout) {
        (copts.stdio as any[])[1] = process.stdout;
      } else {
        (copts.stdio as any[])[1] = 'pipe';
      }
    }
    if (!copts.stdio[2]) { // only set it if we weren't given it
      if (this.__env.options.shell.printStderr) {
        (copts.stdio as any[])[2] = process.stderr;
      } else {
        (copts.stdio as any[])[2] = 'pipe';
      }
    }

    // launch and setup process
    const proc = spawn(cmd, args, opts);
    return new Promise<number>((resolve, reject) => {
      proc.on('exit', code => {
        // if we abort on error code, then reject non 0 codes
        if (copts.abortOnErrorCode) {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new TakeError('Target execution aborted: process exited with code', code));
          }
        } else {
          // otherwise just resolve regardless
          resolve(code);
        }
      });
    });
  }

  /**
   * Internal method for the exec variations.
   */
  private async __exec(cmd: string[], echo?: boolean): Promise<number> {
    if (cmd.length) {
      // if we were given the base command, run it
      return this.shell(cmd[0], cmd.slice(1), { echo });
    } else {
      // if nothing was given, act as a noop
      return 0;
    }
  }
}
