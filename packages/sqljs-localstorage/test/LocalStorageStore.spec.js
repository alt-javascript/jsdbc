import { assert } from 'chai';
import LocalStorageStore from '../LocalStorageStore.js';
import LocalStorageShim from './LocalStorageShim.js';

describe('LocalStorageStore', () => {
  let shim;
  let store;

  beforeEach(() => {
    shim = new LocalStorageShim();
    store = new LocalStorageStore(shim);
  });

  describe('setItem / getItem', () => {
    it('stores and retrieves a string value', () => {
      store.setItem('myKey', 'myValue');
      assert.equal(store.getItem('myKey'), 'myValue');
    });

    it('overwrites an existing value', () => {
      store.setItem('k', 'first');
      store.setItem('k', 'second');
      assert.equal(store.getItem('k'), 'second');
    });

    it('stores multiple keys independently', () => {
      store.setItem('a', 'alpha');
      store.setItem('b', 'beta');
      assert.equal(store.getItem('a'), 'alpha');
      assert.equal(store.getItem('b'), 'beta');
    });
  });

  describe('getItem', () => {
    it('returns null for a missing key', () => {
      assert.isNull(store.getItem('nonexistent'));
    });
  });

  describe('removeItem', () => {
    it('removes a stored key — getItem returns null afterwards', () => {
      store.setItem('toDelete', 'value');
      store.removeItem('toDelete');
      assert.isNull(store.getItem('toDelete'));
    });

    it('is a no-op for a key that does not exist', () => {
      assert.doesNotThrow(() => store.removeItem('never-stored'));
    });
  });

  describe('quota enforcement (via LocalStorageShim)', () => {
    it('throws QuotaExceededError when value exceeds the configured byte limit', () => {
      const tinyShim = new LocalStorageShim(5); // 5-byte limit
      const tinyStore = new LocalStorageStore(tinyShim);
      assert.throws(
        () => tinyStore.setItem('k', 'this is definitely longer than 5 bytes'),
        /QuotaExceededError/,
      );
    });

    it('stores value exactly at the byte limit without throwing', () => {
      const fiveByteShim = new LocalStorageShim(5);
      const fiveStore = new LocalStorageStore(fiveByteShim);
      assert.doesNotThrow(() => fiveStore.setItem('k', 'hello')); // exactly 5 bytes
      assert.equal(fiveStore.getItem('k'), 'hello');
    });
  });

  describe('LocalStorageShim', () => {
    it('getItem returns null for missing key', () => {
      assert.isNull(shim.getItem('missing'));
    });

    it('clear() empties the store', () => {
      shim.setItem('x', 'y');
      shim.clear();
      assert.isNull(shim.getItem('x'));
      assert.equal(shim.length, 0);
    });

    it('length reflects stored entry count', () => {
      assert.equal(shim.length, 0);
      shim.setItem('a', '1');
      shim.setItem('b', '2');
      assert.equal(shim.length, 2);
      shim.removeItem('a');
      assert.equal(shim.length, 1);
    });
  });
});
