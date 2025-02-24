import { FirebaseApp, initializeApp } from "firebase/app"
import { useCallback, useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { AppCtx } from "./data-model"
import { getAuth, User } from "firebase/auth"
import { getApiUrl } from "./utils"
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage"

const App: React.FC = () => {
	const [firebaseApp, setFirebaseApp] = useState<FirebaseApp>()
	useEffect(() => {
		setFirebaseApp(
			initializeApp({
				apiKey: "AIzaSyDLeimvjoisoXXAqbQFYsqQqUC5F1gIqXs",
				authDomain: "seek-poe-dev.firebaseapp.com",
				projectId: "seek-poe-dev",
				storageBucket: "seek-poe-dev.firebasestorage.app",
				messagingSenderId: "237882236741",
				appId: "1:237882236741:web:62ad6c92f456dab682e82c",
			}),
		)
	}, [])

	const [user, setUser] = useState<User | null | undefined>(undefined)
	useEffect(() => {
		if (firebaseApp) {
			getAuth(firebaseApp).onAuthStateChanged((user) => {
				setUser(user)
			})
		}
	}, [firebaseApp])
	const callCloudFunction = useCallback(
		async function <ReturnType = void>(
			endpoint: string,
			data?: any,
			authorization?: string,
		): Promise<ReturnType | null> {
			try {
				const headers: HeadersInit = {
					"Content-Type": "application/json",
					"Authorization": authorization ?? `Bearer ${await user?.getIdToken()}`,
				}
				const response = await fetch(getApiUrl(endpoint), {
					method: "POST",
					headers,
					body: JSON.stringify({ data }),
				})
				const json = await response.json()
				const { error, result } = json
				if (error) {
					throw new Error(error)
				}
				return result
			} catch (error) {
				console.error(error)
				throw error
			}
		},
		[user],
	)
	const uploadFile = useCallback((file: File, destFolder: string): Promise<string> => {
		return new Promise<string>((resolve, reject) => {
			const storage = getStorage(firebaseApp)
			const storageRef = ref(storage, (destFolder + "/" + file.name).replace("//", "/"))
			const uploadTask = uploadBytesResumable(storageRef, file)
			uploadTask.on(
				"state_changed",
				(snapshot) => {
					// Observe state change events such as progress, pause, and resume
					// Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
					const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
					console.log("Upload is " + progress + "% done")
					switch (snapshot.state) {
						case "paused":
							console.log("Upload is paused")
							break
						case "running":
							console.log("Upload is running")
							break
					}
				},
				(error) => {
					console.error("Upload failed", error)
					reject(error)
				},
				() => {
					getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject)
				},
			)
		})
	}, [])

	return (
		firebaseApp && (
			<AppCtx.Provider value={{ firebaseApp, user, callCloudFunction, uploadFile }}>
				<div className="app">
					<Outlet />
				</div>
			</AppCtx.Provider>
		)
	)
}

export default App
