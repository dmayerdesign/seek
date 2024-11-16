import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react"
import { IonReactRouter } from "@ionic/react-router"
import { Redirect, Route } from "react-router-dom"
import Home from "./pages/Home"

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css"

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css"
import "@ionic/react/css/structure.css"
import "@ionic/react/css/typography.css"

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/display.css"
import "@ionic/react/css/flex-utils.css"
import "@ionic/react/css/float-elements.css"
import "@ionic/react/css/padding.css"
import "@ionic/react/css/text-alignment.css"
import "@ionic/react/css/text-transformation.css"

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

// import '@ionic/react/css/palettes/dark.always.css';
import "@ionic/react/css/palettes/dark.class.css"
// import "@ionic/react/css/palettes/dark.system.css"

/* Theme variables */
import "./theme/variables.css"

import { FirebaseApp, initializeApp } from "firebase/app"
import { EmailAuthProvider, getAuth } from "firebase/auth"
import * as firebaseui from "firebaseui"
import { useEffect, useMemo, useState } from "react"

setupIonicReact()

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

	const auth = useMemo(() => {
		if (firebaseApp) {
			return getAuth(firebaseApp)
		}
	}, [firebaseApp])
	const [authUI, setAuthUI] = useState<firebaseui.auth.AuthUI>()
	useEffect(() => {
		if (auth && !authUI) {
			setAuthUI(new firebaseui.auth.AuthUI(auth))
		}
	}, [auth])
	const user = useMemo(() => {
    // FIXME: Using a fake user for now
		// return auth?.currentUser
    return {
      displayName: "Test Teacher",
      email: "test-teacher@test.com",
      uid: "test-teacher",
    }
	}, [auth, auth?.currentUser])
	const uiConfig: firebaseui.auth.Config = {
		signInOptions: [
			{
				provider: EmailAuthProvider.PROVIDER_ID,
				signInMethod: EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD,
				forceSameDevice: true,
			},
		],
		tosUrl: import.meta.env.VITE_APP_URL + "/terms",
		privacyPolicyUrl: import.meta.env.VITE_APP_URL + "/terms",
	}

	useEffect(() => {
    console.log("import.meta.env.VITE_APP_URL", import.meta.env.VITE_APP_URL)
		if (auth && !user) {
			authUI?.start("#firebaseui-auth-container", uiConfig)
		}
	}, [user, authUI])

	return (
		<IonApp>
			{user ? (
				<IonReactRouter>
					<IonRouterOutlet>
						<Route exact path="/home">
							<Home />
						</Route>
						<Route exact path="/">
							<Redirect to="/home" />
						</Route>
					</IonRouterOutlet>
				</IonReactRouter>
			) : (
				<>
					<div id="firebaseui-auth-container"></div>
				</>
			)}
		</IonApp>
	)
}

export default App
