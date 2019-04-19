import dotenv from "dotenv";

export function getConfig(): { [k: string]: any } {
    const result = dotenv.config();
    return result.error !== void 0 ? result.parsed as { [k: string]: any } : {};
}

export default getConfig();
