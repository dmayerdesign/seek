import { FirebaseApp, initializeApp } from "firebase/app"
import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { AppCtx } from "./data-model"
import { getAuth, User } from "firebase/auth"

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

	const [user, setUser] = useState<User|null|undefined>(undefined)
	useEffect(() => {
		if (firebaseApp) {
			getAuth(firebaseApp).onAuthStateChanged((user) => {
				setUser(user)
			})
		}
	}, [firebaseApp])

	return (
		firebaseApp && (
			<AppCtx.Provider value={{ firebaseApp, user }}>
				<div className="app">
					<Outlet />
				</div>
			</AppCtx.Provider>
		)
	)
}

export default App
