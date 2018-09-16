import minimatch from 'minimatch';
import { Environment } from './environment';
import { Namespace } from './namespace';
import { TakeError } from './take-error';
import { RootTargetIndex, RootTargetName, Target, TargetBatchTree, TargetMatchData } from './target';

export interface NodeExecData {
  /**
   * The target itself.
   */
  target: Target;
  /**
   * The arguments to execute the target with.
   */
  args: string[];
  /**
   * The matched name of the target.
   */
  match: TargetMatchData;
}

export interface DependencyNode {
  /**
   * The display name of the target.
   */
  dispName: string;
  /**
   * The execute data for this node.
   */
  execData: NodeExecData;
  /**
   * The dependencies to execute first.
   */
  leaves: DependencyNode[];
  /**
   * Whether to actually execute the dependency or not.
   */
  execute: boolean;
  /**
   * Whether this node causes the tree to become cyclic.
   */
  cyclic: boolean;
}

export class Runner {
  public constructor(
    private env: Environment,
    private targets: TargetBatchTree
  ) { }

  /**
   * Executes a target against the current task object with optional argument.
   */
  public async execute(target: Namespace): Promise<void> {
    // build dependency tree
    const [tree, safe] = this.buildDependencyTree(target);

    // execute tree
    if (!safe) {
      throw new TakeError(this.env, 'Cyclic target dependency detected, aborting');
    } else {
      await this.execNode(tree);
    }
  }

  /**
   * Constructs the dependency tree. It will take into account multiple occurences
   * of a target and not process them fully.
   *
   * @param ns The target to work off.
   * @param parent The parent node.
   * @param path The path the tree took to get to this node. Used for detecting cyclic dependencies.
   * @param foundTargets The hashmap of found dependencies. Used to ignore dupilcates.
   * @returns The fully constructed node.
   */
  public buildDependencyTree(
    ns: Namespace, parent?: Namespace,
    path: Namespace[] = [], foundTargets: Record<string, boolean> = {}
  ): [DependencyNode, boolean] {
    // get copy of path to prevent mutation
    path = path.slice();

    // if parent was given, add it to the path
    if (parent) {
      path.push(parent);
    }

    // current node
    const node: DependencyNode = {
      dispName: ns.isRoot ? RootTargetName : ns.toString(true),
      execData: this.getTask(ns),
      leaves: [],
      execute: false,
      cyclic: false
    };

    // whether the tree is safe to execute
    let safe = true;

    // only execute the dependency to the tree if we need to
    if (!foundTargets[ns.toString()]) {
      node.execute = true;
      foundTargets[ns.toString()] = true;
    }

    // detect whether this node makes the tree cyclic
    if (path.findIndex(value => value.equalTo(ns)) >= 0) {
      node.cyclic = true;
      safe = false;
    }

    // build leaves
    if (node.execData.target.deps) {
      for (const dep of node.execData.target.deps) {
        // if we should, build the dependencies
        if (node.execute && !node.cyclic) {
          const [depNode, depSafe] = this.buildDependencyTree(dep, ns, path, foundTargets);
          safe = safe && depSafe;
          node.leaves.push(depNode);
        }
      }
    }

    // return complete node
    return [node, safe];
  }

  /**
   * Executes a node.
   * Will execute its dependencies first, taking into account whether the node's
   * task config wanted it to be in parallel or not.
   *
   * @param node The node to execute.
   * @param args The argument to pass to the node's target.
   */
  private async execNode(node: DependencyNode): Promise<void> {
    // if we shouldn't execute this node, don't
    if (!node.execute) {
      return;
    }

    // if we have any leaves, execute them according to the task config
    if (node.leaves) {
      if (node.execData.target.parallelDeps) {
        // execute the leaves in parallel
        const deps: Array<Promise<void>> = [];
        for (const leaf of node.leaves) {
          deps.push(this.execNode(leaf));
        }

        // wait for all to complete
        await Promise.all(deps);
      } else {
        // execute the leaves in sequence
        for (const leaf of node.leaves) {
          await this.execNode(leaf);
        }
      }
    }

    // now the dependencies are done, execute the node itself
    await node.execData.target.execute(node.execData.match, node.execData.args);
  }

  /**
   * Converts the target string into the resolved task.
   *
   * @param name The target to search for.
   * @returns The resolved task, its arguments, and the matched name.
   */
  private getTask(name: Namespace): NodeExecData {
    if (name.isRoot) {
      if (!this.targets.exact[RootTargetIndex]) {
        throw new TakeError(this.env, 'Unable to find default target');
      }
      return {
        target: this.targets.exact[RootTargetIndex],
        args: name.args,
        match: {
          full: '',
          groups: []
        }
      };
    } else {
      // set up current state
      let ctarget: Target;
      let cmatch: TargetMatchData;
      let targets: TargetBatchTree = this.targets;

      // search for target in each part of the namespace
      for (const cns of name.names) {
        // perform search
        [ctarget, cmatch, targets] = this.searchForTarget(cns, targets, name);
      }

      return {
        target: ctarget!,
        args: name.args,
        match: cmatch!
      };
    }
  }

  private searchForTarget(
    cns: string, targets: TargetBatchTree, name: Namespace
  ): [Target, TargetMatchData, TargetBatchTree] {
    const match: TargetMatchData = {
      full: cns,
      groups: []
    };

    if (targets.exact[cns]) {
      return [targets.exact[cns], match, targets.exact[cns].children];
    }

    // search in regex matches
    for (const re of targets.regex) {
      const rmatch = cns.match(re.rule);
      if (rmatch) {
        match.groups = rmatch.slice(1);
        return [re.target, match, re.target.children];
      }
    }

    // search in glob matches
    for (const glob of targets.glob) {
      if (minimatch(cns, glob.rule)) {
        return [glob.target, match, glob.target.children];
      }
    }

    // if we couldn't find the target, then throw an error
    throw new TakeError(this.env, `Unable to find target ${name}`);
  }
}
