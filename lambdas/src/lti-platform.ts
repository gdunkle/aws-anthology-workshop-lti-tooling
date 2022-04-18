import { GetItemOutput, PutItemOutput } from "aws-sdk/clients/dynamodb";

export interface LTIPlatformConfig {
    PK?: string,
    auth_token_url: string;
    auth_login_url: string;
    client_id: string;
    lti_deployment_id: string;
    iss: string;
    key_set_url: string;
}
export interface LTIPlatformStorage {
    PrimaryKey: string,
    TableName: string,
    DDBClient: AWS.DynamoDB.DocumentClient;
}

export class LTIPlatform implements LTIPlatformConfig {
    private _storage: LTIPlatformStorage;
    PK?: string | undefined; // composite key CONFIG#${client_id}#${iss}#${lti_deployment_id}
    auth_token_url: string;
    auth_login_url: string;
    client_id: string;
    lti_deployment_id: string;
    iss: string;
    key_set_url: string;
    
    constructor(settings: LTIPlatformStorage, config?: LTIPlatformConfig) {
        this._storage = settings;

        this.PK = config?.PK ;
        this.auth_token_url = config?.auth_token_url ?? "";
        this.auth_login_url = config?.auth_login_url ?? ""; 
        this.client_id = config?.client_id ?? "";
        this.lti_deployment_id = config?.lti_deployment_id ?? "";
        this.iss = config?.iss ?? "";
        this.key_set_url = config?.key_set_url ?? "";
    }

    /// Returns a LTIPlatformConfig instance, also hydrates the LTIPlatform instance with config
    async load(client_id: string, iss: string, lti_deployment_id?: string): Promise<LTIPlatformConfig | void> {
        const configParams = {
            TableName: this._storage.TableName,
            Key: {
                [this._storage.PrimaryKey]: `CONFIG#${client_id}#${iss}#${lti_deployment_id}`,
            }
        };

        try {
            const response: GetItemOutput = await this._storage.DDBClient.get(configParams).promise();
            if (response.Item) {
                let config: LTIPlatformConfig = JSON.parse(JSON.stringify(response.Item));

                this.PK = config?.PK;
                this.auth_token_url = config?.auth_token_url;
                this.auth_login_url = config?.auth_login_url; 
                this.client_id = config?.client_id;
                this.lti_deployment_id = config?.lti_deployment_id;
                this.iss = config?.iss;
                this.key_set_url = config?.key_set_url;

                return config;
            } else {
                console.log(`No PlatformConfig record found for CONFIG#${client_id}#${iss}#${lti_deployment_id}.`);
                return;
            }
        } catch (error) {
            console.log(`Error retrieving PlatformConfig for CONFIG#${client_id}#${iss}#${lti_deployment_id}. ${JSON.stringify(error)}`);
            throw new Error(`Error retrieving PlatformConfig for CONFIG#${client_id}#${iss}#${lti_deployment_id}. ${JSON.stringify(error)}`);
        }
    }

    async save(): Promise<LTIPlatformConfig | void> {
         //Set the primary key
        if(!this.auth_token_url || !this.auth_login_url || !this.client_id ||!this.lti_deployment_id || !this.iss || !this.key_set_url){
            throw new Error("InvalidParameterException");
        }

        this.PK = `CONFIG#${this.client_id}#${this.iss}#${this.lti_deployment_id}`;
        const configParams = {
            TableName: this._storage.TableName,
            Item: (this as LTIPlatformConfig)
        };

        try {
            const response: PutItemOutput = await this._storage.DDBClient.put(configParams).promise();
            return (this as LTIPlatformConfig);
        } catch (error) {
            throw new Error("Error persisting PlatformConfig. " + JSON.stringify(error));
        }
    }

}