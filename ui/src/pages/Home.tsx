import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react"

const Home: React.FC = () => {
	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>Hello, SEEK!</IonTitle>
				</IonToolbar>
			</IonHeader>
			<IonContent fullscreen>
				<div className="ion-padding">
					<p>Welcome to SEEK</p>
				</div>
			</IonContent>
		</IonPage>
	)
}

export default Home
