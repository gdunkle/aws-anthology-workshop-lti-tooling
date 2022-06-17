

interface jwtPayload {
    iss: string, //issuer
    aud: string, // client_id
    deployment_id: string, 
    nonce: string;
}

export class LTIJwtPayload {
    private _token: string;
    private _header;
    private _payload;
    private _signature;
    private _verified: boolean = false;

    constructor(token: string) {
        this._token = token;
        let parts: string[] = token.split('.');

        if (parts.length != 3) {
            console.error(`Invalid token: ${this._token} - Length: ${parts.length}`)
            throw new Error("InvalidParameterException");
        }
        const header=Buffer.from(parts[0], 'base64').toString()
        const payload=Buffer.from(parts[1], 'base64').toString()
        const signature=Buffer.from(parts[2], 'base64').toString()
        console.info(`header=${header}`)
        console.info(`payload=${payload}`)
        console.info(`signature=${signature}`)
        this._header = JSON.parse(header);
        this._payload = JSON.parse(payload);
        this._signature = signature;
    }

    get token(): string {
        return this._token ?? "";
    }
    get iss(): string {
        return this._payload?.iss ?? "";
    }
    get aud(): string {
        return this._payload?.aud ?? "";
    }
    get deployment_id(): string {
        return this._payload?.["https://purl.imsglobal.org/spec/lti/claim/deployment_id"] ?? "";
    }
    get nonce(): string {
        return this._payload?.nonce ?? "";
    }
}