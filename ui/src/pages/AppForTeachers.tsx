import { getAuth } from "firebase/auth"
import { FC, useContext, useLayoutEffect } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { AppCtx } from "../data-model"

const AppForTeachers: FC = () => {
	const { user, firebaseApp } = useContext(AppCtx)!
	const location = useLocation()
	const navigate = useNavigate()

	// Scroll to the top whenever the route changes
	useLayoutEffect(() => {
		setTimeout(() => window.scrollTo(0, 0), 500)
	}, [location.pathname])

	return (
		<div className="light" style={{ width: "100%" }}>
			<header>
				<div className="page-content">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<button
							onClick={() => {
								navigate(`/for-teachers`)
							}}
							style={{
								background: "none",
								border: "none",
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
						<h1 style={{ fontSize: "1.5rem", textAlign: "center" }}>
							Exploration and Categorization&nbsp;&nbsp;•&nbsp;&nbsp;Dr. Jazlin Ebenezer
						</h1>
						{user ? (
							<button
								onClick={async () => {
									await getAuth(firebaseApp).signOut()
									window.location.href = "/"
								}}
								style={{
									fontSize: "1.2rem",
								}}
							>
								Sign out
							</button>
						) : (
							<div style={{ width: "50px" }}></div>
						)}
					</div>
				</div>
			</header>
			<div className="seek-page">
				<div style={{ maxWidth: "900px", margin: "auto" }}>
					<Outlet />
				</div>
			</div>
		</div>
	)
}

export default AppForTeachers
