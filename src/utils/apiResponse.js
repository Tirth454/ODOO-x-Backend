class ApiResponse {
    constructor(statusCode, data, message = "Success", messages = []) {
        if (!Number.isInteger(statusCode)) {
            throw new Error("Status code must be an integer");
        }

        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode >= 200 && statusCode < 400;
        this.messages = Array.isArray(messages) ? messages : [messages];
        this.timestamp = new Date().toISOString();
    }
}

export default ApiResponse;
