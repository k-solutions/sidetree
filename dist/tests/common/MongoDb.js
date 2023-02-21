"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
class MongoDb {
    static createInmemoryDb(config) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!MongoDb.initialized) {
                const prefix = 'mongodb://localhost:';
                if (config.mongoDbConnectionString.startsWith(prefix)) {
                }
                MongoDb.initialized = true;
            }
        });
    }
}
exports.default = MongoDb;
MongoDb.initialized = true;
//# sourceMappingURL=MongoDb.js.map