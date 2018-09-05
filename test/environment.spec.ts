import { expect } from 'chai';
import 'mocha';
import { Environment } from '../src/lib/environment';
import { Namespace } from '../src/lib/namespace';
import { DefaultOptions } from '../src/lib/options';

describe('Environment', function() {
  it('should construct with the correct properties', function() {
    const env = new Environment(DefaultOptions());

    expect(env).to.be.instanceOf(Environment);
    expect(env.root).to.be.instanceOf(Namespace);
    expect(env.options).to.have.same.keys(DefaultOptions());
  })
});
