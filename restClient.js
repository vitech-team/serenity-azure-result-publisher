const axios = require('axios');

/**
 * Rest client
 */
class RestClient {

    constructor() {
        this.headers = {}

    }


    /**
     * Validate config values
     *
     * @param options
     * @param name
     * @private
     */
    _validate(options, name) {
        if (options == null) {
            throw new Error("Missing options");
        }
        if (options[name] == null) {
            throw new Error(`Missing ${name} value. Please update option in environment variables`);
        }
    }

    /**
     * Form the url for api
     *
     * @param path
     * @returns {string}
     * @private
     */
    _url(path) {
        return `${this.base}${path}`;
    }

    /**
     * Post request formation
     *
     * @param api
     * @param body
     * @param error
     * @returns {*}
     * @private
     */
    async _post(api, body, error = undefined, headers = this.headers) {
        return await this._request("POST", api, body, error, headers);
    }

    /**
     * Post request formation
     *
     * @param api
     * @param body
     * @param error
     * @returns {*}
     * @private
     */
    async _put(api, body, error = undefined) {
        return await this._request("PUT", api, body, error);
    }

    /**
     * get request formation
     *
     * @param api
     * @param error
     * @returns {*}
     * @private
     */
    async _get(api, error = undefined) {
        return await this._request("GET", api);
    }

    /**
     * Patch request formation
     *
     * @param api
     * @param error
     * @returns {*}
     * @private
     */
    async _patch(api, body, error = undefined, headers = this.headers) {
        return await this._request("PATCH", api, body, error, headers);
    }

    /**
     * Api request sending to the corresponding url
     *
     * @param method
     * @param api
     * @param body
     * @param error
     * @returns {*}
     * @private
     */
    async _request(method, api, body = undefined, error = undefined, headers = this.headers) {
        let count = 0;
        let maxTries = process.env.MAX_RETRY || 3;
        while (true) {
            try {
                let result = await axios({
                    method: method,
                    url: this._url(api),
                    headers: headers,
                    data: body
                }).catch((error) => {console.error(error)});
                await console.log(`Request: ${method} ${this._url(api)} ${result.status}`);
                return result.data;
            } catch (error) {
                if (++count === maxTries) throw {
                    "method": method,
                    "api": this._url(api),
                    "body": body,
                    "error": error,
//                     "env_variables": process.env
                };
            }
        }
    }


}

module.exports = RestClient;
