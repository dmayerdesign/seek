import { FirebaseApp, initializeApp } from "firebase/app"
import { useCallback, useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { AppCtx } from "./data-model"
import { getAuth, User } from "firebase/auth"
import { getApiUrl } from "./utils"

const App: React.FC = () => {
	const [firebaseApp, setFirebaseApp] = useState<FirebaseApp>()
	useEffect(() => {
		setFirebaseApp(
			initializeApp({
				apiKey: "AIzaSyDLeimvjoisoXXAqbQFYsqQqUC5F1gIqXs",
				authDomain: "seek-poe-dev.firebaseapp.com",
				projectId: "seek-poe-dev",
				storageBucket: "seek-poe-dev.appspot.com",
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
	const callCloudFunction = useCallback(async function<ReturnType = void>(
		endpoint: string,
		data?: any,
	): Promise<ReturnType | null> {
		try {
			const headers: HeadersInit = {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${await user?.getIdToken()}`,
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
	}, [user])

	return (
		firebaseApp && (
			<AppCtx.Provider value={{ firebaseApp, user, callCloudFunction }}>
				<div className="app">
					<Outlet />
				</div>
			</AppCtx.Provider>
		)
	)
}

export default App
