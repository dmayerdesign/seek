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
						<button
							onClick={async () => {
								window.location.href = "https://seek-poe-dev.web.app/for-teachers";
							}}
							style={{
								fontSize: "1.2rem",
								background: "none",
								border: "none",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								padding: 0,
							}}
						>
							<img
								src="/seek-logo-dark.png"
								alt="SEEK"
								style={{ height: "18px", width: "auto", textShadow: "none" }}
							/>
						</button>
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
