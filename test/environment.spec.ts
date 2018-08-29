import { expect } from 'chai';
import 'mocha';
import { Environment } from '../src/lib/environment';
import { Namespace } from '../src/lib/namespace';
import { Options } from '../src/lib/options';

describe('Environment', function(this) {
  it('should construct with the correct properties', function(this) {
    const env = new Environment(Options());

    expect(env).to.be.instanceOf(Environment);
    expect(env.ns).to.be.instanceOf(Namespace);
    expect(env.options).to.have.same.keys(Options());
  })
});
