import JwkEs256k from '../../../models/JwkEs256k.ts';

/**
 * Defines the internal decoded schema of signed data of a recover operation.
 */
export default interface RecoverSignedDataModel {
  deltaHash: string;
  recoveryKey: JwkEs256k;
  recoveryCommitment: string;
}
