const API_URL_TEMPLATE = import.meta.env.VITE_API_URL_TEMPLATE
const env = import.meta.env.VITE_APP_ENV
export function getApiUrl(endpointName: string): string {
	let funcName = endpointName
	if (env !== "local-dev") {
		funcName = endpointName.toLowerCase()
	}
	return API_URL_TEMPLATE?.replace("{function_name}", funcName) ?? ""
}
