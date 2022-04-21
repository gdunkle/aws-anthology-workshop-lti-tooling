
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

        if (parts.length == 3) throw new Error("InvalidParameterException");

        this._header = JSON.parse(Buffer.from(parts?.[0], 'base64').toString());
        this._payload = JSON.parse(Buffer.from(parts?.[1], 'base64').toString());
        this._signature = JSON.parse(Buffer.from(parts?.[2], 'base64').toString());
        console.log(this._header);
        console.log(this._payload);
        console.log(this._signature);
        console.log("got it");
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
        return this._payload?.deployment_id ?? "";
    }
    get nonce(): string {
        return this._payload?.nonce ?? "";
    }
}