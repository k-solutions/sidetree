import StatusCodes from 'npm:http-status-codes';
import { BlockchainTimeModel } from './models/BlockchainTimeModel.ts';
import CoreErrorCode from './ErrorCode.ts';
import IBlockchain from './interfaces/IBlockchain.ts';
import JsonAsync from './versions/latest/util/JsonAsync.ts';
import Logger from '../common/Logger.ts';
import ReadableStreamUtils from '../common/ReadableStreamUtils.ts';
import ServiceVersionFetcher from './ServiceVersionFetcher.ts';
import ServiceVersionModel from '../common/models/ServiceVersionModel.ts';
import SharedErrorCode from '../common/SharedErrorCode.ts';
import SidetreeError from '../common/SidetreeError.ts';
import TransactionModel from '../common/models/TransactionModel.ts';
import ValueTimeLockModel from '../common/models/ValueTimeLockModel.ts';
import { Buffer } from 'node:buffer';

/**
 * Class that communicates with the underlying blockchain using REST API defined by the protocol document.
 */
export default class Blockchain implements IBlockchain {

  private serviceVersionFetcher: ServiceVersionFetcher;
//  private fetch = // nodeFetch;
  // private buffer = new Buffer(); 
  /** URI that handles transaction operations. */
  private transactionsUri: string; // e.g. https://127.0.0.1/transactions
  private timeUri: string; // e.g. https://127.0.0.1/time
  private feeUri: string; // e.g. https://127.0.0.1/fee
  private locksUri: string; // e.g. https://127.0.0.1/locks
  private writerLockUri: string; // e.g. https://127.0.0.1/writelock

  public constructor (public uri: string) {
    this.transactionsUri = `${uri}/transactions`;
    this.timeUri = `${uri}/time`;
    this.feeUri = `${uri}/fee`;
    this.locksUri = `${uri}/locks`;
    this.writerLockUri = `${uri}/writerlock`;

    this.serviceVersionFetcher = new ServiceVersionFetcher(uri);
  }

  public async write (anchorString: string, minimumFee: number): Promise<void> {
    const anchorStringObject = {
      minimumFee,
      anchorString
    };

    const requestParameters = {
      method: 'post',
      body: Buffer.from(JSON.stringify(anchorStringObject)),
      headers: { 'Content-Type': 'application/json' }
    };
    const response = await fetch(this.transactionsUri, requestParameters);

    // Throw error with meaningful code if possible.
    if (response.status !== StatusCodes.OK) {
      const body = response.json();
      Logger.error(`Blockchain write error response status: ${response.status}`);
      Logger.error(`Blockchain write error body: ${body}`);

//      let parsedBody;
//      try {
//        parsedBody = JSON.parse(body);
//      } catch {
//        // Continue even if JSON parsing fails. We are just trying to parse the body as an object if possible.
//      }
//
      // Throw Sidetree error with specific code if given.
      if (body !== undefined && body.code !== undefined) {
        throw new SidetreeError(body.code, 'Remote blockchain service returned a known write error.');
      }

      // Else throw generic sidetree error.
      throw new SidetreeError(CoreErrorCode.BlockchainWriteUnexpectedError, 'Remote blockchain service returned an unexpected write error.');
    }
  }

  public async read (sinceTransactionNumber?: number, transactionTimeHash?: string): Promise<{ moreTransactions: boolean, transactions: TransactionModel[]}> {
    if ((sinceTransactionNumber !== undefined && transactionTimeHash === undefined) ||
        (sinceTransactionNumber === undefined && transactionTimeHash !== undefined)) {
      throw new SidetreeError(
        CoreErrorCode.BlockchainReadInvalidArguments,
        'Transaction number and time hash must both be given or not given at the same time.'
      );
    }

    let queryString = '';
    if (sinceTransactionNumber !== undefined && transactionTimeHash !== undefined) {
      queryString = `?since=${sinceTransactionNumber}&transaction-time-hash=${transactionTimeHash}`;
    }

    const readUri = this.transactionsUri + queryString; // e.g. https://127.0.0.1/transactions?since=6212927891701761&transaction-time-hash=abc

    Logger.info(`Fetching URI '${readUri}'...`);
    const response = await fetch(readUri);
    Logger.info(`Fetch response: ${response.status}'.`);

    const responseBodyBuffer = await ReadableStreamUtils.readAll(response.body);

    let responseBody;
    try {
      responseBody = JSON.parse(responseBodyBuffer.toString());
    } catch {
      throw new SidetreeError(
        CoreErrorCode.BlockchainReadResponseBodyNotJson,
        `Blockchain read response body not JSON: ${responseBodyBuffer}`
      );
    }

    if (response.status === StatusCodes.BAD_REQUEST &&
        responseBody.code === SharedErrorCode.InvalidTransactionNumberOrTimeHash) {
      throw new SidetreeError(SharedErrorCode.InvalidTransactionNumberOrTimeHash);
    }

    if (response.status !== StatusCodes.OK) {
      throw new SidetreeError(
        CoreErrorCode.BlockchainReadResponseNotOk,
        `Blockchain read HTTP status ${response.status}. Body: ${responseBodyBuffer}`
      );
    }

    return responseBody;
  }

  public async getFirstValidTransaction (transactions: TransactionModel[]): Promise<TransactionModel | undefined> {
    const bodyString = JSON.stringify({ transactions });
    const requestParameters = {
      method: 'post',
      body: Buffer.from(bodyString),
      headers: { 'Content-Type': 'application/json' }
    };

    const firstValidTransactionUri = `${this.transactionsUri}/firstValid`;

    Logger.info(`Posting to first-valid transaction URI '${firstValidTransactionUri} with body: '${bodyString}'...`);

    const response = await fetch(firstValidTransactionUri, requestParameters);

    if (response.status === StatusCodes.NOT_FOUND) {
      return undefined;
    }

    // const responseBodyString = (response.body as Buffer).toString();
    const transaction = await response.json(); // JSON.parse(responseBodyString);

    return transaction;
  }

  /**
   * Gets the version of the bitcoin service.
   */
  public async getServiceVersion (): Promise<ServiceVersionModel> {
    return this.serviceVersionFetcher.getVersion();
  }

  /**
   * Gets the latest blockchain time and updates the cached time.
   */
  public async getLatestTime (): Promise<BlockchainTimeModel> {
    Logger.info(`Getting blockchain time...`);
    const response = await fetch(this.timeUri);
    // const responseBodyString = (response.body.read() as Buffer).toString();

    if (response.status !== StatusCodes.OK) {
      const errResponse  = await response.text();
      const errorMessage = `Encountered an error fetching latest time from blockchain: ${errResponse}`;
      throw new SidetreeError(CoreErrorCode.BlockchainGetLatestTimeResponseNotOk, errorMessage);
    }

    const latestBlockchainTimeModel: BlockchainTimeModel = await response.json(); // JSON.parse(responseBodyString) as BlockchainTimeModel;
    Logger.info(`Got latest blockchain time: ${JSON.stringify(latestBlockchainTimeModel)}`);

    return latestBlockchainTimeModel;
  }

  public async getFee (transactionTime: number): Promise<number> {

    const readUri = `${this.feeUri}/${transactionTime}`;

    const response = await fetch(readUri);
    // const responseBodyString = await ReadableStreamUtils.readAll(response.body);
    const responseBody = await response.json(); // BodyString.toString());

    if (response.status === StatusCodes.BAD_REQUEST &&
        responseBody.code === SharedErrorCode.BlockchainTimeOutOfRange) {
      throw new SidetreeError(SharedErrorCode.BlockchainTimeOutOfRange);
    }

    if (response.status !== StatusCodes.OK) {
      Logger.error(`Blockchain read error response status: ${response.status}`);
      Logger.error(`Blockchain read error body: ${JSON.stringify(responseBody)}`);
      throw new SidetreeError(CoreErrorCode.BlockchainGetFeeResponseNotOk);
    }

    return responseBody.normalizedTransactionFee as number;
  }

  public async getValueTimeLock (lockIdentifier: string): Promise<ValueTimeLockModel | undefined> {
    const readUri = `${this.locksUri}/${lockIdentifier}`;

    const response = await fetch(readUri);
    // const responseBodyString = await ReadableStreamUtils.readAll(response.body);
    const responseBody = await response.json();
    if (response.status === StatusCodes.NOT_FOUND) {
      return undefined;
    }

    if (response.status !== StatusCodes.OK) {
      throw new SidetreeError(CoreErrorCode.BlockchainGetLockResponseNotOk, `Response: ${responseBody}`);
    }

    return JsonAsync.parse(responseBody);
  }

  public async getWriterValueTimeLock (): Promise<ValueTimeLockModel | undefined> {
    const response = await fetch(this.writerLockUri);
    if (response.status === StatusCodes.NOT_FOUND) {
      return undefined;
    }

    const responseBodyString = await ReadableStreamUtils.readAll(response.body);
    if (response.status !== StatusCodes.OK) {
      throw new SidetreeError(CoreErrorCode.BlockchainGetWriterLockResponseNotOk, `Status: ${response.status}. Response: ${responseBodyString}.`);
    }

    const responseBody = await JsonAsync.parse(responseBodyString);
    return responseBody;
  }
}
