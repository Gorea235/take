import { Environment } from './environment';
import { TakeError } from './take-error';

/**
 * Provides helpers methods for dealing with namespaces.
 */
export class Namespace {
  public static getRoot(env: Environment): Namespace {
    return new Namespace(env, []);
  }

  private constructor(
    private env: Environment,
    private path: string[],
    public args: string[] = []
  ) { }

  /**
   * Returns the parent namespace.
   * If this is the root namespace, returns itself.
   */
  public get parent(): Namespace {
    if (this.path.length) {
      return new Namespace(this.env, this.path.slice(0, this.path.length - 1));
    } else {
      return this;
    }
  }

  /**
   * Returns whether the namespace is the root or not.
   */
  public get isRoot(): boolean {
    return !this.path.length;
  }

  /**
   * Gets the list of names that make up this namespace.
   */
  public get names(): string[] {
    return this.path.slice();
  }

  /**
   * Resolves a namespace from another, or the current.
   * If the name is empty, the current or given namespace is returned.
   *
   * @param fullName The name to resolve.
   * @param cwns The namespace to resolve from. Defaults to the current namespace.
   * @returns The resolved namespace.
   */
  public resolve(fullName: string, cwns: Namespace = this): Namespace {
    const nss = this.env.options.namespaceSeparator; // shortcut

    // extract arguments and name
    const match = fullName.match(/^(.*)(?:\[([^[\]]*)\])?$/);
    let name: string;
    let args: string[];
    if (match) {
      name = match[1];
      args = typeof match[2] !== 'undefined' ? match[2].split(',') : [];
    } else {
      throw new TakeError(this.env, `'${fullName}' is an invalid target name`);
    }

    // check if this is an absolute namespace first
    let root: boolean = false;
    if (name.length) {
      if (name[0] === nss) {
        root = true;
      }
    } else {
      return cwns;
    }

    // split name into path list and strip empty ones
    let path: string[] = name.split(this.env.options.namespaceSeparator).filter(value => value);

    // if this isn't an absolute name, add the working namespace to it
    if (!root) {
      path = cwns.path.concat(path);
    }

    // resolve parent directives
    for (let i = 0; i < path.length; i++) {
      if (path[i] === this.env.options.namespaceParent) {
        // strip out the directive and previous item
        path.splice(i, 1);
        i--;

        if (i >= 0) {
          path.splice(i, 1);
          i--;
        }
      }
    }

    return new Namespace(this.env, path, args);
  }

  public equalTo(ns: Namespace, alsoArgs: boolean = false) {
    return this.toString(alsoArgs) === ns.toString(alsoArgs);
  }

  /**
   * Converts the list of namespace names into a single string.
   * Can optionally include arguments in string.
   */
  public toString(args: boolean = false): string {
    const nss = this.env.options.namespaceSeparator; // shortcut
    let argString = '';
    if (args && this.args.length) {
      argString = `[${this.args.join(',')}]`;
    }
    return nss + this.path.join(nss) + argString;
  }
}
