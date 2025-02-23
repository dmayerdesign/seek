const API_URL_TEMPLATE = import.meta.env.VITE_API_URL_TEMPLATE
const env = import.meta.env.VITE_APP_ENV
export function getApiUrl(endpointName: string): string {
	let funcName = endpointName
	if (env !== "local-dev") {
		funcName = endpointName.toLowerCase()
	}
	return API_URL_TEMPLATE?.replace("{function_name}", funcName) ?? ""
}

// return a promise that resolves with a File instance
export function urlToFile(url: string, filename: string, mimeType?: string): Promise<File> {
	if (url.startsWith("data:")) {
		var arr = url.split(","),
			mime = arr[0].match(/:(.*?);/)?.[1],
			bstr = atob(arr[arr.length - 1]),
			n = bstr.length,
			u8arr = new Uint8Array(n)
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n)
		}
		var file = new File([u8arr], filename, { type: mime || mimeType })
		return Promise.resolve(file)
	}
	return fetch(url)
		.then((res) => res.arrayBuffer())
		.then((buf) => new File([buf], filename, { type: mimeType }))
}
