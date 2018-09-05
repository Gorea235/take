import { expect } from 'chai';
import 'mocha';
import { Environment } from '../src/lib/environment';
import { DefaultOptions } from '../src/lib/options';
import { Target } from '../src/lib/target';

describe('Task', function() {
  let env: Environment;

  function initEach() {
    env = new Environment(DefaultOptions());
  }

  describe('#constructor', function() {
    beforeEach(initEach);

    it('should work', function() {
      const task = new Target('test', {}, env);
      expect(task).to.be.instanceOf(Target);
    });
  });

  describe('#processTaskConfig', function() {
    beforeEach(initEach);

    it('should process a single empty top-level task', function() {
      const tasks = Target.processTaskConfig({
        'target1': {}
      }, env);
      expect(tasks).have.key('target1');
      const task = tasks['target1'];
      expect(task).to.be.instanceOf(Target);
      expect(task.children).to.be.empty;
      expect(task.deps).to.be.empty;
      expect(task.desc).to.be.undefined;
      expect(task.parallelDeps).to.be.not.ok;
    });
  });
});
