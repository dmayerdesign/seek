import { FirebaseApp, initializeApp } from "firebase/app"
import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"

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

	// const auth = useMemo(() => {
	// 	if (firebaseApp) {
	// 		return getAuth(firebaseApp)
	// 	}
	// }, [firebaseApp])
	// const [authUI, setAuthUI] = useState<firebaseui.auth.AuthUI>()
	// useEffect(() => {
	// 	if (auth && !authUI) {
	// 		setAuthUI(new firebaseui.auth.AuthUI(auth))
	// 	}
	// }, [auth])
	// const user = useMemo(() => {
	// 	// FIXME: Using a fake user for now
	// 	// return auth?.currentUser
	// 	return {
	// 	displayName: "Test Teacher",
	// 	email: "test-teacher@test.com",
	// 	uid: "test-teacher",
	// 	}
	// }, [auth, auth?.currentUser])
	// const uiConfig: firebaseui.auth.Config = {
	// 	signInOptions: [
	// 		{
	// 			provider: EmailAuthProvider.PROVIDER_ID,
	// 			signInMethod: EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD,
	// 			forceSameDevice: true,
	// 		},
	// 	],
	// 	tosUrl: import.meta.env.VITE_APP_URL + "/terms",
	// 	privacyPolicyUrl: import.meta.env.VITE_APP_URL + "/terms",
	// }
	// useEffect(() => {
	// 	console.log("import.meta.env.VITE_APP_URL", import.meta.env.VITE_APP_URL)
	// 	if (auth && !user) {
	// 		authUI?.start("#firebaseui-auth-container", uiConfig)
	// 	}
	// }, [user, authUI])

	return (
		firebaseApp && (
			<div className="app">
				<Outlet />
			</div>
		)
	)
}

export default App
