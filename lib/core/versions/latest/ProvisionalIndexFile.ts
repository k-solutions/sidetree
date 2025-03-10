import ArrayMethods from './util/ArrayMethods.ts';
import Compressor from './util/Compressor.ts';
import ErrorCode from './ErrorCode.ts';
import InputValidator from './InputValidator.ts';
import JsonAsync from './util/JsonAsync.ts';
import OperationReferenceModel from './models/OperationReferenceModel.ts';
import ProtocolParameters from './ProtocolParameters.ts';
import ProvisionalIndexFileModel from './models/ProvisionalIndexFileModel.ts';
import SidetreeError from '../../../common/SidetreeError.ts';
import UpdateOperation from './UpdateOperation.ts';

/**
 * Class containing Map File related operations.
 */
export default class ProvisionalIndexFile {
  /**
   * Class that represents a provisional index file.
   * NOTE: this class is introduced as an internal structure in replacement to `ProvisionalIndexFileModel`
   * to keep useful metadata so that repeated computation can be avoided.
   */
  private constructor (
    public readonly model: ProvisionalIndexFileModel,
    public readonly didUniqueSuffixes: string[]) { }

  /**
   * Parses and validates the given provisional index file buffer.
   * @throws `SidetreeError` if failed parsing or validation.
   */
  public static async parse (provisionalIndexFileBuffer: Buffer): Promise<ProvisionalIndexFile> {

    let decompressedBuffer;
    try {
      const maxAllowedDecompressedSizeInBytes = ProtocolParameters.maxProvisionalIndexFileSizeInBytes * Compressor.estimatedDecompressionMultiplier;
      decompressedBuffer = await Compressor.decompress(provisionalIndexFileBuffer, maxAllowedDecompressedSizeInBytes);
    } catch (error) {
      if (error instanceof SidetreeError) {
        throw SidetreeError.createFromError(ErrorCode.ProvisionalIndexFileDecompressionFailure, error);
      }

      throw error;
    }

    let provisionalIndexFileModel;
    try {
      provisionalIndexFileModel = await JsonAsync.parse(decompressedBuffer);
    } catch (error) {
      if (error instanceof SidetreeError) {
        throw SidetreeError.createFromError(ErrorCode.ProvisionalIndexFileNotJson, error);
      }

      throw error;
    }

    const allowedProperties = new Set(['chunks', 'operations', 'provisionalProofFileUri']);
    for (const property in provisionalIndexFileModel) {
      if (!allowedProperties.has(property)) {
        throw new SidetreeError(ErrorCode.ProvisionalIndexFileHasUnknownProperty);
      }
    }

    ProvisionalIndexFile.validateChunksProperty(provisionalIndexFileModel.chunks);

    const didSuffixes = ProvisionalIndexFile.validateOperationsProperty(provisionalIndexFileModel.operations);

    // Validate provisional proof file URI.
    if (didSuffixes.length > 0) {
      InputValidator.validateCasFileUri(provisionalIndexFileModel.provisionalProofFileUri, 'provisional proof file URI');
    } else {
      if (provisionalIndexFileModel.provisionalProofFileUri !== undefined) {
        throw new SidetreeError(
          ErrorCode.ProvisionalIndexFileProvisionalProofFileUriNotAllowed,
          `Provisional proof file '${provisionalIndexFileModel.provisionalProofFileUri}' not allowed in a provisional index file with no updates.`
        );
      }
    }

    const provisionalIndexFile = new ProvisionalIndexFile(provisionalIndexFileModel, didSuffixes);
    return provisionalIndexFile;
  }

  /**
   * Validates the given `operations` property, throws error if the property fails validation.
   *
   * @returns The of array of unique DID suffixes if validation succeeds.
   */
  private static validateOperationsProperty (operations: any): string[] {
    if (operations === undefined) {
      return [];
    }

    InputValidator.validateObjectContainsOnlyAllowedProperties(operations, ['update'], 'provisional operation references');

    if (!Array.isArray(operations.update)) {
      throw new SidetreeError(ErrorCode.ProvisionalIndexFileUpdateOperationsNotArray);
    }

    // Validate all update operation references.
    InputValidator.validateOperationReferences(operations.update, 'update reference');

    // Make sure no operation with same DID.
    const didSuffixes = (operations.update as OperationReferenceModel[]).map(operation => operation.didSuffix);
    if (ArrayMethods.hasDuplicates(didSuffixes)) {
      throw new SidetreeError(ErrorCode.ProvisionalIndexFileMultipleOperationsForTheSameDid);
    }

    return didSuffixes;
  }

  /**
   * Validates the given `chunks` property, throws error if the property fails validation.
   */
  private static validateChunksProperty (chunks: any) {
    if (!Array.isArray(chunks)) {
      throw new SidetreeError(ErrorCode.ProvisionalIndexFileChunksPropertyMissingOrIncorrectType);
    }

    // This version expects only one hash.
    if (chunks.length !== 1) {
      throw new SidetreeError(ErrorCode.ProvisionalIndexFileChunksPropertyDoesNotHaveExactlyOneElement);
    }

    const chunk = chunks[0];
    const properties = Object.keys(chunk);
    if (properties.length !== 1) {
      throw new SidetreeError(ErrorCode.ProvisionalIndexFileChunkHasMissingOrUnknownProperty);
    }

    InputValidator.validateCasFileUri(chunk.chunkFileUri, 'chunk file URI');
  }

  /**
   * Creates the Map File buffer.
   */
  public static async createBuffer (
    chunkFileUri: string, provisionalProofFileUri: string | undefined, updateOperationArray: UpdateOperation[]
  ): Promise<Buffer> {
    const updateReferences = updateOperationArray.map(operation => {
      const revealValue = operation.revealValue;
      return { didSuffix: operation.didUniqueSuffix, revealValue };
    });

    const provisionalIndexFileModel: ProvisionalIndexFileModel = {
      chunks: [{ chunkFileUri }]
    };

    // Only insert `operations` and `provisionalProofFileUri` properties if there are update operations.
    if (updateReferences.length > 0) {
      provisionalIndexFileModel.operations = {
        update: updateReferences
      };

      provisionalIndexFileModel.provisionalProofFileUri = provisionalProofFileUri;
    }

    const rawData = JSON.stringify(provisionalIndexFileModel);
    const compressedRawData = await Compressor.compress(Buffer.from(rawData));

    return compressedRawData;
  }
}
