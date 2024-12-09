import { getAuth } from "firebase/auth"
import { FC, useContext } from "react"
import { Outlet } from "react-router-dom"
import { AppCtx } from "../data-model"

const AppForTeachers: FC = () => {
	const { user, firebaseApp } = useContext(AppCtx)!

	return (
		<div className="light">
			<header>
				<div className="page-content">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<img
							src="/seek-logo-dark.png"
							className="seek-logo"
							style={{ height: "18px", width: "auto", textShadow: "none" }}
							alt="SEEK"
						/>
						{user && (
							<button
								onClick={async () => {
									await getAuth(firebaseApp).signOut()
								}}
								style={{
									fontSize: "1.2rem",
								}}
							>
								Sign out
							</button>
						)}
					</div>
				</div>
			</header>
			<div className="seek-page">
				<Outlet />
			</div>
		</div>
	)
}

export default AppForTeachers
