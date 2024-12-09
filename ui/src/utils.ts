const VITE_API_URL_TEMPLATE = import.meta.env.VITE_API_URL_TEMPLATE
export function getApiUrl(endpointName: string): string {
    return VITE_API_URL_TEMPLATE?.replace('{function_name}', endpointName.toLowerCase()) ?? "";
}
