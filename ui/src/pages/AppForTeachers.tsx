import { FC } from "react"
import { Outlet } from "react-router-dom"

const AppForTeachers: FC = () => {
	return <div className="light">
		<header>
			<div className="page-content">
				<img
					src="/seek-logo-dark.png"
					className="seek-logo"
					style={{ height: "18px", width: "auto" }}
					alt="SEEK"
				/>
			</div>
		</header>
		<div className="seek-page">
			<Outlet />
		</div>
	</div>
}

export default AppForTeachers
