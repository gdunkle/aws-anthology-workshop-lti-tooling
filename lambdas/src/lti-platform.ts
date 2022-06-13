import { GetItemOutput } from "aws-sdk/clients/dynamodb";

export interface LTIPlatformConfig {
    PK?: string, // composite key CONFIG#${client_id}#${iss}#${lti_deployment_id}
    auth_token_url: string;
    auth_login_url: string;
    client_id: string;
    lti_deployment_id?: string;
    iss: string;
    key_set_url: string;
}
export interface LTIPlatformStorage {
    PartitionKey: string,
    TableName: string,
    DDBClient: AWS.DynamoDB.DocumentClient;
}

export class LTIPlatform {
    private _storage: LTIPlatformStorage;
    private readonly _config: LTIPlatformConfig;
    
    constructor(settings: LTIPlatformStorage, config?: LTIPlatformConfig) {
        this._storage = settings;
        this._config = {
            PK: "",
            auth_token_url: config?.auth_token_url ?? "",
            auth_login_url: config?.auth_login_url ?? "", 
            client_id: config?.client_id ?? "",
            lti_deployment_id: config?.lti_deployment_id ?? "",
            iss: config?.iss ?? "",
            key_set_url: config?.key_set_url ?? "",
        }
    }

    get PK(): string {
        return this._config.PK ?? "";
    }
    get auth_token_url(): string {
        return this._config.auth_token_url;
    }
    get auth_login_url(): string {
        return this._config.auth_login_url;
    }
    get client_id(): string {
        return this._config.client_id;
    }
    get lti_deployment_id(): string {
        return this._config.lti_deployment_id ?? "";
    }
    get iss():string {
        return this._config.iss;
    }
    get key_set_url(): string {
        return this._config.key_set_url;
    }

    /**
    * Hydrates the instance from values provided.
    * @client_id The Tool’s Client ID for this issuer.
    * @iss The issuer identifier identifying the learning platform.
    * @lti_deployment_id The specific deployment identifier.
    * @returns LTIPlatform instance
    */
    async load(client_id: string, iss: string, lti_deployment_id?: string): Promise<LTIPlatform | void> {
        const configParams = {
            TableName: this._storage.TableName,
            Key: {
                [this._storage.PartitionKey]: `CONFIG#${client_id}#${iss}#${lti_deployment_id}`,
            }
        };

        try {
            const response: GetItemOutput = await this._storage.DDBClient.get(configParams).promise();
            if (response.Item) {
                let config: LTIPlatformConfig = JSON.parse(JSON.stringify(response.Item));

                this._config.PK = config?.PK;
                this._config.auth_token_url = config?.auth_token_url;
                this._config.auth_login_url = config?.auth_login_url; 
                this._config.client_id = config?.client_id;
                this._config.lti_deployment_id = config?.lti_deployment_id;
                this._config.iss = config?.iss;
                this._config.key_set_url = config?.key_set_url;

                return this;
            } else {
                console.log(`No PlatformConfig record found for CONFIG#${client_id}#${iss}#${lti_deployment_id}.`);
                return;
            }
        } catch (error) {
            console.log(`Error retrieving PlatformConfig for CONFIG#${client_id}#${iss}#${lti_deployment_id}. ${JSON.stringify(error)}`);
            throw new Error(`Error retrieving PlatformConfig for CONFIG#${client_id}#${iss}#${lti_deployment_id}. ${JSON.stringify(error)}`);
        }
    }

    /**
    * Persist the instance to storage.
    * @returns LTIPlatform instance
    */
    async save(): Promise<LTIPlatform | void> {
        if(!this._config?.auth_token_url || !this._config?.auth_login_url || !this._config?.client_id || !this._config?.iss || !this._config?.key_set_url){
            throw new Error("InvalidParameterException");
        }

        this._config.PK = `CONFIG#${this._config.client_id}#${this._config.iss}#${this._config.lti_deployment_id}`;
        const configParams = {
            TableName: this._storage.TableName,
            Item: (this._config as LTIPlatformConfig)
        };

        try {
            await this._storage.DDBClient.put(configParams).promise();
            return this;
        } catch (error) {
            console.log(`Error persisting PlatformConfig for ${this._config.PK}. ${JSON.stringify(error)}`);
            throw new Error("Error persisting PlatformConfig. " + JSON.stringify(error));
        }
    }

}