import DeltaModel from './models/DeltaModel.ts';
import Did from './Did.ts';
import ErrorCode from './ErrorCode.ts';
import InputValidator from './InputValidator.ts';
import JsonAsync from './util/JsonAsync.ts';
import Operation from './Operation.ts';
import OperationModel from './models/OperationModel.ts';
import OperationType from '../../enums/OperationType.ts';
import SidetreeError from '../../../common/SidetreeError.ts';
import SuffixDataModel from './models/SuffixDataModel.ts';
import { Buffer } from 'node:buffer';


/**
 * A class that represents a create operation.
 */
export default class CreateOperation implements OperationModel {
  /** The type of operation. */
  public readonly type: OperationType = OperationType.Create;

  /**
   * NOTE: should only be used by `parse()` and `parseObject()` else the constructed instance could be invalid.
   */
  private constructor (
    public readonly operationBuffer: Buffer,
    public readonly didUniqueSuffix: string,
    public readonly suffixData: SuffixDataModel,
    public readonly delta: DeltaModel | undefined) { }

  /**
   * Parses the given buffer as a `CreateOperation`.
   */
  public static async parse (operationBuffer: Buffer): Promise<CreateOperation> {
    const operationJsonString = operationBuffer.toString();
    const operationObject = await JsonAsync.parse(operationJsonString);
    const createOperation = CreateOperation.parseObject(operationObject, operationBuffer);
  
    return createOperation;
  }

  /**
   * Parses the given operation object as a `CreateOperation`.
   * The `operationBuffer` given is assumed to be valid and is assigned to the `operationBuffer` directly.
   * NOTE: This method is purely intended to be used as an optimization method over the `parse` method in that
   * JSON parsing is not required to be performed more than once when an operation buffer of an unknown operation type is given.
   * @param operationObject The operationObject is a json object with no encoding
   * @param operationBuffer The buffer format of the operationObject
   */
  public static parseObject (operationObject: any, operationBuffer: Buffer): CreateOperation {
    const expectedPropertyCount = 3;
    const properties = Object.keys(operationObject);

    if (properties.length !== expectedPropertyCount) {
      throw new SidetreeError(ErrorCode.CreateOperationMissingOrUnknownProperty);
    }

    if (operationObject.type !== OperationType.Create) {
      throw new SidetreeError(ErrorCode.CreateOperationTypeIncorrect);
    }

    const suffixData = operationObject.suffixData;
    // TODO: temporary disabled validation
    InputValidator.validateSuffixData(suffixData);

    let delta;
    try {
      Operation.validateDelta(operationObject.delta);
      delta = operationObject.delta;
    } catch(error) {
      // For compatibility with data pruning, we have to assume that `delta` may be unavailable,
      // thus an operation with invalid `delta` needs to be processed as an operation with unavailable `delta`,
      // so here we let `delta` be `undefined`.
      console.log(`Create Operation Error: ${error}`);
    } finally {
        const didUniqueSuffix = Did.computeUniqueSuffix(suffixData);
        const operation = new CreateOperation(operationBuffer, didUniqueSuffix, suffixData, delta);

        return operation;
    }
  }
}
