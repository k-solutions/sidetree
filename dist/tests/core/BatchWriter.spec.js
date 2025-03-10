'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const tslib_1 = require('tslib');
const BatchWriter_1 = require('../../lib/core/versions/latest/BatchWriter');
const ChunkFile_1 = require('../../lib/core/versions/latest/ChunkFile');
const CoreIndexFile_1 = require('../../lib/core/versions/latest/CoreIndexFile');
const MockBlockchain_1 = require('../mocks/MockBlockchain');
const MockCas_1 = require('../mocks/MockCas');
const MockConfirmationStore_1 = require('../mocks/MockConfirmationStore');
const MockOperationQueue_1 = require('../mocks/MockOperationQueue');
const OperationGenerator_1 = require('../generators/OperationGenerator');
const ProtocolParameters_1 = require('../../lib/core/versions/latest/ProtocolParameters');
const ValueTimeLockVerifier_1 = require('../../lib/core/versions/latest/ValueTimeLockVerifier');
describe('BatchWriter', () => {
  let blockchain;
  let cas;
  let operationQueue;
  let batchWriter;
  let confimrationStore;
  beforeAll(() => {
    blockchain = new MockBlockchain_1.default();
    cas = new MockCas_1.default();
    operationQueue = new MockOperationQueue_1.default();
    const mockVersionMetadataFetcher = {};
    confimrationStore = new MockConfirmationStore_1.default();
    batchWriter = new BatchWriter_1.default(operationQueue, blockchain, cas, mockVersionMetadataFetcher, confimrationStore);
  });
  describe('write()', () => {
    it('should return without writing anything if operation queue is empty.', (done) => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const mockOpsByLock = ProtocolParameters_1.default.maxOperationsPerBatch;
      spyOn(blockchain, 'getFee').and.returnValue(Promise.resolve(100));
      spyOn(blockchain, 'getWriterValueTimeLock').and.returnValue(Promise.resolve(undefined));
      spyOn(BatchWriter_1.default, 'getNumberOfOperationsAllowed').and.returnValue(mockOpsByLock);
      const chunkFileCreateBufferSpy = spyOn(ChunkFile_1.default, 'createBuffer');
      const casWriteSpy = spyOn(cas, 'write');
      const blockchainWriteSpy = spyOn(blockchain, 'write');
      yield batchWriter.write();
      expect(chunkFileCreateBufferSpy).not.toHaveBeenCalled();
      expect(casWriteSpy).not.toHaveBeenCalled();
      expect(blockchainWriteSpy).not.toHaveBeenCalled();
      done();
    }));
    it('should return without writing anything if last confirmation is less than 6 blocks ago.', (done) => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const mockOpsByLock = ProtocolParameters_1.default.maxOperationsPerBatch;
      spyOn(blockchain, 'getFee').and.returnValue(Promise.resolve(100));
      spyOn(blockchain, 'getWriterValueTimeLock').and.returnValue(Promise.resolve(undefined));
      spyOn(BatchWriter_1.default, 'getNumberOfOperationsAllowed').and.returnValue(mockOpsByLock);
      const chunkFileCreateBufferSpy = spyOn(ChunkFile_1.default, 'createBuffer');
      const casWriteSpy = spyOn(cas, 'write');
      const blockchainWriteSpy = spyOn(blockchain, 'write');
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      yield operationQueue.enqueue(createOperationData.createOperation.didUniqueSuffix, createOperationData.createOperation.operationBuffer);
      yield confimrationStore.submit('anchor-string', 100);
      yield batchWriter.write();
      expect(chunkFileCreateBufferSpy).not.toHaveBeenCalled();
      expect(casWriteSpy).not.toHaveBeenCalled();
      expect(blockchainWriteSpy).not.toHaveBeenCalled();
      yield confimrationStore.confirm('anchor-string', 102);
      blockchain.setLatestTime({
        time: 105,
        hash: 'hash'
      });
      yield batchWriter.write();
      expect(chunkFileCreateBufferSpy).not.toHaveBeenCalled();
      expect(casWriteSpy).not.toHaveBeenCalled();
      expect(blockchainWriteSpy).not.toHaveBeenCalled();
      blockchain.setLatestTime({
        time: 110,
        hash: 'hash'
      });
      yield batchWriter.write();
      expect(chunkFileCreateBufferSpy).toHaveBeenCalled();
      expect(casWriteSpy).toHaveBeenCalled();
      expect(blockchainWriteSpy).toHaveBeenCalled();
      done();
    }));
    it('should pass the writer lock ID to CoreIndexFile.createBuffer() if a value lock exists.', (done) => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      spyOn(blockchain, 'getFee').and.returnValue(Promise.resolve(100));
      const valueLock = {
        amountLocked: 1,
        identifier: 'anIdentifier',
        lockTransactionTime: 2,
        normalizedFee: 3,
        owner: 'unusedOwner',
        unlockTransactionTime: 4
      };
      spyOn(blockchain, 'getWriterValueTimeLock').and.returnValue(Promise.resolve(valueLock));
      const mockOpsByLock = ProtocolParameters_1.default.maxOperationsPerBatch;
      spyOn(BatchWriter_1.default, 'getNumberOfOperationsAllowed').and.returnValue(mockOpsByLock);
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      yield operationQueue.enqueue(createOperationData.createOperation.didUniqueSuffix, createOperationData.createOperation.operationBuffer);
      const coreIndexFileCreateBufferSpy = spyOn(CoreIndexFile_1.default, 'createBuffer');
      coreIndexFileCreateBufferSpy.and.callFake((lockId) => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
        expect(lockId).toEqual(valueLock.identifier);
        return Buffer.from('anyCoreIndexFileBuffer');
      }));
      yield confimrationStore.clear();
      yield batchWriter.write();
      done();
    }));
  });
  describe('createAndWriteProvisionalIndexFileIfNeeded()', () => {
    it('should return `undefined` if no chunk file URI is given.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const chunkFileUri = undefined;
      const provisionalProofFileUri = OperationGenerator_1.default.generateRandomHash();
      const updateOperations = [];
      const provisionalIndexFileUri = yield batchWriter.createAndWriteProvisionalIndexFileIfNeeded(chunkFileUri, provisionalProofFileUri, updateOperations);
      expect(provisionalIndexFileUri).toBeUndefined();
    }));
  });
  describe('createAndWriteChunkFileIfNeeded()', () => {
    it('should return `undefined` if no operation is passed in.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const chunkFileUri = yield batchWriter.createAndWriteChunkFileIfNeeded([], [], []);
      expect(chunkFileUri).toBeUndefined();
    }));
  });
  describe('getNumberOfOperationsAllowed', () => {
    it('should return the value from the lock verifier', () => {
      const mockOpsByLock = ProtocolParameters_1.default.maxOperationsPerBatch - 1;
      spyOn(ValueTimeLockVerifier_1.default, 'calculateMaxNumberOfOperationsAllowed').and.returnValue(mockOpsByLock);
      const unusedVersionMetadataFetcher = {};
      const actual = BatchWriter_1.default.getNumberOfOperationsAllowed(unusedVersionMetadataFetcher, undefined);
      expect(actual).toEqual(mockOpsByLock);
    });
    it('should not return a value more than the max allowed batch size.', () => {
      const mockOpsByLock = ProtocolParameters_1.default.maxOperationsPerBatch + 123;
      spyOn(ValueTimeLockVerifier_1.default, 'calculateMaxNumberOfOperationsAllowed').and.returnValue(mockOpsByLock);
      const unusedVersionMetadataFetcher = {};
      const actual = BatchWriter_1.default.getNumberOfOperationsAllowed(unusedVersionMetadataFetcher, undefined);
      expect(actual).toEqual(ProtocolParameters_1.default.maxOperationsPerBatch);
    });
  });
});
// # sourceMappingURL=BatchWriter.spec.js.map
