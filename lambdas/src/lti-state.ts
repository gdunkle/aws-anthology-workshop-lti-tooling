import { v4 as uuidv4 } from 'uuid';
import { GetItemOutput } from "aws-sdk/clients/dynamodb";

interface LTIStateRecord {
    PK?: string, // composite key STATE#${id}
    id: string;
    nonce: string;
    nonce_count: number;
    ttl: number;
}
export interface LTIStateStorage {
    PartitionKey: string,
    TableName: string,
    TTL?: number,
    DDBClient: AWS.DynamoDB.DocumentClient;
}

export class LTIState {
    private _storage: LTIStateStorage;
    private readonly _record: LTIStateRecord;

    constructor(settings: LTIStateStorage) {
        this._storage = settings;
        this._record = {
            PK: "",
            id: uuidv4(),
            nonce: uuidv4(),
            nonce_count: 0,
            ttl: 0,
        };
    };

    get id(): string {
        return this._record.id;
    }
    
    get nonce(): string {
        return this._record.nonce;
    }
    /**
    * Validates the provided State exists, has the same nonce, and the nonce has only been used once *Trust On First Use (TOFU)*.
    * @nonce nonce value from the id_token
    * @returns boolean value indicating if the state has been validated.
    */
    async validate(nonce: string): Promise<boolean> {
        if (!this._record.id || !nonce) {
            throw new Error("InvalidParameterException");
        }

        const stateParams = {
            TableName: this._storage.TableName,
            Key: {
                [this._storage.PartitionKey]: `STATE#${this.id}`,
            },
            ConditionExpression: `(nonce = ${nonce}) AND nonce_count = 0`,
        };

        try {
            const response: GetItemOutput = await this._storage.DDBClient.get(stateParams).promise();
            
            if (response.Item) {
                //Set the nonce_count increment by 1 to prevent replay attacks
                const stateUpdateParams = {
                    TableName: this._storage.TableName,
                    Key: {
                        [this._storage.PartitionKey]: `STATE#${this.id}`,
                    },
                    UpdateExpression: "SET nonce_count = nonce_count + 1",
                    ConditionExpression: `(nonce = ${nonce}) AND nonce_count = 0`,
                };
                await this._storage.DDBClient.update(stateUpdateParams).promise();
                
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

    /**
    * Hydrates the instance from state provided without validation of nonce. See validate() for more information.
    * @id state value from the authentication request
    * @returns LTIState instance
    */
    async load(id: string): Promise<LTIState | void> {
        const configParams = {
            TableName: this._storage.TableName,
            Key: {
                [this._storage.PartitionKey]: `STATE#${id}`,
            }
        };

        try {
            const response: GetItemOutput = await this._storage.DDBClient.get(configParams).promise();
            if (response.Item) {
                let state: LTIStateRecord = JSON.parse(JSON.stringify(response.Item));

                this._record.PK = state?.PK;
                this._record.id = state?.id;
                this._record.nonce = state?.nonce;
                this._record.nonce_count = state?.nonce_count;
                this._record.ttl = state?.ttl;

                return this;
            } else {
                console.log(`No State record found for STATE#${id}.`);
                return;
            }
        } catch (error) {
            console.log(`Error retrieving State record for STATE#${id}. ${JSON.stringify(error)}`);
            throw new Error(`Error retrieving State record for STATE#${id}. ${JSON.stringify(error)}`);
        }
    }

    /**
    * Persist the instance to storage. Will set the TTL.
    * @returns LTIState instance
    */
    async save(): Promise<LTIState | void> {
        this._record.PK = `STATE#${this._record.id}`;
        this._record.ttl = (Math.floor(+new Date() / 1000) + +(this._storage.TTL as number)); //this will auto expire the state in DDB

        const stateParams = {
            TableName: this._storage.TableName,
            Item: (this._record as LTIStateRecord)
        };
        
        try {
            await this._storage.DDBClient.put(stateParams).promise();
            return this;
        } catch (error) {
            console.log(`Error persisting State record for ${this._record.PK}. ${JSON.stringify(error)}`);
            throw new Error("Error persisting State. " + JSON.stringify(error));
        }
    };
};
