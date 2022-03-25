"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const AWS = __importStar(require("aws-sdk"));
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const db = new AWS.DynamoDB.DocumentClient();
const handler = async () => {
    return { statusCode: 200, body: JSON.stringify("Return from Lambda") };
    //   return {
    //     statusCode: process.env.HTTP_RESPONSE,
    //     headers: {
    //         "Location": process.env.NEW_DOMAIN + requestUri
    //     },
    //     body: null
    //   }
    //   const requestedItemId = event.pathParameters.id;
    //   if (!requestedItemId) {
    //     return { statusCode: 400, body: `Error: You are missing the path parameter id` };
    //   }
    //   const params = {
    //     TableName: TABLE_NAME,
    //     Key: {
    //       [PRIMARY_KEY]: requestedItemId
    //     }
    //   };
    //   try {
    //     const response = await db.get(params).promise();
    //     if (response.Item) {
    //       return { statusCode: 200, body: JSON.stringify(response.Item) };
    //     } else {
    //       return { statusCode: 404 };
    //     }
    //   } catch (dbError) {
    //     return { statusCode: 500, body: JSON.stringify(dbError) };
    //   }
};
exports.handler = handler;
