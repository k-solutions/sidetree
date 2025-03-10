"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const BitcoinClient_1 = tslib_1.__importDefault(require("./BitcoinClient"));
const bitcore_lib_1 = require("bitcore-lib");
const ErrorCode_1 = tslib_1.__importDefault(require("./ErrorCode"));
const Logger_1 = tslib_1.__importDefault(require("../common/Logger"));
const SidetreeError_1 = tslib_1.__importDefault(require("../common/SidetreeError"));
class BitcoinRawDataParser {
    static parseRawDataFile(rawBlockDataFileBuffer) {
        const processedBlocks = [];
        let count = 0;
        let cursor = 0;
        while (cursor < rawBlockDataFileBuffer.length) {
            const actualMagicBytes = rawBlockDataFileBuffer.subarray(cursor, cursor + BitcoinRawDataParser.magicBytesLength);
            if (actualMagicBytes.equals(BitcoinRawDataParser.magicBytes.skip)) {
                break;
            }
            if (!actualMagicBytes.equals(BitcoinRawDataParser.magicBytes.mainnet) &&
                !actualMagicBytes.equals(BitcoinRawDataParser.magicBytes.testnet) &&
                !actualMagicBytes.equals(BitcoinRawDataParser.magicBytes.regtest)) {
                throw new SidetreeError_1.default(ErrorCode_1.default.BitcoinRawDataParserInvalidMagicBytes, `${actualMagicBytes.toString('hex')} at cursor position ${cursor} is not valid bitcoin mainnet, testnet or regtest magic bytes`);
            }
            cursor += BitcoinRawDataParser.magicBytesLength;
            const blockSizeInBytes = rawBlockDataFileBuffer.readUInt32LE(cursor);
            cursor += BitcoinRawDataParser.sizeBytesLength;
            const blockData = rawBlockDataFileBuffer.subarray(cursor, cursor + blockSizeInBytes);
            cursor += blockSizeInBytes;
            let block;
            try {
                block = new bitcore_lib_1.Block(blockData);
            }
            catch (e) {
                if (e instanceof SidetreeError_1.default)
                    throw SidetreeError_1.default.createFromError(ErrorCode_1.default.BitcoinRawDataParserInvalidBlockData, e);
                throw e;
            }
            const blockHeight = BitcoinRawDataParser.getBlockHeightFromBlock(block, actualMagicBytes);
            const transactionModels = BitcoinClient_1.default.convertToBitcoinTransactionModels(block);
            processedBlocks.push({
                hash: block.hash,
                height: blockHeight,
                previousHash: Buffer.from(block.header.prevHash).reverse().toString('hex'),
                transactions: transactionModels
            });
            count++;
        }
        Logger_1.default.info(`Finished processing ${count} blocks from raw block file`);
        return processedBlocks;
    }
    static getBlockHeightFromBlock(block, magicBytes) {
        const coinbaseInputScript = block.transactions[0].inputs[0]._scriptBuffer;
        const heightBytes = coinbaseInputScript.readUInt8(0);
        let blockHeight;
        if (magicBytes.equals(BitcoinRawDataParser.magicBytes.regtest) &&
            heightBytes > 80 && heightBytes < 97) {
            blockHeight = heightBytes - 80;
        }
        else {
            blockHeight = coinbaseInputScript.readUIntLE(1, heightBytes);
        }
        return blockHeight;
    }
}
exports.default = BitcoinRawDataParser;
BitcoinRawDataParser.magicBytes = {
    testnet: Buffer.from('0b110907', 'hex'),
    mainnet: Buffer.from('f9beb4d9', 'hex'),
    regtest: Buffer.from('fabfb5da', 'hex'),
    skip: Buffer.from('00000000', 'hex')
};
BitcoinRawDataParser.magicBytesLength = 4;
BitcoinRawDataParser.sizeBytesLength = 4;
//# sourceMappingURL=BitcoinRawDataParser.js.map