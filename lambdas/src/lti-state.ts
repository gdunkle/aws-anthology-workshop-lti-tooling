import { v4 as uuidv4 } from 'uuid';
import { GetItemOutput, PutItemOutput } from "aws-sdk/clients/dynamodb";

export interface LTIStateStorage {
    PrimaryKey: string,
    TableName: string,
    TTL?: number,
    DDBClient: AWS.DynamoDB.DocumentClient;
}

export class LTIState {
    id: string;
    private _storage: LTIStateStorage;

    constructor(settings: LTIStateStorage, state?: string) {
        this._storage = settings;
        this.id = state ?? uuidv4();
    };

    async validate(): Promise<boolean> {
        const stateParams = {
            TableName: this._storage.TableName,
            Key: {
                [this._storage.PrimaryKey]: `STATE#${this.id}`,
            }
        };

        try {
            const response: GetItemOutput = await this._storage.DDBClient.get(stateParams).promise();
            if (response.Item) {
                return true;
            } else {
                console.log(`No State record found for STATE${this.id}.`);
                return false;
            }
        } catch (error) {
            console.log(`Error retrieving State for STATE${this.id}. ${JSON.stringify(error)}`);
            throw new Error(`Error retrieving State for STATE#${this.id}. ${JSON.stringify(error)}`);
        }
    };

    async save(): Promise<string | void> {
        let STATE_ITEM_TTL = (Math.floor(+new Date() / 1000) + +(this._storage.TTL as number));
        const stateParams = {
            TableName: this._storage.TableName,
            Item: {
                [this._storage.PrimaryKey]: `STATE#${this.id}`,
                ttl: STATE_ITEM_TTL  //this will auto expire the state in DDB
            }
        };

        try {
            const response: PutItemOutput = await this._storage.DDBClient.put(stateParams).promise();
            return this.id;
        } catch (error) {
            throw new Error("Error persisting state. " + JSON.stringify(error));
        }
    };
};
