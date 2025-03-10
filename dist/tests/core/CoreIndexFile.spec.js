'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const tslib_1 = require('tslib');
const crypto = require('crypto');
const Compressor_1 = require('../../lib/core/versions/latest/util/Compressor');
const CoreIndexFile_1 = require('../../lib/core/versions/latest/CoreIndexFile');
const ErrorCode_1 = require('../../lib/core/versions/latest/ErrorCode');
const JasmineSidetreeErrorValidator_1 = require('../JasmineSidetreeErrorValidator');
const Jwk_1 = require('../../lib/core/versions/latest/util/Jwk');
const Multihash_1 = require('../../lib/core/versions/latest/Multihash');
const OperationGenerator_1 = require('../generators/OperationGenerator');
const SidetreeError_1 = require('../../lib/common/SidetreeError');
describe('CoreIndexFile', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
  describe('parse()', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
    it('should parse an core index file model correctly.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const provisionalIndexFileUri = 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i';
      const coreProofFileUri = 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34baaaaaaaa';
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperation = createOperationData.createOperation;
      const didSuffixForRecoverOperation = OperationGenerator_1.default.generateRandomHash();
      const [, anyRecoveryPrivateKey] = yield Jwk_1.default.generateEs256kKeyPair();
      const recoverOperationData = yield OperationGenerator_1.default.generateRecoverOperation({ didUniqueSuffix: didSuffixForRecoverOperation, recoveryPrivateKey: anyRecoveryPrivateKey });
      const recoverOperation = recoverOperationData.recoverOperation;
      const didOfDeactivateRequest = OperationGenerator_1.default.generateRandomHash();
      const deactivateOperationData = yield OperationGenerator_1.default.createDeactivateOperation(didOfDeactivateRequest, anyRecoveryPrivateKey);
      const deactivateOperation = deactivateOperationData.deactivateOperation;
      const coreIndexFileBuffer = yield CoreIndexFile_1.default.createBuffer(undefined, provisionalIndexFileUri, coreProofFileUri, [createOperation], [recoverOperation], [deactivateOperation]);
      const parsedCoreIndexFile = yield CoreIndexFile_1.default.parse(coreIndexFileBuffer);
      expect(parsedCoreIndexFile.createDidSuffixes.length).toEqual(1);
      expect(parsedCoreIndexFile.createDidSuffixes[0]).toEqual(createOperation.didUniqueSuffix);
      expect(parsedCoreIndexFile.recoverDidSuffixes.length).toEqual(1);
      expect(parsedCoreIndexFile.recoverDidSuffixes[0]).toEqual(recoverOperation.didUniqueSuffix);
      expect(parsedCoreIndexFile.deactivateDidSuffixes.length).toEqual(1);
      expect(parsedCoreIndexFile.deactivateDidSuffixes[0]).toEqual(deactivateOperation.didUniqueSuffix);
      expect(parsedCoreIndexFile.model.provisionalIndexFileUri).toEqual(provisionalIndexFileUri);
    }));
    it('should throw error if core proof file is specified but there is no recover and no deactivate operation.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const provisionalIndexFileUri = 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i';
      const coreProofFileUri = 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34baaaaaaaa';
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperation = createOperationData.createOperation;
      const coreIndexFileBuffer = yield CoreIndexFile_1.default.createBuffer(undefined, provisionalIndexFileUri, coreProofFileUri, [createOperation], [], []);
      JasmineSidetreeErrorValidator_1.default.expectSidetreeErrorToBeThrownAsync(() => CoreIndexFile_1.default.parse(coreIndexFileBuffer), ErrorCode_1.default.CoreIndexFileCoreProofFileUriNotAllowed);
    }));
    it('should throw if buffer given is not valid JSON.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFileBuffer = Buffer.from('NotJsonString');
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield JasmineSidetreeErrorValidator_1.default.expectSidetreeErrorToBeThrownAsync(() => CoreIndexFile_1.default.parse(coreIndexFileCompressed), ErrorCode_1.default.CoreIndexFileNotJson);
    }));
    it('should throw if the buffer is not compressed', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        provisionalIndexFileUri: 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i',
        didUniqueSuffixes: ['EiA-GtHEOH9IcEEoBQ9p1KCMIjTmTO8x2qXJPb20ry6C0A', 'EiA4zvhtvzTdeLAg8_Pvdtk5xJreNuIpvSpCCbtiTVc8Ow']
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      yield JasmineSidetreeErrorValidator_1.default.expectSidetreeErrorToBeThrownAsync(() => CoreIndexFile_1.default.parse(coreIndexFileBuffer), ErrorCode_1.default.CoreIndexFileDecompressionFailure);
    }));
    it('should throw if has an unknown property.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        unknownProperty: 'Unknown property',
        writerLockId: 'writer lock',
        provisionalIndexFileUri: 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i',
        operations: {}
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield expectAsync(CoreIndexFile_1.default.parse(coreIndexFileCompressed)).toBeRejectedWith(new SidetreeError_1.default(ErrorCode_1.default.CoreIndexFileHasUnknownProperty));
    }));
    it('should throw if `operations` property has an unknown property.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        writerLockId: 'writer lock',
        provisionalIndexFileUri: 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i',
        operations: {
          unexpectedProperty: 'any value'
        }
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield JasmineSidetreeErrorValidator_1.default.expectSidetreeErrorToBeThrownAsync(() => CoreIndexFile_1.default.parse(coreIndexFileCompressed), ErrorCode_1.default.CoreIndexFileUnexpectedPropertyInOperations);
    }));
    it('should allow `provisionalIndexFileUri` to be missing if there are only deactivates.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        coreProofFileUri: 'unused',
        operations: {
          deactivate: [{
            didSuffix: OperationGenerator_1.default.generateRandomHash(),
            revealValue: OperationGenerator_1.default.generateRandomHash()
          }]
        }
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      const coreIndexFileParsed = yield CoreIndexFile_1.default.parse(coreIndexFileCompressed);
      expect(coreIndexFileParsed.model.provisionalIndexFileUri).toBeUndefined();
      expect(coreIndexFileParsed.didUniqueSuffixes.length).toEqual(1);
    }));
    it('should throw if `provisionalIndexFileUri` is missing but there is a create/recover operation.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        coreProofFileUri: 'unused',
        operations: {
          recover: [{
            didSuffix: OperationGenerator_1.default.generateRandomHash(),
            revealValue: OperationGenerator_1.default.generateRandomHash()
          }]
        }
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield JasmineSidetreeErrorValidator_1.default.expectSidetreeErrorToBeThrownAsync(() => CoreIndexFile_1.default.parse(coreIndexFileCompressed), ErrorCode_1.default.CoreIndexFileProvisionalIndexFileUriMissing);
    }));
    it('should allow a valid core index file with out any operation references.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const provisionalIndexFileUri = 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i';
      const coreIndexFileModel = {
        provisionalIndexFileUri
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFileModel));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      const coreIndexFile = yield CoreIndexFile_1.default.parse(coreIndexFileCompressed);
      expect(coreIndexFile.didUniqueSuffixes.length).toEqual(0);
      expect(coreIndexFile.model.provisionalIndexFileUri).toEqual(provisionalIndexFileUri);
    }));
    it('should throw if any additional property.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        invalidProperty: 'some property value',
        provisionalIndexFileUri: 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i',
        operations: {}
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield expectAsync(CoreIndexFile_1.default.parse(coreIndexFileCompressed)).toBeRejectedWith(new SidetreeError_1.default(ErrorCode_1.default.CoreIndexFileHasUnknownProperty));
    }));
    it('should throw if provisional index file hash is not string.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperation = createOperationData.createOperation;
      const coreProofFileUri = undefined;
      const coreIndexFileModel = yield CoreIndexFile_1.default.createModel('writerLock', 'unusedMockFileUri', coreProofFileUri, [createOperation], [], []);
      coreIndexFileModel.provisionalIndexFileUri = 1234;
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFileModel));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield JasmineSidetreeErrorValidator_1.default.expectSidetreeErrorToBeThrownAsync(() => CoreIndexFile_1.default.parse(coreIndexFileCompressed), ErrorCode_1.default.InputValidatorCasFileUriNotString, 'provisional index file');
    }));
    it('should throw if provisional index file hash is exceeds max length.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperation = createOperationData.createOperation;
      let coreProofFileUri = 'this will be too long';
      for (let i = 1; i < 101; i++) {
        coreProofFileUri += ' ';
      }
      const coreIndexFileModel = yield CoreIndexFile_1.default.createModel('writerLock', 'unusedMockFileHash', coreProofFileUri, [createOperation], [], []);
      coreIndexFileModel.provisionalIndexFileUri = coreProofFileUri;
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFileModel));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield JasmineSidetreeErrorValidator_1.default.expectSidetreeErrorToBeThrownAsync(() => CoreIndexFile_1.default.parse(coreIndexFileCompressed), ErrorCode_1.default.InputValidatorCasFileUriExceedsMaxLength, 'provisional index file');
    }));
    it('should throw if writer lock id is not string.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperation = createOperationData.createOperation;
      const coreProofFileUri = undefined;
      const coreIndexFileModel = yield CoreIndexFile_1.default.createModel('unusedWriterLockId', 'unusedMockFileUri', coreProofFileUri, [createOperation], [], []);
      coreIndexFileModel.writerLockId = {};
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFileModel));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield expectAsync(CoreIndexFile_1.default.parse(coreIndexFileCompressed)).toBeRejectedWith(new SidetreeError_1.default(ErrorCode_1.default.CoreIndexFileWriterLockIdPropertyNotString));
    }));
    it('should throw if writer lock ID exceeded max size.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperation = createOperationData.createOperation;
      const coreProofFileUri = undefined;
      const coreIndexFileModel = yield CoreIndexFile_1.default.createModel('unusedWriterLockId', 'unusedMockFileUri', coreProofFileUri, [createOperation], [], []);
      coreIndexFileModel.writerLockId = crypto.randomBytes(2000).toString('hex');
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFileModel));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield JasmineSidetreeErrorValidator_1.default.expectSidetreeErrorToBeThrownAsync(() => CoreIndexFile_1.default.parse(coreIndexFileCompressed), ErrorCode_1.default.CoreIndexFileWriterLockIdExceededMaxSize);
    }));
    it('should throw if `create` property is not an array.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        provisionalIndexFileUri: 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i',
        operations: {
          create: 'IncorrectType'
        }
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield expectAsync(CoreIndexFile_1.default.parse(coreIndexFileCompressed))
        .toBeRejectedWith(new SidetreeError_1.default(ErrorCode_1.default.CoreIndexFileCreatePropertyNotArray));
    }));
    it('should throw if `recover` property is not an array.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        provisionalIndexFileUri: 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i',
        operations: {
          recover: 'IncorrectType'
        }
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield expectAsync(CoreIndexFile_1.default.parse(coreIndexFileCompressed))
        .toBeRejectedWith(new SidetreeError_1.default(ErrorCode_1.default.CoreIndexFileRecoverPropertyNotArray));
    }));
    it('should throw if `deactivate` property is not an array.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const coreIndexFile = {
        provisionalIndexFileUri: 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i',
        operations: {
          deactivate: 'IncorrectType'
        }
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield expectAsync(CoreIndexFile_1.default.parse(coreIndexFileCompressed))
        .toBeRejectedWith(new SidetreeError_1.default(ErrorCode_1.default.CoreIndexFileDeactivatePropertyNotArray));
    }));
    it('should throw if there are multiple operations for the same DID.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperationRequest = createOperationData.operationRequest;
      delete createOperationRequest.type;
      delete createOperationRequest.delta;
      const coreIndexFile = {
        provisionalIndexFileUri: 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i',
        operations: {
          create: [createOperationRequest],
          deactivate: [{
            didSuffix: createOperationData.createOperation.didUniqueSuffix,
            revealValue: OperationGenerator_1.default.generateRandomHash()
          }]
        }
      };
      const coreIndexFileBuffer = Buffer.from(JSON.stringify(coreIndexFile));
      const coreIndexFileCompressed = yield Compressor_1.default.compress(coreIndexFileBuffer);
      yield expectAsync(CoreIndexFile_1.default.parse(coreIndexFileCompressed))
        .toBeRejectedWith(new SidetreeError_1.default(ErrorCode_1.default.CoreIndexFileMultipleOperationsForTheSameDid));
    }));
  }));
  describe('createModel()', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
    it('should create a core index file model correctly.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const provisionalIndexFileUri = 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i';
      const coreProofFileUri = 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557aaaa';
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperation = createOperationData.createOperation;
      const [, anyRecoveryPrivateKey] = yield Jwk_1.default.generateEs256kKeyPair();
      const recoverOperationData = yield OperationGenerator_1.default.generateRecoverOperation({ didUniqueSuffix: 'EiDyOQbbZAa3aiRzeCkV7LOx3SERjjH93EXoIM3UoN4oWg', recoveryPrivateKey: anyRecoveryPrivateKey });
      const recoverOperation = recoverOperationData.recoverOperation;
      const deactivateOperationData = yield OperationGenerator_1.default.createDeactivateOperation('EiDyOQbbZAa3aiRzeCkV7LOx3SERjjH93EXoIM3UoN4oWf', anyRecoveryPrivateKey);
      const deactivateOperation = deactivateOperationData.deactivateOperation;
      const coreIndexFileModel = yield CoreIndexFile_1.default.createModel(undefined, provisionalIndexFileUri, coreProofFileUri, [createOperation], [recoverOperation], [deactivateOperation]);
      expect(coreIndexFileModel.provisionalIndexFileUri).toEqual(provisionalIndexFileUri);
      expect(coreIndexFileModel.operations.create[0].suffixData).toEqual({
        deltaHash: createOperation.suffixData.deltaHash, recoveryCommitment: createOperation.suffixData.recoveryCommitment, type: undefined
      });
      const recoveryOperationInCoreIndexFile = coreIndexFileModel.operations.recover[0];
      const recoveryRevealValue = Multihash_1.default.canonicalizeThenHashThenEncode(recoverOperation.signedData.recoveryKey);
      expect(recoveryOperationInCoreIndexFile.didSuffix).toEqual(recoverOperation.didUniqueSuffix);
      expect(recoveryOperationInCoreIndexFile.revealValue).toEqual(recoveryRevealValue);
      const deactivateOperationInCoreIndexFile = coreIndexFileModel.operations.deactivate[0];
      const deactivateRevealValue = Multihash_1.default.canonicalizeThenHashThenEncode(deactivateOperation.signedData.recoveryKey);
      expect(deactivateOperationInCoreIndexFile.didSuffix).toEqual(deactivateOperation.didUniqueSuffix);
      expect(deactivateOperationInCoreIndexFile.revealValue).toEqual(deactivateRevealValue);
    }));
    it('should not create `operations` property if there is no create, recover, and deactivates.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const writerLockId = undefined;
      const provisionalIndexFileUri = OperationGenerator_1.default.generateRandomHash();
      const coreProofFileUri = undefined;
      const coreIndexFileModel = yield CoreIndexFile_1.default.createModel(writerLockId, provisionalIndexFileUri, coreProofFileUri, [], [], []);
      expect(coreIndexFileModel.operations).toBeUndefined();
    }));
  }));
  describe('createBuffer()', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
    it('should created a compressed buffer correctly.', () => tslib_1.__awaiter(void 0, void 0, void 0, function * () {
      const provisionalIndexFileUri = 'bafkreid5uh2g5gbbhvpza4mwfwbmigy43rar2xkalwtvc7v34b4557cr2i';
      const coreProofFileUri = undefined;
      const createOperationData = yield OperationGenerator_1.default.generateCreateOperation();
      const createOperation = createOperationData.createOperation;
      const coreIndexFileBuffer = yield CoreIndexFile_1.default.createBuffer(undefined, provisionalIndexFileUri, coreProofFileUri, [createOperation], [], []);
      const coreIndexFile = yield CoreIndexFile_1.default.parse(coreIndexFileBuffer);
      expect(coreIndexFile.model.provisionalIndexFileUri).toEqual(provisionalIndexFileUri);
      expect(coreIndexFile.model.operations.create[0].suffixData).toEqual({
        deltaHash: createOperation.suffixData.deltaHash, recoveryCommitment: createOperation.suffixData.recoveryCommitment
      });
    }));
  }));
}));
// # sourceMappingURL=CoreIndexFile.spec.js.map
